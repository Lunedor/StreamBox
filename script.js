document.addEventListener('DOMContentLoaded', () => {
	runDailyCheck();
	const dropdown = document.getElementById('dropdown');
    initializeDropdown();
	loadVisibilityStates();
	
    dropdown.addEventListener('change', function() {
        updateVidSource(this.value);
        localStorage.setItem('vidSourceType', this.value);
    });
    const isTV = localStorage.getItem('isTV') === 'true';
    const toggleMoviesTV = document.getElementById('toggleMoviesTV');
    if (toggleMoviesTV) {
        toggleMoviesTV.checked = isTV;
        toggleMoviesTV.addEventListener('change', function() {
            const isTV = this.checked;
            const label = document.getElementById('labelToggle');
            if (label) {
                label.textContent = isTV ? "TV Shows" : "Movies";
            }
            localStorage.setItem('isTV', isTV);
            clearSearch();
            fetchInitialData();
            displayFavoriteList();
            displayWatchlist();
			loadVisibilityStates();
            if (isTV) {
            displayContinueWatching();
            displayNextEpisodes();
			} else {
				toggleContinueWatchingSection(false);
				toggleNextEpisodesSection(false);
				toggleNAEpisodesSection(false);
			}
        });
    }
	const
	sliderText = document.getElementById('sliderText');
	toggleMoviesTV.addEventListener('change', function() {
		if (this.checked) {
			sliderText.textContent = 'TV Shows';
			sliderText.style.left = 'auto';
			sliderText.style.right = '20px';
		} else {
			sliderText.textContent = 'Movies';
			sliderText.style.left = '30px';
			sliderText.style.right = 'auto';
		}
	});
	
    const labelToggle = document.getElementById('labelToggle');
    if (labelToggle) {
        labelToggle.textContent = isTV ? "TV Shows" : "Movies";
    }
    fetchInitialData();
    displayFavoriteList();
    displayWatchlist();
    if (isTV) {
		displayContinueWatching();
		displayNextEpisodes();
	} else {
		toggleContinueWatchingSection(false);
		toggleNextEpisodesSection(false);
		toggleNAEpisodesSection(false);
	}
	
    // Ensure searchInput exists before adding event listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchMovies, 1000));
    }
	
	const randomMovieBtn = document.getElementById('randomMovieBtn');
    const randomMovieModal = document.getElementById('randomMovieModal');
    const span = document.getElementsByClassName('close')[0];
	
    span.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == randomMovieModal) {
            closeModal();
        }
    });
	updateSliderText();	
	mouseDrag();
});

function updateSliderText() {
	const toggleMoviesTV = document.getElementById('toggleMoviesTV');
	const sliderText = document.getElementById('sliderText');
    if (toggleMoviesTV.checked) {
        sliderText.textContent = 'TV Shows';
        sliderText.style.left = 'auto';
        sliderText.style.right = '20px';
    } else {
        sliderText.textContent = 'Movies';
        sliderText.style.left = '30px';
        sliderText.style.right = 'auto';
    }
}

async function checkAndUpdateWatchingState() {
    let currentWatchingState = await getAllItems('currentWatchingState');
    for (let item of currentWatchingState) {
        if (item.isWaiting) {
            try {
                const data = await fetchGeneral(item.id, 'tv');
                if (!data.in_production) {
                    // Remove from currentWatchingState and add to watchlist
                    await toggleWatchlist(item.id, 'tv');
                    await resetProgress(item.id);
                } else {
                    // Update next episode air date if there is any change
                    if (data.last_episode_to_air.episode_number > item.episode) {
                        item.episode += 1;
                        item.isWaiting = false;
                    }
                    if (data.next_episode_to_air && data.next_episode_to_air.air_date !== item.nextEpisodeAirDate) {
                        item.nextEpisodeAirDate = data.next_episode_to_air.air_date;
                    }
                    await updateItem('currentWatchingState', item);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
    }
}

function runDailyCheck() {
    const lastRun = localStorage.getItem('lastRun');
    const now = new Date().getTime(); // Get current timestamp in milliseconds

    // Check if 6 hours have passed since the last run
    if (!lastRun || now - parseInt(lastRun) >= 6 * 60 * 60 * 1000) {
        checkAndUpdateWatchingState();
        localStorage.setItem('lastRun', now.toString());
    }
}

async function backupData() {
    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
    const currentWatchingState = await getAllItems('currentWatchingState');

    const data = {
        favorites,
        watchlist,
        currentWatchingState
    };

    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: "application/json" });

    // Get the current date and time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Format the date and time as a string
    const timestamp = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;

    // Use the timestamp in the file name
    const fileName = `backup_${timestamp}.json`;

    const link = document.createElement("a");
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function restoreData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.addEventListener('change', async function(event) {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    const db = await openDatabase();
                    const transaction = db.transaction(['favorites', 'watchlist', 'currentWatchingState'], 'readwrite');

                    transaction.objectStore('favorites').clear();
                    transaction.objectStore('watchlist').clear();
                    transaction.objectStore('currentWatchingState').clear();

                    data.favorites.forEach(item => transaction.objectStore('favorites').add(item));
                    data.watchlist.forEach(item => transaction.objectStore('watchlist').add(item));
                    data.currentWatchingState.forEach(item => transaction.objectStore('currentWatchingState').add(item));

                    transaction.oncomplete = () => {
                        alert('Data restored successfully!');
                        location.reload();
                    };

                    transaction.onerror = () => {
                        alert('Failed to restore data. Please ensure the file is correct.');
                    };
                } catch (error) {
                    alert('Failed to restore data. Please ensure the file is correct.');
                }
            };
            reader.readAsText(file);
        }
    });
    fileInput.click();
}

