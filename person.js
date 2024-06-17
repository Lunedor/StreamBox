document.addEventListener('DOMContentLoaded', async () => {
    const person = JSON.parse(localStorage.getItem('personDetail'));
    const personContent = document.getElementById('personContent');
    const personMovies = document.getElementById('personMovies');
    const role = localStorage.getItem('personRole');
    const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
	const watchingState = await getAllItems('currentWatchingState');
	const dropdown = document.getElementById('dropdown');
    initializeDropdown();

    dropdown.addEventListener('change', function() {
        updateVidSource(this.value);
        localStorage.setItem('vidSourceType', this.value);
        updateListUrls(); // Update URLs when dropdown changes
    });
	
	mouseDrag();

    if (person && personContent) {
        const data = await fetchGeneral(person.id, 'person', null, null, { append_to_response: 'movie_credits,tv_credits' });
		if(data) {
                const profilePath = data.profile_path ? `https://image.tmdb.org/t/p/w300${data.profile_path}` : 'https://via.placeholder.com/150';
                const name = data.name;
                const biography = data.biography || 'Biography not available.';
                personContent.innerHTML = `
                    <img src="${profilePath}" alt="${name}">
                    <h2>${name}</h2>
                    <p>${biography}</p>
                `;

                // Filter knownFor based on vote_count and initialize a Set to track IDs
                const knownForIds = new Set();
                const knownFor = role === 'cast' ? [...data.movie_credits.cast, ...data.tv_credits.cast] : [...data.movie_credits.crew, ...data.tv_credits.crew];
                knownFor.filter(item => item.vote_count > 100);

                personMovies.innerHTML = ''; // Clear existing content

                knownFor.forEach(item => {
                    const itemId = item.id;  // Unique identifier for movie or TV show
                    if (!knownForIds.has(itemId)) {
                        knownForIds.add(itemId);
                        const isTV = item.first_air_date ? true : false;
						const itemType = isTV ? "tv" : "movie";
                        const isFavorite = checkItemInList(favorites, itemId, itemType);
						const isWatchlist = checkItemInList(watchlist, itemId, itemType);
						const isCurrent = checkItemInList(watchingState, itemId, itemType);

                        const movieElement = document.createElement('div');
                        movieElement.className = 'movie-card';
						const movieTitleOverlay = document.createElement('div');
						movieTitleOverlay.className = 'movie-title-overlay';

						const movieTitle = document.createElement('span');
						movieTitle.className = 'movie-title';
						movieTitle.textContent = item.name ? item.name : item.title;

						movieTitleOverlay.appendChild(movieTitle);
						movieElement.appendChild(movieTitleOverlay);
						movieTitleOverlay.addEventListener('click', () => goToDetailPage(item, isTV));

                        const posterElement = document.createElement('img');
                        posterElement.src = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/200x300';
                        posterElement.alt = `${item.title || item.name} Poster`;
                        posterElement.addEventListener('click', () => {
                            goToDetailPage(item, isTV);
                        });

                        const detailsElement = document.createElement('div');
                        detailsElement.className = 'add-to';
                        detailsElement.innerHTML = `
                                <span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                                    <i class="material-icons">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
                                </span>
								<span id="isCurrent" class="add-to-list isCurrent" style="background-color: ${isCurrent ? 'rgba(0, 0, 0, 0.6)' : 'transparent'}">
									<i class="material-icons" style="margin: 3px;">${isCurrent ? 'schedule' : ''}</i>
								</span>
                                <span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${item.id}, '${isTV ? 'tv' : 'movie'}')">
                                    <i class="material-icons">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
                                </span>
                        `;

                        movieElement.appendChild(posterElement);
                        movieElement.appendChild(detailsElement);
                        personMovies.appendChild(movieElement);
						const currentIcon = detailsElement.querySelector('.isCurrent');
						currentIcon.addEventListener('click', () => goToDetailPage(item, isTV));
                    }
                });
		}
	}
});

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

function goBack() {
    window.location.href = 'index.html';
}

function displayFavoriteList() {
	null;
}

function displayWatchlist() {
	null;
}