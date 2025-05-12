// details.js

// Apply theme at the start of the details page
document.addEventListener('DOMContentLoaded', function() {
    // Apply theme from localStorage first thing
    const savedTheme = localStorage.getItem('theme');
    const isDarkTheme = savedTheme === 'dark' || !savedTheme; // Default to dark
    window.isDarkTheme = isDarkTheme;
    
    // Apply theme
    if (typeof window.applyTheme === "function") {
        window.applyTheme(isDarkTheme);
    } else {
        // Fallback theme application if applyTheme isn't available yet
        document.documentElement.style.setProperty('--background-color', isDarkTheme ? '#1b1b1b' : '#FBFBFB');
        document.documentElement.style.setProperty('--text-color', isDarkTheme ? '#e0e0e0' : '#000000');
        document.documentElement.style.setProperty('--hover-color', isDarkTheme ? 'crimson' : 'crimson');
        document.documentElement.style.setProperty('--border-color', isDarkTheme ? '#333' : '#ccc');
        document.documentElement.style.setProperty('--accent-color', isDarkTheme ? '#888888' : '#888888');
        document.documentElement.style.setProperty('--button-color', isDarkTheme ? '#ccc' : '#333');
        document.documentElement.style.setProperty('--img-filter', isDarkTheme ? 'invert(0.8)' : 'invert(0)');
        document.documentElement.style.setProperty('--logo-filter', isDarkTheme ? 'invert(0)' : 'invert(1)');
        document.documentElement.style.setProperty('--scrollbar-thumb', isDarkTheme ? '#606060' : '#ddd');
        document.documentElement.style.setProperty('--scrollbar-track', isDarkTheme ? '#202020' : '#bbb');
    }
    
    // Initialize the detail page
    initDetailPage();
});

let urlParams = new URLSearchParams(window.location.search);
let id = urlParams.get('id');
let mediaType = urlParams.get('type') || 'movie';
let isDisplay = false;
let firstClick = true;
let timeCalled = false;

let detailContainer = document.getElementById('detailContainer');

async function initDetailPage() {
    try {
        detailContainer.innerHTML = '<div class="loading">Loading...</div>';

        let details = await window.fetchItemDetails(mediaType, id);
        if (!details) {
            throw new Error('Failed to load details');
        }
        if (!window.availableMovieIDs || window.availableMovieIDs.size === 0 ||
            !window.availableTVIDs || window.availableTVIDs.size === 0 ||
            !window.availableEpisodeIDs || window.availableEpisodeIDs.size === 0) {
            await fetchAvailableIDs();
        }
        let isAvailable = (mediaType === 'movie' && window.availableMovieIDs.has(parseInt(id))) ||
            (mediaType === 'tv' && window.availableTVIDs.has(parseInt(id)));

        await window.reloadFavoritesAndWatched();
        window.mediaItems[details.id] = details;
        details.type = mediaType;

        if (mediaType === 'tv' && details.seasons?.length) {
            details.seasons = details.seasons.filter(season => {
                if (season.name && season.name.toLowerCase().includes('special')) return false;
                if (!season.air_date) return false;
                return new Date(season.air_date) <= new Date();
            });
        }
        document.title = `${details.title || details.name} | StreamBox`;
        detailContainer.innerHTML = buildDetailHTML(details);

        let watchBtn = document.getElementById("watchBtnCenter");
        if (!isAvailable && watchBtn) {
            watchBtn.style.display = "none";
        } else if (watchBtn) {
            watchBtn.style.display = "block";
        }

        if (mediaType === 'tv' && details.seasons?.length) {
            loadSeasonEpisodes(details.seasons[0].season_number);
        }

        // "Similar Items"
        if (details.similar?.results?.length) {
            renderSimilarItems(details.similar.results);
        }

        // "Collection" 
        if (details.belongs_to_collection) {
            let collectionId = details.belongs_to_collection.id;
            let collectionData = await window.fetchGeneral(collectionId, 'collection');
            if (collectionData && collectionData.parts?.length) {
                renderCollectionItems(collectionData.parts);
            }
        }

        updateButtonStates();
        loadTrailer();

        let tvProgress = await window.getTvProgress(id);
        
        // ✅ KEEP YOUR ORIGINAL LOGIC (FOR SEASON SELECTION)
        if (tvProgress) {
            if (mediaType === 'tv' && details.seasons && details.seasons.length) {
                let seasonToLoad = details.seasons[0].season_number;

                // Use stored progress if it exists
                seasonToLoad = tvProgress.season <= tvProgress.lastSeason ? tvProgress.season : tvProgress.lastSeason;

                // Set the dropdown value
                let seasonSelect = document.querySelector('.season-select');
                if (seasonSelect) {
                    seasonSelect.value = seasonToLoad;
                }

                // Load episodes for the determined season
                loadSeasonEpisodes(seasonToLoad);
            }

            // ✅ NEW CHECK: Use `eps_tmdb.txt` to determine if the next episode is available
            let nextEpisodeKey = `${id}_${tvProgress.season}x${tvProgress.episode}`;
            let episodeAvailable = window.availableEpisodeIDs.has(nextEpisodeKey);

            let watchBtn = document.getElementById("watchBtnCenter");
            if (!episodeAvailable) {
                watchBtn.style.display = "none";
            } else {
                watchBtn.style.display = "block";
            }
        }

    } catch (error) {
        console.error('Error loading details:', error);
        detailContainer.innerHTML = '<div class="error">Failed to load details. Please try again later.</div>';
    }
    let autonextToggle = document.getElementById("autonextToggle");
    let videoElement = document.getElementById("movieVideo");

    if (autonextToggle) {
        autonextToggle.addEventListener("change", () => {
            if (videoElement.src) {
                let url = new URL(videoElement.src);
                if (autonextToggle.checked) {
                    url.searchParams.set("autonext", "1");
                } else {
                    url.searchParams.delete("autonext");
                }
                videoElement.src = url.toString();
            }
        });
    }
    attachEpisodeClickEvents();
    // Hide AutoNext Switch for Movies
    let autonextContainer = document.querySelector(".autonext-container");
    if (mediaType === "movie" && autonextContainer) {
        autonextContainer.style.display = "none";
    }

}