async function showRandomMovie() {
    const favorites = await getAllItems('favorites');
    const isTV = document.getElementById('toggleMoviesTV').checked;
    const filteredFavorites = favorites.filter(item => item.type === (isTV ? 'tv' : 'movie'));

    if (filteredFavorites.length > 0) {
        const randomIndex = Math.floor(Math.random() * filteredFavorites.length);
        const randomMovie = filteredFavorites[randomIndex];
		const data = await fetchGeneral(randomMovie.id, randomMovie.type);
        displayRandomMovieModal(data, isTV);
    } else {
        alert('No movies in your favorites list.');
    }
}

function displayRandomMovieModal(movie, isTV) {
    const posterPath = movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : 'https://via.placeholder.com/400x300';
    const genres = movie.genres ? movie.genres.map(genre => genre.name).join(', ') : 'Unknown';
    const rating = movie.vote_average !== undefined ? movie.vote_average.toFixed(1) : 'N/A';
	const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : movie.first_air_date ? movie.first_air_date.split('-')[0] : 'Unknown Year';
	const duration = movie.runtime ? movie.runtime + ' min' : '';
	const tagline = movie.tagline ? movie.tagline : '';
	
    document.getElementById('randomMoviePoster').src = posterPath;
    document.getElementById('randomMovieTitle').textContent = isTV ? movie.name : movie.title;
	document.getElementById('randomMovieYear').innerHTML = `<strong>${releaseYear}</strong>`;
    document.getElementById('randomMovieGenre').innerHTML = `<strong>Genre:</strong> ${genres}`;
	document.getElementById('randomMovieRating').innerHTML = `<strong>Rating:</strong> ${rating}`;
	document.getElementById('randomMovieDuration').textContent = `${duration}`;
	document.getElementById('randomMovieTagline').textContent = tagline;
    document.getElementById('randomMovieOverview').textContent = movie.overview;
	
	const posterElement = document.getElementById('randomMoviePoster');
    posterElement.style.cursor = 'pointer'; // Optional: Add a pointer cursor to indicate it's clickable
    posterElement.addEventListener('click', () => {
        goToDetailPage(movie, isTV);
    });
	document.getElementById('watchBtn').addEventListener('click',() => {
        goToDetailPage(movie, isTV);
    });
    const randomMovieModal = document.getElementById('randomMovieModal');
    randomMovieModal.style.display = 'block';
}

function closeModal() {
    const randomMovieModal = document.getElementById('randomMovieModal');
    randomMovieModal.style.display = 'none';
}

function initializeDropdown() {
    const dropdown = document.getElementById('dropdown');
    const storedType = localStorage.getItem('vidSourceType') || 'me';
    dropdown.value = storedType;
    updateVidSource(storedType);
}

function updateVidSource(value) {
    let base = `https://vidsrc.${value}`; // Corrected to use 'vidsrc' for all
    window.vidSource = { type: value, base: base };
}

async function searchMovies() {
    toggleCarouselButtons();
    const searchQuery = document.getElementById('searchInput').value;
    if (searchQuery.length > 2) {
        const isTV = document.getElementById('toggleMoviesTV').checked;
        const type = isTV ? 'tv' : 'movie';
        const queryParams = { query: encodeURIComponent(searchQuery) };

        try {
            const data = await fetchGeneral(null, `search/${type}`, null, null, queryParams);
            if (data && data.results) {
                displayResults(data.results, isTV);
                data.results.forEach(item => {
                    updateFavoriteIcon(item.id, type);
                    updateWatchlistIcon(item.id, type);
                });
            }
        } catch (error) {
            console.error('Error fetching data: ', error);
        }
    }
}

function toggleContinueWatchingSection(isVisible) {
    const continueWatchingSection = document.getElementById('continueWatching');
    if (continueWatchingSection) {
        continueWatchingSection.style.display = isVisible ? 'block' : 'none';
    }
}

