document.addEventListener('DOMContentLoaded', async () => {
    initializeDropdown();

    dropdown.addEventListener('change', function() {
        updateVidSource(this.value);
        localStorage.setItem('vidSourceType', this.value);
    });
	
    mouseDrag();
	displayPage();

});

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function displayPage() {
	const id = getQueryParam('id');
    const isTV = localStorage.getItem('detailIsTV') === 'true';
	const [favorites, watchlist, watchingState, data, credits, similar, videoData] = await Promise.all([
		getAllItems('favorites'),
		getAllItems('watchlist'),
		getAllItems('currentWatchingState'),
		fetchGeneral(id, isTV ? 'tv' : 'movie'),
		fetchGeneral(id, isTV ? 'tv' : 'movie', 'credits'),
		fetchGeneral(id, isTV ? 'tv' : 'movie', 'recommendations'),
		fetchGeneral(id, isTV ? 'tv' : 'movie', 'videos')
	]);
	const detailContent = document.getElementById('detailContent');
	const dropdown = document.getElementById('dropdown');
	
	const title = isTV ? data.name : data.title;
	const releaseYear = data.release_date ? data.release_date.split('-')[0] : data.first_air_date ? data.first_air_date.split('-')[0] : 'Unknown Year';
	const genres = data.genres ? data.genres.map(genre => genre.name) : ['Unknown'];
	const rating = data.vote_average !== undefined ? data.vote_average.toFixed(1) : 'N/A';
	const posterPath = data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : 'https://via.placeholder.com/450x300';
	const tagLine = data.tagline ? data.tagline : '';
	const overview = data.overview ? data.overview : '';
	const seasons = data.seasons ? data.seasons.filter(season => season.season_number > 0 && season.season_number <= data.last_episode_to_air.season_number) : [];
	const itemType = isTV ? "tv" : "movie";
	const isFavorite = checkItemInList(favorites, data.id, itemType);
	const isWatchlist = checkItemInList(watchlist, data.id, itemType);
	const isCurrent = checkItemInList(watchingState, data.id, itemType);
	const duration = data.runtime ? '<strong>Duration: </strong>' + data.runtime + ' min' : '';

		detailContent.innerHTML = `
			<div class="poster-trailer-container">
				<img src="${posterPath}" alt="${title} Poster" class="movie-poster-detail">
				<iframe class="movie-trailer" src="" allow="autoplay; encrypted-media" allowfullscreen style="display:none;"></iframe>
				<iframe class="movie-video" src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>
				<button id="cinemaModeBtn" class="cinema-mode-btn">&#x2921;</button>
				<button id="cinemaExitBtn" class="cinema-exit-btn">X</button>
			</div>
			<h2>${title}</h2>
			<a id="watchBtnCenter" href="#" target="_blank" class="watch-btn-center">Watch!</a>
			<div class="add-to">
				<span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${id}, '${isTV ? 'tv' : 'movie'}')">
					<i class="material-icons">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
				</span>
				<span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${id}, '${isTV ? 'tv' : 'movie'}')">
					<i class="material-icons">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
				</span>
			</div>
			<div class="movie-details">
				<p><strong>${releaseYear}</strong></p>
				<p>${duration}</p>
				<p class="movie-genre"><strong>Genre:</strong> ${genres.join(', ')}</p>
				<p class="movie-rating"><strong>Rating:</strong> ${rating}</p>
				<h3 class="movie-tagline">${tagLine}</h3>
				<p class="movie-overview">${overview}</p>
				${isTV ? `
				<hr>
				<select id="seasonSelect">
					${seasons.map((season, index) => `<option value="${season.season_number}">Season ${season.season_number}</option>`).join('')}
				</select>
				<button id="resetProgressBtn">Reset Progress</button>
				<div id="episodeList" class="episode-list"></div>
					` : ''}
				</div>
				<div id="castCrew" class="cast-crew-section">
					<h3>Cast & Crew</h3>
					<div id="castList" class="cast-list"></div>
					<div id="crewList" class="crew-list"></div>
				</div>
				<div id="similarSection" class="similar-section">
					<h3>Similar ${isTV ? 'TV Shows' : 'Movies'}</h3>
					<div id="similarResults" class="similar-results"></div>
				</div>
				<div class="cinema-overlay"></div>
		`;

		document.getElementById('watchBtnCenter').addEventListener('click', async (event) => {
			event.preventDefault();
			if (isCurrent) {
			const currentEpisodeData = await getCurrentEpisode(data.id);
			const currentSeason = currentEpisodeData.seasonNumber;
			const currentEpisode = currentEpisodeData.episodeNumber;
			const url = currentEpisode && currentEpisode > 0 ? buildUrl(isTV, data, currentSeason, currentEpisode) : buildUrl(isTV, data);
			await updateCurrentEpisode(data.id, parseInt(currentSeason), parseInt(currentEpisode));
			displayMovie(url);
			}
			else{
			const url = buildUrl(isTV, data);
			displayMovie(url);
			}
		});
		
		document.addEventListener('DOMContentLoaded', (event) => {
        const movieVideos = document.querySelectorAll('.movie-video');
        const preventPopup = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        movieVideos.forEach(video => {
            video.addEventListener('click', preventPopup);
            video.addEventListener('contextmenu', preventPopup);
        });
    });

		document.getElementById('cinemaModeBtn').addEventListener('click', () => {
			toggleCinemaMode();
		});

		document.getElementById('cinemaExitBtn').addEventListener('click', () => {
			closeMovie();
		});

		if (data.belongs_to_collection) {
			fetchCollectionMovies(data.belongs_to_collection.id);
		}

		// Fetch Cast & Crew Information
		const castList = document.getElementById('castList');
		const crewList = document.getElementById('crewList');

		const placeholderImage = 'https://via.placeholder.com/300x450';

		if (credits.cast && credits.cast.length > 0) {
			castList.innerHTML = credits.cast.slice(0, 10).map(person => `
				<div class="person-card" onclick="goToPersonPage(${person.id}, 'cast')">
					<img src="${person.profile_path ? `https://image.tmdb.org/t/p/w200${person.profile_path}` : placeholderImage}" alt="${person.name}">
					<p><strong>${person.name}</strong><br>${person.character}</p>
				</div>
			`).join('');
		} else {
			castList.innerHTML = '<p>No cast information available.</p>';
		}

		if (credits.crew && credits.crew.length > 0) {
			crewList.innerHTML = credits.crew.slice(0, 10).map(person => `
				<div class="person-card" onclick="goToPersonPage(${person.id}, 'crew')">
					<img src="${person.profile_path ? `https://image.tmdb.org/t/p/w200${person.profile_path}` : placeholderImage}" alt="${person.name}">
					<p><strong>${person.name}</strong><br>${person.job}</p>
				</div>
			`).join('');
		} else {
			crewList.innerHTML = '<p>No crew information available.</p>';
		}

		// Fetch Similar Movies/TV Shows
		if (similar) {
			displaySimilarMovies(similar.results, 'similarResults', isTV);
		}
		const posterElement = detailContent.querySelector('.movie-poster-detail');
		const trailerElement = detailContent.querySelector('.movie-trailer');

		let enterTimeout;
		// Fetch trailer URL once
		const trailer = videoData.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
		const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;

		// Set up event listeners
		posterElement.addEventListener('mouseenter', () => {
			enterTimeout = setTimeout(() => {
				if (trailerUrl) {
					trailerElement.style.display = 'block';
					let fullTrailerUrl = `${trailerUrl}?autoplay=1&controls=1&modestbranding=1&showinfo=0`;
					const soundPreference = localStorage.getItem('soundPreference');
					fullTrailerUrl += soundPreference === 'off' ? '&mute=1' : '&mute=0';
					trailerElement.src = fullTrailerUrl;
					posterElement.style.display = 'none';
				}
			}, 1000); // 1 second delay
		});

		posterElement.addEventListener('mouseleave', () => {
			clearTimeout(enterTimeout);
		});

		trailerElement.addEventListener('mouseleave', () => {
			clearTimeout(enterTimeout); // Clear the timeout if mouse leaves before the delay
			trailerElement.style.display = 'none';
			trailerElement.src = ''; // Clear the src to stop the video
			posterElement.style.display = 'block';
		});

	if (isTV) {
		const currentEpisodeData = await getCurrentEpisode(data.id);
		const currentSeason = currentEpisodeData.seasonNumber;
		const seasonSelect = document.getElementById('seasonSelect');
		if (seasonSelect) {
			seasonSelect.value = currentSeason ? currentSeason : 1;

			seasonSelect.addEventListener('change', (e) => {
				fetchEpisodes(data.id, e.target.value);
			});
		}

		document.getElementById('resetProgressBtn').addEventListener('click', () => {
			resetProgress(data.id);
		});

		if (seasons.length > 0) {
			fetchEpisodes(data.id, currentSeason);  // Fetch episodes for the current season
		}
	}
}

function displayMovie(url) {
    const videoElement = document.querySelector('.movie-video');
    const posterElement = document.querySelector('.movie-poster-detail');
    const trailerElement = document.querySelector('.movie-trailer');
    const cinemaModeBtn = document.querySelector('.cinema-mode-btn');
    const cinemaExitBtn = document.querySelector('.cinema-exit-btn');
	if (videoElement) {
        videoElement.style.display = 'block';
        videoElement.src = url; // Use URL directly from buildUrl
        posterElement.style.display = 'none';
        trailerElement.style.display = 'none';
		cinemaModeBtn.style.display = 'block';
		cinemaExitBtn.style.display = 'block';

        videoElement.removeEventListener('mouseleave', closeMovie); // Ensure iframe stays open
    }
}

function closeMovie() {
    const videoElement = document.querySelector('.movie-video');
    const posterElement = document.querySelector('.movie-poster-detail');
    const trailerElement = document.querySelector('.movie-trailer');
    const cinemaModeBtn = document.querySelector('.cinema-mode-btn');
    const cinemaExitBtn = document.querySelector('.cinema-exit-btn');
    
	if (videoElement) {
        videoElement.style.display = 'none';
        videoElement.src = '';
        posterElement.style.display = 'block';
		
		cinemaModeBtn.style.display = 'none';
		cinemaExitBtn.style.display = 'none';
		document.body.classList.remove('cinema-mode-active');
    }
}

function toggleCinemaMode() {
    document.body.classList.toggle('cinema-mode-active');
}

function initializeDropdown() {
    const dropdown = document.getElementById('dropdown');
    const storedType = localStorage.getItem('vidSourceType') || 'me';
    dropdown.value = storedType;
    updateVidSource(storedType);
}

function updateVidSource(value) {
    let base;
    if (value === '2embed') {
        base = 'https://www.2embed.cc';
    } else if (value === 'superembed') {
        base = 'https://multiembed.mov';
    } else {
        base = `https://vidsrc.${value}`;
    }
    window.vidSource = { type: value, base: base };
}

function buildUrl(isTV, item, currentSeason, currentEpisode) {
    const id = item.id;
    let url;

    if (window.vidSource.type === '2embed') {
        if (isTV) {
            url = `${window.vidSource.base}/embedtv/609681`;
            if (currentSeason && currentEpisode) {
                url += `&s=${currentSeason}&e=${currentEpisode}`;
            }
        } else {
            url = `${window.vidSource.base}/embed/${id}`;
        }
    } else if (window.vidSource.type === 'superembed') {
        url = `${window.vidSource.base}/?video_id=${id}&tmdb=1`;
        if (isTV) {
            if (currentSeason && currentEpisode) {
                url += `&s=${currentSeason}&e=${currentEpisode}`;
            }
        }
    } else {
        url = `${window.vidSource.base}/embed/${isTV ? 'tv' : 'movie'}`;
        if (['to', 'pro'].includes(window.vidSource.type)) {
            url += `/${id}`;
            if (isTV && currentSeason && currentEpisode) {
                url += `/${currentSeason}/${currentEpisode}`;
            }
        } else {
            url += `?tmdb=${id}`;
            if (isTV && currentSeason && currentEpisode) {
                url += `&season=${currentSeason}&episode=${currentEpisode}`;
            }
        }
    }

    return url;
}

async function goToPersonPage(personId, role) {
    const person = await fetchGeneral(personId, 'person');
    if (person) {
        localStorage.setItem('personDetail', JSON.stringify(person));
        localStorage.setItem('personRole', role);
        window.location.href = 'person.html';
    } else {
        console.error('Failed to fetch person details');
    }
}

async function fetchCollectionMovies(collectionId) {
	const collection = await fetchGeneral(collectionId, 'collection');
    displayCollectionMovies(collection);
      
}

async function displayCollectionMovies(collection) {
    const collectionSection = document.createElement('div');
    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
    collectionSection.className = 'similar-section';
    collectionSection.innerHTML = `
        <h3>${collection.name}</h3>
        <div class="similar-results" id="collectionResults"></div>
    `;

    const castCrewSection = document.getElementById('castCrew');
    detailContent.insertBefore(collectionSection, castCrewSection);
    const collectionMoviesContainer = document.getElementById('collectionResults');

    collection.parts.sort((a, b) => {
        return new Date(b.release_date) - new Date(a.release_date);
    });

    collection.parts.forEach(item => {
        const isFavorite = checkItemInList(favorites, item.id, "movie");
        const isWatchlist = checkItemInList(watchlist, item.id, "movie");
        const movieElement = document.createElement('div');
        movieElement.className = 'movie-card';

        const posterElement = document.createElement('img');
        posterElement.src = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300';
        posterElement.alt = `${item.title} Poster`;
        posterElement.className = 'movie-poster';

        const movieTitleOverlay = document.createElement('div');
        movieTitleOverlay.className = 'movie-title-overlay';

        const movieTitle = document.createElement('span');
        movieTitle.className = 'movie-title';
        movieTitle.textContent = item.title;

        movieTitleOverlay.appendChild(movieTitle);
		movieTitleOverlay.addEventListener('click', () => goToDetailPage(item, false));

        const detailsElement = document.createElement('div');
        detailsElement.className = 'movie-details';
        detailsElement.innerHTML = `
            <span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${item.id}, 'movie')">
                <i class="material-icons" style="padding-top: 3px;">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
            </span>
            <span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${item.id}, 'movie')">
                <i class="material-icons" style="padding-top: 3px;">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
            </span>
        `;

        movieElement.appendChild(posterElement);
        movieElement.appendChild(movieTitleOverlay);
        movieElement.appendChild(detailsElement);
        collectionMoviesContainer.appendChild(movieElement);
    });
}

async function displaySimilarMovies(movies, containerId, isTV) {
    const resultsContainer = document.getElementById(containerId);
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
	const watchingState = await getAllItems('currentWatchingState');
	const itemType = isTV ? "tv" : "movie";

    movies.forEach(item => {
        const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300';
        const backdropPath = item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : 'https://via.placeholder.com/500x281';
        const isFavorite = checkItemInList(favorites, item.id, itemType);
		const isWatchlist = checkItemInList(watchlist, item.id, itemType);
		const isCurrent = checkItemInList(watchingState, item.id, itemType);
		const title = isTV ? item.name : item.title;
		
        const movieElement = document.createElement('div');
        movieElement.className = 'movie-card';
		const movieTitleOverlay = document.createElement('div');
		movieTitleOverlay.className = 'movie-title-overlay';

		const movieTitle = document.createElement('span');
		movieTitle.className = 'movie-title';
		movieTitle.textContent = title;

		movieTitleOverlay.appendChild(movieTitle);
		movieElement.appendChild(movieTitleOverlay);
		movieTitleOverlay.addEventListener('click', () => goToDetailPage(item, isTV));
        const posterElement = document.createElement('img');
        posterElement.src = posterPath;
        posterElement.className = 'movie-poster';

        const detailsElement = document.createElement('div');
        detailsElement.className = 'movie-details';
        detailsElement.innerHTML = `
            <span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                <i class="material-icons" style="padding-top: 3px;">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
            </span>
            <span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                <i class="material-icons" style="padding-top: 3px;">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
            </span>
			<span id="isCurrent" class="add-to-list isCurrent" style="background-color: ${isCurrent ? 'rgba(0, 0, 0, 0.6)' : 'transparent'}">
                    <i class="material-icons" style="margin: 3px">${isCurrent ? 'schedule' : ''}</i>
            </span>
        `;

        movieElement.appendChild(posterElement);
        movieElement.appendChild(detailsElement);
        resultsContainer.appendChild(movieElement);
		const currentIcon = detailsElement.querySelector('.isCurrent');
        currentIcon.addEventListener('click', () => goToDetailPage(item, isTV));
    });
}

async function fetchEpisodes(tvId, seasonNumber) {
	const data = await fetchGeneral(tvId, 'tv', 'season', seasonNumber);
	const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
	const airedEpisodes = data.episodes.filter(episode => episode.air_date <= currentDate);
	const episodeList = document.getElementById('episodeList');
	if (!episodeList) return;
	episodeList.innerHTML = airedEpisodes.map(episode => `
		<div class="episode" data-episode-number="${episode.episode_number}" data-season-number="${seasonNumber}">
			<div class="episode-image">
				<img src="${episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : 'https://via.placeholder.com/450x300'}" alt="${episode.name}">
			</div>
			<div class="episode-info">
				<h3>${episode.episode_number}: ${episode.name}</h3>
				<p>${formatDate(episode.air_date)}<p>
				<p><span title="${episode.overview}">${episode.overview}</span></p>
			</div>
		</div>
	`).join('');

	const episodeElements = document.querySelectorAll('.episode');
	episodeElements.forEach(element => {
		element.addEventListener('click', async () => {	
			const updata = await fetchGeneral(tvId, 'tv');
			const episodeNumber = parseInt(element.getAttribute('data-episode-number'));
			await setCurrentEpisode(tvId, seasonNumber, episodeNumber, updata, false);
			await updateEpisodeVisuals(tvId);
		});
	});

	updateEpisodeVisuals(tvId);

}

async function updateCurrentEpisode(tvId, currentSeason, currentEpisode) {
    let currentWatchingState = await getAllItems('currentWatchingState');
	let isWaiting = false;
    // Fetch the details of the current season
    const seasonDetails = await fetchGeneral(tvId, 'tv', 'season', currentSeason);
    const showDetails = await fetchGeneral(tvId, 'tv');
    // Check if there is a next episode in the current season
    if (currentEpisode < seasonDetails.episodes.length) {
		if (showDetails.last_episode_to_air.season_number === currentSeason && showDetails.last_episode_to_air.episode_number === currentEpisode) {
			// The current episode is the last aired episode of the current season
			isWaiting = true;
		  } else if (showDetails.last_episode_to_air.season_number > currentSeason || 
					 (showDetails.last_episode_to_air.season_number === currentSeason && showDetails.last_episode_to_air.episode_number > currentEpisode)) {
			// There are more aired episodes after the current episode
			currentEpisode += 1;
		  } else {
			// The current episode is the last aired episode of the series
			isWaiting = true;
		  }
    } else {
        if (currentSeason < showDetails.last_episode_to_air.season_number) {
            currentSeason += 1;
            currentEpisode = 1;
        } else {
            if (showDetails.in_production) {
                currentSeason = currentSeason;
                currentEpisode = currentEpisode;
                    isWaiting = true;
            } else {
                toggleWatchlist(tvId, 'tv');
                resetProgress(tvId);
                return;
            }
        }
    }

    setCurrentEpisode(tvId, currentSeason, currentEpisode, showDetails, isWaiting);
    fetchEpisodes(tvId, currentSeason);
}

async function setCurrentEpisode(tvId, seasonNumber, episodeNumber, data, isWaiting) {
    // Retrieve the existing data from IndexedDB
    let currentWatchingState = await getAllItems('currentWatchingState');

    // Create a new episode object
    const newEpisode = {
        id: tvId,
        type: 'tv',
        name: data.name,
        season: seasonNumber,
        episode: episodeNumber,
        vote_average: data.vote_average,
        release_date: data.first_air_date,
        genres: data.genres.map(genre => genre.name),
        nextEpisodeAirDate: data.next_episode_to_air ? data.next_episode_to_air.air_date : "N/A",
        nextEpisodeSeason: data.next_episode_to_air ? data.next_episode_to_air.season_number : "N/A",
        nextEpisodeEpisode: data.next_episode_to_air ? data.next_episode_to_air.episode_number : "N/A",
        backdrop_path: data.backdrop_path,
        poster_path: data.poster_path,
        inProduction: data.in_production,
        isWaiting: isWaiting,
		timestamp: Date.now(),
    };

    // Check if the TV show already exists in the array
    const existingShowIndex = currentWatchingState.findIndex(show => show.id === tvId);

    if (existingShowIndex !== -1) {
        // Update the existing TV show with the new episode information
        currentWatchingState[existingShowIndex] = newEpisode;
    } else {
        // Add the new TV show to the array
        currentWatchingState.push(newEpisode);
    }

    // Store the updated array back in IndexedDB
    await updateItem('currentWatchingState', newEpisode);
}

async function getCurrentEpisode(tvId) {
    const currentShow = await getItem('currentWatchingState', tvId);
    if (currentShow) {
        return {
            seasonNumber: currentShow.season,
            episodeNumber: currentShow.episode
        };
    } else {
        return {
            seasonNumber: 1,
            episodeNumber: 1
        };
    }
}

async function updateEpisodeVisuals(tvId) {
    const { seasonNumber: currentSeason, episodeNumber: currentEpisode } = await getCurrentEpisode(tvId);
    const episodeElements = document.querySelectorAll('.episode');
    episodeElements.forEach(element => {
        const episodeNumber = parseInt(element.getAttribute('data-episode-number'));
        const seasonNumber = parseInt(element.getAttribute('data-season-number'));
        element.classList.remove('current', 'previous', 'next');

        const currentEpisodeIndex = (currentSeason - 1) * 20 + currentEpisode;
        const episodeIndex = (seasonNumber - 1) * 20 + episodeNumber;

        if (episodeIndex < currentEpisodeIndex) {
            element.classList.add('previous');
        } else if (episodeIndex === currentEpisodeIndex) {
            element.classList.add('current');
        } else {
            element.classList.add('next');
        }
    });
}

function displayFavoriteList() {
	null;
}

function displayWatchlist() {
	null;
}