function buildDetailHTML(details) {
    return `
    <div class="detail-header">
	<!-- Watch Butonu -->
	<button id="closeBtnCenter" class="close-btn-center" onclick="displayMovie(false)">
		<i class="fa-regular fa-circle-stop"></i>
	</button>
	<!-- Watch Butonu -->
			<button id="watchBtnCenter" class="watch-btn-center" onclick="displayMovie(true)">
			  <i class="fa-regular fa-circle-play"></i>
			</button>
      ${
		  `<div class="backdrop" style="background-image: url('${window.formatImageUrl(details.backdrop_path, true)}')"></div>`
      }
	  <iframe class="movie-video" id="movieVideo" src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      <!-- AutoNext Switch -->
       <div class="autonext-container">
            <label class="autonext-toggle">
                <input type="checkbox" id="autonextToggle">
                <span class="autonext-slider"></span>
            </label>
            <span>AutoNext</span>
        </div>
      <div class="poster-container">
        ${
			`<img src="${window.formatImageUrl(details.poster_path)}" class="poster-image" alt="${details.title || details.name}">`
        }
        <div class="detail-content">
          <div class="title-section">
            <h1>${details.title || details.name}</h1>
            ${
              details.release_date || details.first_air_date
                ? `<span class="year">(${new Date(details.release_date || details.first_air_date).getFullYear()})</span>`
                : ''
            }
          </div>
          ${
            details.tagline
              ? `<p class="tagline">${details.tagline}</p>`
              : ''
          }
          <div class="meta-info">
            ${
              details.runtime
                ? `<span><i class="fas fa-clock" style="opacity: 0.8"></i>${details.runtime} mins</span>`
                : ''
            }
            ${
              details.vote_average
                ? `<span><i class="fas fa-star" style="color:yellow; opacity: 0.8; filter:drop-shadow(0 0 3px gray)"></i>${details.vote_average.toFixed(1)}</span>`
                : ''
            }
            ${
              details.genres?.length
                ? `<span><i class="fas fa-tag" style="opacity: 0.8"></i>${details.genres.map(g => g.name).join(', ')}</span>`
                : ''
            }
          </div>
          ${
            details.overview
              ? `
                <div class="overview">
                  <h3 class="section-title">Overview</h3>
                  <p>${details.overview}</p>
                </div>
              `
              : ''
          }
		  <div class="actions">
            <!-- Favori Butonu -->
            <button class="action-btn fav-btn" onclick="toggleFavoriteT(${details.id}, '${mediaType}', this)" aria-label="Favorite">
              <i class="fas fa-heart"></i>
              <span>Favorite</span>
            </button>
            <!-- Watched Butonu -->
            <button class="action-btn watched-btn" onclick="toggleWatchedT(${details.id}, '${mediaType}', this)"  aria-label="Watched">
              <i class="fas fa-eye"></i>
              <span>Watched</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cast -->
    ${
      details.credits?.cast?.length
        ? `
          <div class="detail-section">
            <h3 class="section-title">Cast</h3>
            <div class="cast-crew-scroll">
              ${details.credits.cast.slice(0, 10).map(member => `
                <div class="cast-crew-item" onclick="goPersonPage(${member.id})">
                  ${
                    member.profile_path
                      ? `<img src="${window.formatImageUrl(member.profile_path)}" alt="${member.name}">`
                      : `<img src="https://placehold.co/75x100?text=${member.name}" alt="${member.name}">`
                  }
                  <h4>${member.name}</h4>
                  ${member.character ? `<p>${member.character}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `
        : ''
    }
	${details.credits?.cast?.length ? `<script>enableHorizontalMouseDrag(document.getElementById("castScroll"));</script>` : ''}

    <!-- Crew -->
	${
	  details.credits?.crew?.filter(member => ['Director', 'Writer', 'Screenplay', 'Director of Photography', 'Producer', 'Original Music Composer'].includes(member.job)).length
		? `
		  <div class="detail-section">
			<h3 class="section-title">Crew</h3>
			<div class="cast-crew-scroll" id="crewScroll">
			  ${
				details.credits.crew
				  .filter(member => ['Director', 'Writer', 'Screenplay', 'Director of Photography', 'Producer', 'Original Music Composer'].includes(member.job))
				  .sort((a, b) => {
					const priority = ['Director', 'Writer', 'Screenplay', 'Director of Photography', 'Producer', 'Original Music Composer'];
					return priority.indexOf(a.job) - priority.indexOf(b.job);
				  })
				  .map(member => `
					<div class="cast-crew-item" onclick="goPersonPage(${member.id})">
					  ${
						member.profile_path
						  ? `<img src="${window.formatImageUrl(member.profile_path)}" alt="${member.name}">`
						  : `<img src="https://placehold.co/75x100?text=${member.name}" alt="${member.name}">`
					  }
					  <h4>${member.name}</h4>
					  ${member.job ? `<p>${member.job}</p>` : ''}
					</div>
				  `).join('')} </div> </div>`
		: ''
	}
	${details.credits?.crew?.length ? `<script>enableHorizontalMouseDrag(document.getElementById("crewScroll"));</script>` : ''}

    <!-- TV Sezonları -->
	${
	  details.seasons?.length
		? `
		  <div class="detail-section">
			<h3 class="section-title">Seasons</h3>
			<div class="seasons-controls">
			  <select class="season-select" onchange="loadSeasonEpisodes(this.value)">
				${details.seasons.map((season, idx) => `
				  <option value="${season.season_number}" ${idx === 0 ? 'selected' : ''}>
					${season.name}
				  </option>
				`).join('')}
			  </select>
			  <button class="reset-progress-btn" id="resetProgressBtn" onclick="resetTvProgress()"><i class="fa-regular fa-trash-can"></i></button>
			</div>
			<div class="episodes-grid" id="episodesContainer"></div>
		  </div>
		`
		: ''
	}

    <!-- Collection (birden fazla filmin olduğu seriler) -->
    ${
      details.belongs_to_collection
        ? `
          <div class="detail-section">
            <h3 class="section-title">Collection</h3>
            <div class="horizontal-scroll" id="collectionContainer"></div>
          </div>
        `
        : ''
    }

    <!-- Similar Items -->
    ${
      details.similar?.results?.length
        ? `
          <div class="detail-section">
            <h3 class="section-title">Similar Titles</h3>
            <div class="horizontal-scroll" id="similarContainer"></div>
          </div>
        `
        : ''
    }
  `;
}

function renderSimilarItems(similarArray) {
    let container = document.getElementById('similarContainer');
    if (!container) return;

    similarArray.forEach(simItem => {
        let realType = simItem.media_type || mediaType;
        // “createMediaCard”:
        let card = createMediaCard(simItem, realType, false);
        container.appendChild(card);
    });
    enableHorizontalMouseDrag(container); // Enable drag after appending
}

function renderCollectionItems(collectionParts) {
    let collectionContainer = document.getElementById('collectionContainer');
    if (!collectionContainer) return;

    collectionParts.sort((a, b) => {
        let yearA = new Date(a.release_date || a.first_air_date).getFullYear();
        let yearB = new Date(b.release_date || b.first_air_date).getFullYear();
        return yearA - yearB;  // Ascending order, change to `yearB - yearA` for descending
    });

    collectionParts.forEach(movie => {
        let card = createMediaCard(movie, 'movie', false);
        collectionContainer.appendChild(card);
    });
    enableHorizontalMouseDrag(collectionContainer); // Enable drag after appending
}

async function loadTrailer() {
    let trailer = await window.fetchTrailer(mediaType, id);
    if (trailer) {
        let trailerHtml = `
      <div class="detail-section">
        <h3 class="section-title">Trailer</h3>
        <div class="trailer-wrapper">
		<iframe class="trailer-iframe" 
          src="https://www.youtube.com/embed/${trailer.key}" 
          frameborder="0" 
          allowfullscreen>
        </iframe>
		</div>
      </div>
    `;
        detailContainer.insertAdjacentHTML('beforeend', trailerHtml);
    }
}

async function toggleFavoriteT(id, type, btn) {
    toggleFavorite(id, mediaType, null)
        .then(() => {
            updateButtonStates();
        });
}

async function toggleWatchedT(id, type, btn) {
    toggleWatched(id, mediaType, null)
        .then(() => {
            updateButtonStates();
        });
}

async function resetTvProgress() {
    if (confirm("Are you sure you want to reset your watch progress for this TV show? This cannot be undone.")) {
        try {
            await window.removeTvProgress(id);
            let resetBtn = document.getElementById("resetProgressBtn");
            resetBtn.style.visibility = "hidden";
            let seasonSelect = document.querySelector('.season-select');
            if (seasonSelect) {
                loadSeasonEpisodes(seasonSelect.value);
            }
            alert('Progress reset edildi.');


        } catch (e) {
            console.error('Error resetting TV progress:', e);
            alert('Progress reset edilemedi.');
        }
    } else {
        return
    }
}

function updateButtonStates() {
    let favBtn = document.querySelector('.fav-btn');
    let watBtn = document.querySelector('.watched-btn');

    if (!favBtn || !watBtn) return;

    if (window.isFavorited(id, mediaType)) {
        favBtn.innerHTML = '<i class="fas fa-heart" style="color:#e50914;"></i>';
    } else {
        favBtn.innerHTML = '<i class="fas fa-heart"></i>';
    }

    if (window.isWatched(id, mediaType)) {
        watBtn.innerHTML = '<i class="fas fa-eye" style="color:#0f0;"></i>';
    } else {
        watBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

async function loadSeasonEpisodes(seasonNumber) {
    let episodesContainer = document.getElementById("episodesContainer");
    if (!episodesContainer) return;

    episodesContainer.innerHTML = '<div class="loading">Loading episodes...</div>';

    try {
        let seasonData = await window.fetchGeneral(id, 'tv', 'season', seasonNumber);
        if (!seasonData || !seasonData.episodes) {
            episodesContainer.innerHTML = '<div class="error">No episodes found</div>';
            return;
        }

        let tvProgress = await window.getTvProgress(id);

        // Filter only aired episodes
        let airedEpisodes = seasonData.episodes.filter(episode => {
            if (!episode.air_date) return false;
            return new Date(episode.air_date) <= new Date();
        });

        episodesContainer.innerHTML = airedEpisodes.map(episode => {
            let isWatched = false;
            let currentClass = '';

            if (tvProgress) {
                let currentSeason = parseInt(seasonNumber, 10);
                let progressSeason = parseInt(tvProgress.season, 10);
                let progressEpisode = parseInt(tvProgress.episode, 10);
                let epNumber = parseInt(episode.episode_number, 10);
                let resetBtn = document.getElementById("resetProgressBtn");
                resetBtn.style.visibility = "visible";

                if (progressSeason > currentSeason) {
                    isWatched = true;
                } else if (progressSeason === currentSeason) {
                    if (progressEpisode > epNumber) {
                        isWatched = true;
                    }
                    if (progressEpisode === epNumber) {
                        currentClass = 'current-episode';
                    }
                }
            }

            let episodeId = `${id}-${seasonNumber}-${episode.episode_number}`;
            let isAvailable = window.availableEpisodeIDs.has(episodeId);

            return `
                <div class="episode-card ${currentClass} ${isWatched ? 'watched-episode' : ''}" 
                    data-season="${seasonNumber}" data-episode="${episode.episode_number}" 
                    ${isAvailable ? '' : 'style="opacity: 0.8;"'}>
                    ${episode.still_path ? `<img src="${window.formatImageUrl(episode.still_path)}" alt="${episode.name}">` : `<img src="https://placehold.co/75x100?text=${episode.name}" alt="${episode.name}">`}
                    <h4>${episode.episode_number}. ${episode.name}</h4>
                    ${episode.overview ? `<p>${episode.overview}</p>` : '<p></p>'}
                    <div class="meta-info">
                        ${episode.vote_average ? `<span><i class="fas fa-star" style="color:yellow; opacity: 0.8; filter:drop-shadow(0 0 3px gray)"></i>${episode.vote_average.toFixed(1)}</span>` : ''}
                        ${episode.air_date ? `<span>${new Date(episode.air_date).toLocaleDateString()}</span>` : ''}
                        ${episode.runtime ? `<span><i class="fas fa-clock"></i>${episode.runtime}m</span>` : ''}
                    </div>
                    <button class="mark-watched-btn" title="Mark this episode as watched and advance to next">
                        <i class="fas fa-check"></i>
                    </button>
                </div>`;
        }).join("");

        attachEpisodeClickEvents();
    } catch (error) {
        episodesContainer.innerHTML = '<div class="error">Failed to load episodes</div>';
        console.error("Error loading episodes:", error);
    }
}

async function attachEpisodeClickEvents() {
    let episodesContainer = document.getElementById("episodesContainer");
    if (!episodesContainer) return;

    episodesContainer.addEventListener("click", async (event) => {
        // Handle mark as watched button clicks
        if (event.target.closest('.mark-watched-btn')) {
            event.stopPropagation();
            const episodeCard = event.target.closest('.episode-card');
            const clickedSeason = parseInt(episodeCard.getAttribute("data-season"), 10);
            const clickedEpisode = parseInt(episodeCard.getAttribute("data-episode"), 10);
            
            // Calculate next episode based on the clicked episode
            const nextEpCalc = await getNextEpisode(clickedSeason, clickedEpisode);
            if (nextEpCalc) {
                const tvDetails = window.mediaItems[id];
                const inProduction = tvDetails ? tvDetails.in_production : true;
                const lastSeason = tvDetails?.last_episode_to_air?.season_number;
                const lastEpisode = tvDetails?.last_episode_to_air?.episode_number;
                const lastEpisodeAirDate = tvDetails?.last_episode_to_air?.air_date;
                const nextEpisode = tvDetails?.next_episode_to_air?.episode_number;
                const nextSeason = tvDetails?.next_episode_to_air?.season_number;
                const nextAirDate = tvDetails?.next_episode_to_air?.air_date;

                // Update progress to next episode based on the clicked episode
                await window.updateTvProgress(
                    id,
                    nextEpCalc.season,
                    nextEpCalc.episode,
                    inProduction,
                    0,
                    0,
                    nextEpisode,
                    nextSeason,
                    nextAirDate,
                    lastSeason,
                    lastEpisode,
                    lastEpisodeAirDate
                );
                
                // Refresh episode list and switch season if needed
                if (nextEpCalc.season !== clickedSeason) {
                    let seasonSelect = document.querySelector('.season-select');
                    if (seasonSelect) {
                        seasonSelect.value = nextEpCalc.season;
                    }
                }
                loadSeasonEpisodes(nextEpCalc.season);
            }
            return;
        }

        // Regular episode card click (for playing)
        let episodeCard = event.target.closest(".episode-card");
        if (!episodeCard) return;

        let season = parseInt(episodeCard.getAttribute("data-season"), 10);
        let episode = parseInt(episodeCard.getAttribute("data-episode"), 10);
        if (!season || !episode) return;

        await handleEpisodeClick(season, episode);
        loadSeasonEpisodes(season);
    });
}

async function markNextEpisodeAsWatched(currentSeason, currentEpisode) {
    const nextEpCalc = await getNextEpisode(currentSeason, currentEpisode);
    if (!nextEpCalc) {
        console.error("No next episode found");
        return;
    }

    const tvDetails = window.mediaItems[id];
    await advanceToNextEpisode(id, tvDetails);
    const updatedProgress = await window.getTvProgress(id);
    if (updatedProgress) {
        loadSeasonEpisodes(updatedProgress.season);
    }
}

function buildUrl() {
    let isTV = mediaType === "tv" ? true : false;
    let url;
    url = `https://vidsrc.net/embed/${isTV ? 'tv' : 'movie'}`;
    url += `?tmdb=${id}`;
    url += '&ds_lang=tr'
    return url;
}

async function displayMovie(isDisplay) {
    let videoElement = document.querySelector('.movie-video');
    let watchBtnCenter = document.getElementById('watchBtnCenter');
    let closeBtnCenter = document.getElementById('closeBtnCenter');
    let backdropElement = document.querySelector('.backdrop');

    if (isDisplay) {
        videoElement.style.display = 'block';
        closeBtnCenter.style.display = 'block';
        backdropElement.style.display = 'none';

        let autonextToggle = document.getElementById("autonextToggle");
        let autonextEnabled = autonextToggle.checked ? "&autonext=1" : "";
        let isFirstClick = firstClick;
        firstClick = false;
        timeCalled = false;

        if (mediaType === 'tv') {
            if (window.innerWidth <= 768) {
                watchBtnCenter.style.left = "94%";
                watchBtnCenter.style.top = "45%";
                watchBtnCenter.style.fontSize = "30px";
                watchBtnCenter.innerHTML = '<i class="fa-solid fa-forward-step"></i>';
            } else {
                watchBtnCenter.style.left = "97%";
                watchBtnCenter.style.top = "55%";
                watchBtnCenter.style.fontSize = "40px";
                watchBtnCenter.innerHTML = '<i class="fa-solid fa-forward-step"></i>';
            }

            let progress = await window.getTvProgress(id);

            if (!progress) {
                let tvDetails = window.mediaItems[id];
                let inProduction = tvDetails ? tvDetails.in_production : true;
                let apiNextEpisode = tvDetails && tvDetails.next_episode_to_air ?
                    tvDetails.next_episode_to_air.episode_number : null;
                let apiNextSeason = tvDetails && tvDetails.next_episode_to_air ?
                    tvDetails.next_episode_to_air.season_number : null;
                let apiNextEpisodeDate = tvDetails && tvDetails.next_episode_to_air ?
                    tvDetails.next_episode_to_air.air_date : null;
                let lastSeason = tvDetails && tvDetails.last_episode_to_air ?
                    tvDetails.last_episode_to_air.season_number :
                    null;
                let lastEpisode = tvDetails && tvDetails.last_episode_to_air ?
                    tvDetails.last_episode_to_air.episode_number :
                    null;
                let lastEpisodeAirDate = tvDetails && tvDetails.last_episode_to_air ?
                    tvDetails.last_episode_to_air.air_date :
                    null;
                await window.addTvProgress(
                    id,
                    1,
                    1,
                    inProduction,
                    0, // currentTime
                    0, // totalDuration
                    apiNextEpisode,
                    apiNextSeason,
                    apiNextEpisodeDate,
                    lastSeason,
                    lastEpisode,
                    lastEpisodeAirDate
                );
                progress = await window.getTvProgress(id);
            }

            if (!isFirstClick) {
                let tvDetails = window.mediaItems[id];
                await advanceToNextEpisode(id, tvDetails);
                progress = await window.getTvProgress(id);
            }

            if (progress) {
                let seasonNumber = progress.season;
                let episodeNumber = progress.episode;

                let iframeUrl = `https://vidsrc.net/embed/tv?tmdb=${id}&season=${seasonNumber}&episode=${episodeNumber}${autonextEnabled}&ds_lang=tr`;
                videoElement.src = iframeUrl;
                loadSeasonEpisodes(seasonNumber);
                if ((progress.season > progress.lastSeason) || (progress.season === progress.lastSeason && progress.episode === progress.lastEpisode)) {
                    let watchBtn = document.getElementById("watchBtnCenter");
                    watchBtn.style.display = "none";
                }
            }
        } else {
            // Film mantığı
            let iframeUrl = buildUrl();
            videoElement.src = iframeUrl;
        }

    } else {
        videoElement.style.display = 'none';
        videoElement.src = '';
        closeBtnCenter.style.display = 'none';
        backdropElement.style.display = 'block';

        if (mediaType === 'tv') {
            watchBtnCenter.style.left = "50%";
            watchBtnCenter.style.top = "20%";
            watchBtnCenter.style.fontSize = "80px";
            watchBtnCenter.innerHTML = '<i class="fa-regular fa-circle-play"></i>';
            firstClick = true;
        }
    }
}

function playEpisode(season, episode) {
    let iframe = document.querySelector(".movie-video");
    let url = `https://vidsrc.net/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
    iframe.src = url;
    displayMovie(true);
    loadSeasonEpisodes(season);
}

async function getNextEpisode(currentSeason, currentEpisode) {
    // Attempt to get season data for the current season
    let seasonData = await window.fetchGeneral(id, 'tv', 'season', currentSeason);
    if (seasonData && seasonData.episodes) {
        // Look for the next episode in the current season
        let nextEpisodeData = seasonData.episodes.find(ep => ep.episode_number === currentEpisode + 1);
        if (nextEpisodeData) {
            return {
                season: currentSeason,
                episode: nextEpisodeData.episode_number,
                runtime: nextEpisodeData.runtime || 0,
                nextEpisodeAirDate: nextEpisodeData.air_date || null
            };
        }
    }
    // If no next episode in the current season, check if the show is still in production
    let tvDetails = await window.fetchGeneral(id, 'tv');
    if (tvDetails && tvDetails.in_production) {
        return {
            season: currentSeason + 1,
            episode: 1,
            runtime: 0,
            nextEpisodeAirDate: "N/A"
        };
    }
    return null;
}

async function advanceToNextEpisode(id, tvDetails) {
    console.log("Called");
    let inProduction = tvDetails ? tvDetails.in_production : true;
    let progress = await window.getTvProgress(id);
    if (!progress) {
        console.error("No progress record found for id:", id);
        return;
    }
    let nextEpCalc = await getNextEpisode(progress.season, progress.episode);
    if (nextEpCalc) {
        console.log("nextEpCalc");
        let lastSeason = tvDetails && tvDetails.last_episode_to_air ? tvDetails.last_episode_to_air.season_number : null;
        let lastEpisode = tvDetails && tvDetails.last_episode_to_air ? tvDetails.last_episode_to_air.episode_number : null;
        let lastEpisodeAirDate = tvDetails && tvDetails.last_episode_to_air ? tvDetails.last_episode_to_air.air_date : null;
        let nextEpisode = tvDetails && tvDetails.next_episode_to_air ? tvDetails.next_episode_to_air.episode_number : null;
        let nextSeason = tvDetails && tvDetails.next_episode_to_air ? tvDetails.next_episode_to_air.season_number : null;
        let nextAirDate = tvDetails && tvDetails.next_episode_to_air ? tvDetails.next_episode_to_air.air_date : null;
        return await window.updateTvProgress(
            id,
            nextEpCalc.season,
            nextEpCalc.episode,
            inProduction,
            0,
            0,
            nextEpisode,
            nextSeason,
            nextAirDate,
            lastSeason,
            lastEpisode,
            lastEpisodeAirDate
        );
        console.log(progress);
    } else if (!tvDetails.in_production) {
        await toggleWatchedT(id, 'tv', null);
        await window.removeTvProgress(id);
    }
}

async function handleEpisodeClick(season, episode) {
    let tvDetails = window.mediaItems[id];
    let inProduction = tvDetails ? tvDetails.in_production : true;
    let nextEpisode = tvDetails && tvDetails.next_episode_to_air ? tvDetails.next_episode_to_air.episode_number : null;
    let nextSeason = tvDetails && tvDetails.next_episode_to_air ? tvDetails.next_episode_to_air.season_number : null;
    let nextEpisodeAirDate = tvDetails && tvDetails.next_episode_to_air ? tvDetails.next_episode_to_air.air_date : null;
    let lastEpisode = tvDetails && tvDetails.last_episode_to_air ?
        tvDetails.last_episode_to_air.episode_number :
        null;
    let lastSeason = tvDetails && tvDetails.last_episode_to_air ?
        tvDetails.last_episode_to_air.season_number :
        null;
    let lastEpisodeAirDate = tvDetails && tvDetails.last_episode_to_air ?
        tvDetails.last_episode_to_air.air_date :
        null;

    let progress = await window.getTvProgress(id);

    if (!progress) {
        await window.addTvProgress(
            id,
            season,
            episode,
            inProduction,
            0,
            0,
            nextEpisode,
            nextSeason,
            nextEpisodeAirDate,
            lastSeason,
            lastEpisode,
            lastEpisodeAirDate
        );
    } else {
        await window.updateTvProgress(
            id,
            season,
            episode,
            inProduction,
            0,
            progress.totalDuration,
            nextEpisode,
            nextSeason,
            nextEpisodeAirDate,
            lastSeason,
            lastEpisode,
            lastEpisodeAirDate
        );
        if ((progress.season < progress.lastSeason) || (progress.season === progress.lastSeason && progress.episode < progress.lastEpisode)) {
            let watchBtn = document.getElementById("watchBtnCenter");
            watchBtn.style.display = "block";
        }
    }

    firstClick = true; // Reset firstClick for "Watch!" button logic
    timeCalled = false; // Reset timeCalled for watch percentage logic

    playEpisode(season, episode); // Play the clicked episode directly
}

let hasSeeked = false; // Ensure seek only happens once per session

window.addEventListener('message', async function(event) {
    if (!event.data || typeof event.data !== 'object') return;
    console.log('Received message:', event.data);

    // ✅ Handle "play" event first (to ensure video is actually playing before seeking)
    if (!hasSeeked && event.data.event === 'time') {
        const progress = mediaType === 'movie'
            ? await window.getMovieProgress(id)
            : await window.getTvProgress(id);
        
        if (progress) {
            console.log(`Seeking to stored progress: ${progress.currentTime} seconds`);
            document.getElementById("movieVideo").contentWindow.postMessage({"api":"seek","set":progress.currentTime}, "*");
            hasSeeked = true; // Prevent multiple seek attempts
        } else {
            console.log(`Seeking to start`);
            document.getElementById("movieVideo").contentWindow.postMessage({"api":"seek","set":0}, "*");
            hasSeeked = true; // Prevent multiple seek attempts
        }
    }

    // ✅ Time tracking logic
    if (
        event.data.type === 'PLAYER_EVENT' &&
        event.data.data &&
        event.data.data.event === 'timeupdate'
    ) {
        let currentTime = event.data.data.currentTime;
        let totalTime = event.data.data.duration;
        let dataEpisode = event.data.data.episode;
        let dataSeason = event.data.data.season;
        if (!currentTime || !totalTime) return;
        let fiveMinutes = 5 * 60;
        let watchedPercentage = (currentTime / totalTime) * 100;

        if (mediaType === 'movie') {
            if (currentTime >= fiveMinutes) {
                await window.addMovieProgress(id, currentTime, totalTime);
            }

            if (watchedPercentage >= 95 && watchedPercentage !== Infinity && !timeCalled) {
                timeCalled = true;  // Prevent multiple calls
                // Mark movie as watched and remove progress
                await toggleWatchedT(id, 'movie', null);
                await window.removeMovieProgress(id);
                updateButtonStates();  // Update the UI to show watched status
                
                // Refresh the movie progress UI
                if (typeof window.renderMovieProgressUI === 'function') {
                    window.renderMovieProgressUI();
                }
            }
        } else if (mediaType === 'tv') {
            let tvDetails = window.mediaItems[id];
            let progress = await window.getTvProgress(id);

            if (watchedPercentage < 95 && !progress) {
                let inProduction = tvDetails ? tvDetails.in_production : true;
                let apiNextEpisode = tvDetails?.next_episode_to_air?.episode_number;
                let apiNextSeason = tvDetails?.next_episode_to_air?.season_number;
                let apiNextEpisodeDate = tvDetails?.next_episode_to_air?.air_date;
                let lastSeason = tvDetails?.last_episode_to_air?.season_number;
                let lastEpisode = tvDetails?.last_episode_to_air?.episode_number;
                let lastEpisodeAirDate = tvDetails?.last_episode_to_air?.air_date || null;

                await window.addTvProgress(
                    id,
                    dataSeason,
                    dataEpisode,
                    inProduction,
                    currentTime,
                    totalTime,
                    apiNextEpisode,
                    apiNextSeason,
                    apiNextEpisodeDate,
                    lastSeason,
                    lastEpisode,
                    lastEpisodeAirDate
                );
                if (progress) {
                    loadSeasonEpisodes(progress.season);
                }
            } else if (watchedPercentage < 95 && progress) {
                await window.updateTvProgress(
                    id,
                    dataSeason,
                    dataEpisode,
                    progress.inProduction,
                    currentTime,
                    totalTime,
                    progress.nextEpisode,
                    progress.nextSeason,
                    progress.nextEpisodeAirDate,
                    progress.lastSeason,
                    progress.lastEpisode,
                    progress.lastEpisodeAirDate
                );
                if (progress) {
                    loadSeasonEpisodes(progress.season);
                }
            }

            if (watchedPercentage >= 95 && watchedPercentage !== Infinity && !timeCalled) {
                console.log(`%95 izlenme geçti, timeCalled=${timeCalled}`);
                firstClick = true;
                timeCalled = true;

                await advanceToNextEpisode(id, tvDetails);
                let updatedProgress = await window.getTvProgress(id);
                if (updatedProgress) {
                    loadSeasonEpisodes(updatedProgress.season);
                }
            }
        }
    }
});