function toggleNextEpisodesSection(isVisible) {
    const nextEpisodesSection = document.getElementById('nextEpisodes');
    if (nextEpisodesSection) {
        nextEpisodesSection.style.display = isVisible ? 'block' : 'none';
    }
}

function toggleNAEpisodesSection(isVisible) {
    const nextEpisodesSection = document.getElementById('naEpisodes');
    if (nextEpisodesSection) {
        nextEpisodesSection.style.display = isVisible ? 'block' : 'none';
    }
}

async function displayContinueWatching() {
    const currentEpisodes = await getAllItems('currentWatchingState');
    const toggleMoviesTV = document.getElementById('toggleMoviesTV');

    if (!toggleMoviesTV || !toggleMoviesTV.checked) {
        toggleContinueWatchingSection(false);
        return;
    }

    const currentTVShows = Object.keys(currentEpisodes).map(tvId => ({ id: tvId, ...currentEpisodes[tvId] }));

    if (currentTVShows.length === 0) {
        toggleContinueWatchingSection(false);
        return;
    }

    const continueWatchingItems = currentTVShows.filter(item => !item.isWaiting);

    if (continueWatchingItems.length === 0) {
        toggleContinueWatchingSection(false);
        return;
    }
	continueWatchingItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    // Display the items
    displayMovies(continueWatchingItems, 'continueWatchingResults', true);
	toggleContinueWatchingSection(true);
}

async function displayNextEpisodes() {
    const currentEpisodes = await getAllItems('currentWatchingState');
    const toggleMoviesTV = document.getElementById('toggleMoviesTV');

    if (!toggleMoviesTV || !toggleMoviesTV.checked) {
        toggleNextEpisodesSection(false);
		toggleNAEpisodesSection(false);
        return;
    }

    const currentTVShows = Object.keys(currentEpisodes).map(tvId => ({ id: tvId, ...currentEpisodes[tvId] }));

    if (currentTVShows.length === 0) {
        toggleNextEpisodesSection(false);
		toggleNAEpisodesSection(false);
        return;
    }

    // Filter out items where isWaiting is true
    const nextEpisodesItems = currentTVShows.filter(item => item.isWaiting);

    if (nextEpisodesItems.length === 0) {
        toggleNextEpisodesSection(false);
		toggleNAEpisodesSection(false);
        return;
    }

    // Separate items with and without air dates
    const itemsWithAirDate = nextEpisodesItems.filter(item => item.nextEpisodeAirDate !== 'N/A');
    const itemsWithoutAirDate = nextEpisodesItems.filter(item => item.nextEpisodeAirDate === 'N/A');

	 if (itemsWithAirDate.length === 0) {
			toggleNextEpisodesSection(false);
	 }
	 if (itemsWithoutAirDate.length === 0) {
			toggleNAEpisodesSection(false);
	 }
    // Display the items
    displayMovies(itemsWithAirDate, 'nextEpisodesResults', true);
    displayNa(itemsWithoutAirDate);
     if (itemsWithAirDate.length > 0) {
			toggleNextEpisodesSection(true);
	 }
	 if (itemsWithoutAirDate.length > 0) {
			toggleNAEpisodesSection(true);
	 }
}

function displayNa(itemsWithoutAirDate) {
    const episodesListElement = document.getElementById('na-episodes-list');
    episodesListElement.innerHTML = ''; // Clear any existing content
    itemsWithoutAirDate.forEach(item => {
        const listItem = document.createElement('li');
        const imageElement = document.createElement('img');
        const textElement = document.createElement('p');
        
        imageElement.src = item.backdrop_path ? `https://image.tmdb.org/t/p/w200${item.backdrop_path}` : 'https://via.placeholder.com/200x300';
        textElement.textContent = item.name;
        
        listItem.appendChild(imageElement);
        listItem.appendChild(textElement);
        episodesListElement.appendChild(listItem);
		imageElement.addEventListener('click', () => goToDetailPage(item, true));
		document.querySelectorAll('h2[data-container]').forEach(header => {
		  header.addEventListener('click', () => {
			const containerId = header.getAttribute('data-container');
			toggleSection(containerId);
		  });
		});
    });
}

const genres = ['Action', 'Drama', 'Science Fiction', 'Mystery', 'Documentary', 'Animation', 'Comedy', 'Romance'];
async function fetchInitialData() {
  const toggleMoviesTV = document.getElementById('toggleMoviesTV');
  if (toggleMoviesTV) {
    const isTV = toggleMoviesTV.checked;
    fetchPopularMovies(isTV);
    fetchTrendingMovies(isTV);

    // Fetch genre-based content
    for (const genre of genres) {
      fetchGenreContent(genre, isTV);
    }
  }
}

const genreIdMap = {};
for (const [id, name] of Object.entries(genreMap)) {
  genreIdMap[name] = id;
}

async function fetchGenreContent(genre, isTV) {
  const type = isTV ? 'tv' : 'movie';
  let genreId = genreIdMap[genre];

  // Handle the special case for "Science Fiction"
  if (genre === 'Science Fiction') {
    genreId = isTV ? 10765 : 878;
  }
  
  if (genre === 'Action') {
	genreId = isTV ? 10759 : 28;
  }

  if (genreId) {
    const queryParams = { with_genres: genreId };
    try {
      const data = await fetchGeneral(null, `discover/${type}`, null, null, queryParams);
      if (data && data.results) {
        const genreText = genre.replace(/\s/g, '');
        displayMovies(data.results, `${genreText}Section`, isTV);
      }
    } catch (error) {
      console.error('Error fetching data: ', error);
    }
  } else {
    console.error(`Genre '${genre}' not found in the genre map.`);
  }
}

async function displayResults(movies, isTV) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
	const watchingState = await getAllItems('currentWatchingState');

    movies.forEach(item => {
        const title = isTV ? item.name : item.title;
        const releaseYear = item.release_date ? item.release_date.split('-')[0] : item.first_air_date ? item.first_air_date.split('-')[0] : 'Unknown Year';
        const genres = item.genre_ids ? item.genre_ids.map(id => genreMap[id] || 'Unknown') : (item.genres ? item.genres.map(genre => genre.name) : ['Unknown']);
        const rating = item.vote_average !== undefined ? item.vote_average.toFixed(1) : 'N/A';
        const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300';
		const tagLine = item.tagline ? item.tagline : '';
        const overview = item.overview ? item.overview : '';
        const itemType = isTV ? "tv" : "movie";
		const isFavorite = checkItemInList(favorites, item.id, itemType);
		const isWatchlist = checkItemInList(watchlist, item.id, itemType);
		const isCurrent = checkItemInList(watchingState, item.id, itemType);

        const movieElement = document.createElement('div');
        movieElement.className = 'movie-card';

        const posterElement = document.createElement('img');
        posterElement.src = posterPath;
        posterElement.alt = `${title} Poster`;
        posterElement.className = 'movie-poster';
        posterElement.addEventListener('click', () => goToDetailPage(item, isTV));

        const detailsElement = document.createElement('div');
        detailsElement.className = 'movie-details';
        detailsElement.innerHTML = `
            <h3><span title="${title}">${title}</span></h3>
			<p class="movie-year"><strong>${releaseYear}</strong></p>
            <p class="movie-genre"><strong>Genre:</strong> ${genres.join(', ')}</p>
            <p class="movie-rating"><strong>Rating:</strong> ${rating}</p>
			<p class="movie-tagline"><strong>${tagLine}</strong></p>
            <p class="movie-overview"><span title="${overview}">${overview}</span></p>
			<div class="add-to" id="add-to">
            <span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                <i class="material-icons">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
            </span>
            <span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                <i class="material-icons">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
            </span>
			<span class="detail-icon">
				<i class="material-icons">${isCurrent ? 'schedule' : 'info_outline'}</i>
			</span>
			</div>
        `;

        movieElement.appendChild(posterElement);
        movieElement.appendChild(detailsElement);
        resultsContainer.appendChild(movieElement);
		const detailIcon = detailsElement.querySelector('.detail-icon');
        detailIcon.addEventListener('click', () => goToDetailPage(item, isTV));
    });
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');

    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.innerHTML = '';

    if (searchInput) searchInput.focus();
	toggleCarouselButtons();
}

async function fetchAndCacheMoviesData(isTV) {
    const type = isTV ? 'tv' : 'movie';
    try {
        const [popularData, trendingData, ...genreData] = await Promise.all([
            fetchGeneral(null, `${type}/popular`, null, null),
            fetchGeneral(null, `trending/${type}/day`, null, null),
            ...genres.map(genre => fetchGeneral(null, `discover/${type}`, null, null, { with_genres: genreIdMap[genre] }))
        ]);

        if (popularData && trendingData) {
            // Fetch trailers for popular movies
            const popularMovies = popularData.results;
            const popularTrailerPromises = popularMovies.map(movie => fetchMovieTrailer(movie.id, type));
            const popularTrailers = await Promise.all(popularTrailerPromises);
            popularMovies.forEach((movie, index) => movie.trailer = popularTrailers[index]);

            // Fetch trailers for trending movies
            const trendingMovies = trendingData.results;
            const trendingTrailerPromises = trendingMovies.map(movie => fetchMovieTrailer(movie.id, type));
            const trendingTrailers = await Promise.all(trendingTrailerPromises);
            trendingMovies.forEach((movie, index) => movie.trailer = trendingTrailers[index]);

            // Store the fetched data in localStorage with a timestamp
            const timestamp = Date.now();
            const popularKey = isTV ? 'popularTVShows' : 'popularMovies';
            const trendingKey = isTV ? 'trendingTVShows' : 'trendingMovies';
            localStorage.setItem(popularKey, JSON.stringify({ data: popularMovies, timestamp }));
            localStorage.setItem(trendingKey, JSON.stringify({ data: trendingMovies, timestamp }));
        }

        genreData.forEach((data, index) => {
            if (data && data.results) {
				const timestamp = Date.now();
                const genre = genres[index];
                const genreKey = isTV ? `${genre}TVShows` : `${genre}Movies`;
                localStorage.setItem(genreKey, JSON.stringify({ data: data.results, timestamp }));
            }
        });
    } catch (error) {
        console.error('Error fetching and caching data:', error);
    }
}

async function fetchPopularMovies(isTV) {
    const popularKey = isTV ? 'popularTVShows' : 'popularMovies';
    const cachedData = JSON.parse(localStorage.getItem(popularKey));
    const currentTime = Date.now();

    if (cachedData && currentTime - cachedData.timestamp < 6 * 60 * 60 * 1000) {
        displayMovies(cachedData.data, 'popularResults', isTV);
    } else {
        await fetchAndCacheMoviesData(isTV);
        const type = isTV ? 'tv' : 'movie';
        try {
            const data = await fetchGeneral(null, `${type}/popular`);
            if (data && data.results) {
                displayMovies(data.results, 'popularResults', isTV);
            }
        } catch (error) {
            console.error(`Error fetching popular ${type}s: `, error);
        }
    }
}

async function fetchTrendingMovies(isTV) {
    const trendingKey = isTV ? 'trendingTVShows' : 'trendingMovies';
    const cachedData = JSON.parse(localStorage.getItem(trendingKey));
    const currentTime = Date.now();

    if (cachedData && currentTime - cachedData.timestamp < 6 * 60 * 60 * 1000) {
        const movies = cachedData.data;
        displayTrendingMovies(movies, isTV);
    } else {
        await fetchAndCacheMoviesData(isTV);
        const type = isTV ? 'tv' : 'movie';
        try {
            const data = await fetchGeneral(null, `trending/${type}/day`);
            if (data && data.results) {
                const movies = data.results;
                const trailerPromises = movies.map(movie => fetchMovieTrailer(movie.id, type));
                const trailers = await Promise.all(trailerPromises);
                movies.forEach((movie, index) => movie.trailer = trailers[index]);
                displayTrendingMovies(movies, isTV);
            }
        } catch (error) {
            console.error(`Error fetching trending ${type}s: `, error);
        }
    }
}

async function fetchMovieTrailer(movieId, type) {
    try {
        const videoData = await fetchGeneral(movieId, type, 'videos');
        if (videoData && videoData.results) {
            const trailer = videoData.results.find(video => video.type === 'Trailer');
            return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching movie trailer:', error);
        return null;
    }
}

async function displayTrendingMovies(movies, isTV) {
    const carouselWrapper = document.getElementById('carouselWrapper');
    const resultsContainer = document.getElementById('trendingResults');
    resultsContainer.innerHTML = ''; // Clear existing movie cards

    // Create or reuse navigation buttons
    let prevButton = carouselWrapper.querySelector('.carousel-prev');
    let nextButton = carouselWrapper.querySelector('.carousel-next');

    if (!prevButton) {
        prevButton = document.createElement('button');
        prevButton.className = 'carousel-prev';
        prevButton.textContent = '‹';
        prevButton.onclick = () => scrollLeft();
        carouselWrapper.insertBefore(prevButton, resultsContainer); // Insert before the results container
    }

    if (!nextButton) {
        nextButton = document.createElement('button');
        nextButton.className = 'carousel-next';
        nextButton.textContent = '›';
        nextButton.onclick = () => scrollRight();
        carouselWrapper.appendChild(nextButton); // Append after the results container
    }

    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');

    movies.forEach(item => {
        const movieElement = document.createElement('div');
        movieElement.className = 'trending-movie-card';
		const itemType = isTV ? "tv" : "movie";
		const isFavorite = checkItemInList(favorites, item.id, itemType);
		const isWatchlist = checkItemInList(watchlist, item.id, itemType);

        const backdropElement = document.createElement('img');
        backdropElement.src = `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
        backdropElement.alt = `${item.title} Backdrop`;
        backdropElement.className = 'movie-backdrop';
        
        const title = isTV ? item.name : item.title;
        const infoOverlay = document.createElement('div');
        infoOverlay.className = 'movie-info';
        infoOverlay.innerHTML = `
            <h1>${title}</h1>
            <p><span title="${item.overview}">${item.overview}</span></p>
            <span class= "watchlist" onclick="toggleWatchlist(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                <i class="material-icons" style="color: ${isWatchlist ? 'green' : ''}">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
            </span>
            <span class= "favorites" onclick="toggleFavorite(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                <i class="material-icons" style="color: ${isFavorite ? 'red' : ''}">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
            </span>
			 <span class="detail-icon">
				<i class="material-icons">info_outline</i>
			</span>
        `;

        const videoElement = document.createElement('iframe');
        videoElement.className = 'movie-trailer';
        videoElement.allow = 'autoplay; encrypted-media';
        videoElement.setAttribute('allowfullscreen', true);
        videoElement.style.display = 'none';

        movieElement.appendChild(backdropElement);
        movieElement.appendChild(infoOverlay);
        movieElement.appendChild(videoElement);
        movieElement.appendChild(createMuteButton(videoElement));

        movieElement.addEventListener('mouseenter', () => {
            enterTimeout = setTimeout(() => {
                if (item.trailer) {
                    videoElement.style.display = 'block';
                    videoElement.src = item.trailer + '?autoplay=1&controls=1&modestbranding=1&showinfo=0' + (localStorage.getItem('soundPreference') === 'off' ? '&mute=1' : '&mute=0');
                    backdropElement.style.display = 'none';
                    infoOverlay.style.display = 'block';
                    prevButton.style.display = 'none';
                    nextButton.style.display = 'none';
                }
            }, 1000);
        });

        movieElement.addEventListener('mouseleave', () => {
            clearTimeout(enterTimeout);
            videoElement.style.display = 'none';
            videoElement.src = '';
            backdropElement.style.display = 'block';
            infoOverlay.style.display = 'block';
            prevButton.style.display = 'block';
            nextButton.style.display = 'block';
        });
		const detailIcon = movieElement.querySelector('.detail-icon');
        detailIcon.addEventListener('click', () => goToDetailPage(item, isTV));
        resultsContainer.appendChild(movieElement);
    });
}

function createMuteButton(videoElement) {
    const muteButton = document.createElement('button');
    muteButton.className = 'mute-button';
    muteButton.style.position = 'absolute';
    muteButton.style.right = '10px';
    muteButton.style.bottom = '10px';
    muteButton.style.zIndex = '4'; // Ensure it's above all elements

    // Create the icon element
    const iconElement = document.createElement('i');
    iconElement.className = 'material-icons';

    // Check and apply saved sound preference
    const soundPreference = localStorage.getItem('soundPreference');
    if (soundPreference === 'off') {
        videoElement.src = videoElement.src.includes('mute=1') ? videoElement.src : videoElement.src.replace('mute=0', 'mute=1');
        iconElement.textContent = 'volume_off';
    } else {
        videoElement.src = videoElement.src.includes('mute=0') ? videoElement.src : videoElement.src.replace('mute=1', 'mute=0');
        iconElement.textContent = 'volume_up';
    }

    muteButton.appendChild(iconElement);

    muteButton.onclick = function() {
        if (videoElement.src.includes('mute=1')) {
            videoElement.src = videoElement.src.replace('mute=1', 'mute=0');
            iconElement.textContent = 'volume_up';
            localStorage.setItem('soundPreference', 'on');
        } else {
            videoElement.src = videoElement.src.replace('mute=0', 'mute=1');
            iconElement.textContent = 'volume_off';
            localStorage.setItem('soundPreference', 'off');
        }
    };

    return muteButton;
}

function scrollLeft() {
    const trendingResults = document.getElementById('trendingResults');
    const itemWidth = trendingResults.querySelector('.trending-movie-card').offsetWidth + parseInt(window.getComputedStyle(trendingResults.querySelector('.trending-movie-card')).marginRight);
    trendingResults.scrollBy({ left: -itemWidth, behavior: 'smooth' });
}

function scrollRight() {
    const trendingResults = document.getElementById('trendingResults');
    const itemWidth = trendingResults.querySelector('.trending-movie-card').offsetWidth + parseInt(window.getComputedStyle(trendingResults.querySelector('.trending-movie-card')).marginRight);
    trendingResults.scrollBy({ left: itemWidth, behavior: 'smooth' });
}

function toggleCarouselButtons() {
    const resultsContainer = document.getElementById('results');
    const carouselButtons = document.querySelectorAll('.carousel-prev, .carousel-next');

    // Check if there are search results
    if (resultsContainer && resultsContainer.hasChildNodes()) {
        // Hide carousel buttons if there are search results
        carouselButtons.forEach(button => button.style.display = 'none');
    } else {
        // Show carousel buttons if there are no search results
        carouselButtons.forEach(button => button.style.display = 'block');
    }
}

async function displayFavoriteList() {
    const favorites = await getAllItems('favorites');
    const toggleMoviesTV = document.getElementById('toggleMoviesTV');
    if (!toggleMoviesTV) return;
    const isTV = toggleMoviesTV.checked;
    const filteredFavorites = favorites.filter(item => item.type === (isTV ? 'tv' : 'movie'));
    const count = favorites.filter(item => item.type === (isTV ? 'tv' : 'movie')).length

    // Shuffle the filtered watchlist
	if (filteredFavorites.length > 19) {
    for (let i = filteredFavorites.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredFavorites[i], filteredFavorites[j]] = [filteredFavorites[j], filteredFavorites[i]];
    }}

    // Take the first 20 items from the shuffled array
    const randomFavorites = filteredFavorites.slice(0, 20);
    // Update the Watchlist header with the count of favorite items
    const favoriteCount = document.getElementById('favoriteCount');
    if (favoriteCount) {
        favoriteCount.textContent = `(${count})`;
    }

    if (randomFavorites.length === 0) {
        document.getElementById('favoriteList').style.display = 'none';
        document.querySelector('.favorites-header').style.display = 'none'; // Hide the header if no items
        return;
    } else {
        document.querySelector('.favorites-header').style.display = 'flex'; // Show the header if items exist
		loadVisibilityStates();
    }

    displayMovies(randomFavorites, 'favoriteList', isTV);
}

async function displayWatchlist() {
    const watchlist = await getAllItems('watchlist');
    const toggleMoviesTV = document.getElementById('toggleMoviesTV');
    if (!toggleMoviesTV) return;
    const isTV = toggleMoviesTV.checked;
	const filteredWatchlist = watchlist.filter(item => item.type === (isTV ? 'tv' : 'movie'));
    const count = watchlist.filter(item => item.type === (isTV ? 'tv' : 'movie')).length

    // Shuffle the filtered watchlist
	if (filteredWatchlist.length > 19) {
    for (let i = filteredWatchlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredWatchlist[i], filteredWatchlist[j]] = [filteredWatchlist[j], filteredWatchlist[i]];
    }}

    // Take the first 20 items from the shuffled array
    const randomWatchlist = filteredWatchlist.slice(0, 20);
    // Update the Watched header with the count of watchlist items
    const watchlistCount = document.getElementById('watchlistCount');
    if (watchlistCount) {
        watchlistCount.textContent = `(${count})`;
    }

    if (randomWatchlist.length === 0) {
        document.getElementById('watchlist').style.display = 'none';
        document.querySelector('.watchlist-header').style.display = 'none'; // Hide the header if no items
        return;
    } else {
        document.querySelector('.watchlist-header').style.display = 'flex'; // Show the header if items exist
		loadVisibilityStates();
    }

    displayMovies(randomWatchlist, 'watchlist', isTV);
}

async function displayMovies(movies, containerId, isTV) {
    const resultsContainer = document.getElementById(containerId);
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
	const watchingState = await getAllItems('currentWatchingState');
	
    const fragment = document.createDocumentFragment();

    movies.forEach(item => {
        const title = item.name ? item.name : item.title;
        const rating = item.vote_average !== undefined ? item.vote_average.toFixed(1) : 'N/A';
        const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300';
        const backdropPath = item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : 'https://via.placeholder.com/500x281';
        const itemType = isTV ? "tv" : "movie";
		const isFavorite = checkItemInList(favorites, item.id, itemType);
		const isWatchlist = checkItemInList(watchlist, item.id, itemType);
		const isCurrent = checkItemInList(watchingState, item.id, itemType);
        const currentSeason = item.season;
        const currentEpisode = item.episode;
        const nextEpisodeDate = item.nextEpisodeAirDate && item.nextEpisodeAirDate !== "N/A" ? formatDate(item.nextEpisodeAirDate) : 'N/A';
        const nextEpisodeSeason = item.nextEpisodeSeason && item.nextEpisodeSeason !== "N/A" ? item.nextEpisodeSeason : 'N/A';
        const nextEpisodeEpisode = item.nextEpisodeEpisode && item.nextEpisodeEpisode !== "N/A" ? item.nextEpisodeEpisode : 'N/A';

        let movieElement;
        if (containerId === 'continueWatchingResults' || containerId === 'nextEpisodesResults') {
            movieElement = document.createElement('div');
            movieElement.className = 'continue-watching-card';

            const imageElement = document.createElement('img');
            imageElement.src = backdropPath;
            imageElement.alt = `${title} Backdrop`;
            imageElement.className = 'continue-backdrop';
            imageElement.addEventListener('click', () => goToDetailPage(item, isTV));

            const detailsElement = document.createElement('div');
            detailsElement.className = 'continue-details';
            detailsElement.innerHTML = `
                <h4>${title}</h4>
                ${
                    isTV && !item.isWaiting && currentSeason && currentEpisode 
                    ? `<p class="movie-current"><strong>S:</strong>${currentSeason} <strong>E:</strong>${currentEpisode}</p>` 
                    : isTV && item.isWaiting && item.nextEpisodeAirDate 
                    ? `<p class="movie-current"><strong>S:${nextEpisodeSeason} E:${nextEpisodeEpisode}</strong></p>
                    <p class="next-date">${nextEpisodeDate}</p>` 
                    : ''
                }
            `;
            
            movieElement.appendChild(imageElement);
            movieElement.appendChild(detailsElement);
        } 
		else {
            movieElement = document.createElement('div');
            movieElement.className = 'movie-card';
			const movieTitleOverlay = document.createElement('div');
			movieTitleOverlay.className = 'movie-title-overlay';

			const movieTitle = document.createElement('span');
			movieTitle.className = 'movie-title';
			movieTitle.textContent = title;

			movieTitleOverlay.appendChild(movieTitle);
			movieElement.appendChild(movieTitleOverlay);
			movieTitleOverlay.addEventListener('click', () => goToDetailPage(item, isTV));
            const imageElement = document.createElement('img');
            imageElement.src = posterPath;
            imageElement.alt = `${title} Poster`;
            imageElement.className = 'movie-poster';
            
            const detailsElement = document.createElement('div');
            detailsElement.className = 'movie-details';
            detailsElement.innerHTML = `
                ${isTV && currentSeason && currentEpisode ? `<p class="movie-current"><strong>S:</strong>${currentSeason}, <strong>E:</strong>${currentEpisode}</p>` : ''}
                <span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                    <i class="material-icons">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
                </span>
                <span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                    <i class="material-icons">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
                </span>
				<span id="isCurrent" class="add-to-list isCurrent" style="background-color: ${isCurrent ? 'rgba(0, 0, 0, 0.6)' : 'transparent'}">
                    <i class="material-icons" >${isCurrent ? 'schedule' : ''}</i>
                </span>
            `;
            movieElement.appendChild(imageElement);
            movieElement.appendChild(detailsElement);
			const detailIcon = detailsElement.querySelector('.isCurrent');
            detailIcon.addEventListener('click', () => goToDetailPage(item, isTV));
        }

        fragment.appendChild(movieElement);
    });

    resultsContainer.appendChild(fragment);
}

function saveVisibilityState(containerId, isVisible) {
  const isTV = localStorage.getItem('isTV') === 'true';
  const key = isTV ? `${containerId}_TV` : `${containerId}_Movie`;
  const visibilityStates = JSON.parse(localStorage.getItem('visibilityStates')) || {};
  visibilityStates[key] = isVisible;
  localStorage.setItem('visibilityStates', JSON.stringify(visibilityStates));
}

function updateArrow(containerId, isVisible) {
  const header = document.querySelector(`h2[data-container="${containerId}"]`);
  if (header) {
    header.classList.toggle('collapsed', !isVisible);
  }
}

function toggleSection(containerId) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

	debounceTimeout = setTimeout(() => {
	  const container = document.getElementById(containerId);
	  const isCarousel = containerId === "carouselWrapper";
	  if (container) {
		const isVisible = container.style.display !== 'none';
		container.style.display = isVisible ? 'none' : isCarousel ? 'block' : 'flex';
		saveVisibilityState(containerId, !isVisible);
		updateArrow(containerId, !isVisible);	 
	  }
  }, 300 );
}

function loadVisibilityStates() {
  const visibilityStates = JSON.parse(localStorage.getItem('visibilityStates')) || {};
  const isTV = localStorage.getItem('isTV') === 'true';

  // Filter and apply TV visibility states
  if (isTV) {
    Object.keys(visibilityStates).filter(key => key.endsWith('_TV')).forEach(key => {
      const containerId = key.replace('_TV', '');
      const container = document.getElementById(containerId);
      const isCarousel = containerId === "carouselWrapper";
      if (container) {
        const isVisible = visibilityStates[key];
        container.style.display = isVisible ? (isCarousel ? 'block' : 'flex') : 'none';
        updateArrow(containerId, isVisible);
      }
    });
  } else {
    // Filter and apply Movie visibility states
    Object.keys(visibilityStates).filter(key => key.endsWith('_Movie')).forEach(key => {
      const containerId = key.replace('_Movie', '');
      const container = document.getElementById(containerId);
      const isCarousel = containerId === "carouselWrapper";
      if (container) {
        const isVisible = visibilityStates[key];
        container.style.display = isVisible ? (isCarousel ? 'block' : 'flex') : 'none';
        updateArrow(containerId, isVisible);
      }
    });
  }
}
