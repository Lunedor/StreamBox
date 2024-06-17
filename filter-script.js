var currentListType = 'all'; // Default to 'all'

document.addEventListener('DOMContentLoaded', () => {
	initializeFilters();
    const params = new URLSearchParams(window.location.search);
    const listType = params.get('list'); // 'favorites' or 'watchlist'
    fetchFilteredData(1, listType);
	currentListType = listType;
	const currentPageInput = document.getElementById('currentPage');
    
    // Event when Enter key is pressed
    currentPageInput.addEventListener('keypress', function(event) {
        if (event.key === "Enter") {
            event.preventDefault();  // Prevent form submission if it's in a form
            triggerPageChange();  // Function to change the page
        }
    });

    // Event when the input loses focus
    currentPageInput.addEventListener('blur', triggerPageChange);	
});

function triggerPageChange() {
    const page = parseInt(document.getElementById('currentPage').value, 10);
    const totalPages = parseInt(document.getElementById('totalPages').textContent, 10);

    // Check if the input is a number and within the valid range
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
        fetchFilteredData(page, currentListType);
    } else {
        // Reset to last valid page if invalid input
        document.getElementById('currentPage').value = parseInt(document.getElementById('currentPage').textContent, 10);
        alert("Please enter a valid page number.");
    }
}

async function initializeFilters() {
    const genreSelect = document.getElementById('genreFilter');
    const isTV = localStorage.getItem('isTV') === 'true'; // Check if the user is browsing TV shows
    const type = isTV ? 'tv' : 'movie';
    const genreData = await fetchGeneral(null, `genre/${type}/list`);

    if (genreData && genreData.genres) {
        genreSelect.innerHTML = '<option value="">Select Genre</option>'; // Reset and add default option
        genreData.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreSelect.appendChild(option);
        });
    } else {
        console.error('Failed to load genres');
    }

    const yearSelect = document.getElementById('yearFilter');
    const endYearSelect = document.getElementById('endYearFilter');
    endYearSelect.disabled = true;

    // Populate the select elements with year options
    for (let year = new Date().getFullYear(); year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
        endYearSelect.appendChild(option.cloneNode(true));
    }

    const voteAverageSelect = document.getElementById('voteAverageFilter');
    for (let i = 0; i <= 10; i += 0.5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i.toFixed(1);
        voteAverageSelect.appendChild(option);
    }

    yearSelect.addEventListener('change', function() {
        const yearStartValue = parseInt(yearSelect.value);

        if (yearSelect.value > 0) {
            endYearSelect.disabled = false;
            // Clear existing options and add default option
            endYearSelect.innerHTML = '<option value="">Select Year</option>';
            // Populate endYearSelect options based on selected start year
            for (let year = yearStartValue; year <= new Date().getFullYear(); year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                endYearSelect.appendChild(option);
            }
            endYearSelect.value = ''; // Reset end year selection
        } else {
            endYearSelect.value = ''; // Clear end year value
            endYearSelect.disabled = true;
        }
    });
}

async function fetchFilteredData(page = 1, listType = 'all') {
    const currentPageElement = document.getElementById('currentPage');
    currentPageElement.textContent = page; // Update the current page display

    const genre = document.getElementById('genreFilter').value;
    const yearStart = document.getElementById('yearFilter').value ? parseInt(document.getElementById('yearFilter').value) : 1900;
    const yearEnd = document.getElementById('endYearFilter').value ? parseInt(document.getElementById('endYearFilter').value) : document.getElementById('yearFilter').value ? yearStart + 1 : 2050;
    const voteAverage = parseFloat(document.getElementById('voteAverageFilter').value);
    const isTV = localStorage.getItem('isTV') === 'true';
    const type = isTV ? 'tv' : 'movie';

    if (listType === 'favorites' || listType === 'watchlist' || listType === 'currentWatchingState') {
        let items = await getAllItems(listType);
        items = items.filter(item => item.type === type);

        const filteredItems = items.filter(item => {
            const matchesGenre = !genre || item.genres.includes(genreMap[genre]);
            const testDate = new Date(item.release_date || item.first_air_date).getFullYear();
            const matchesYear = testDate >= yearStart && testDate <= yearEnd - 1;
            const matchesVoteAverage = isNaN(voteAverage) || item.vote_average >= voteAverage;

            return matchesGenre && matchesYear && matchesVoteAverage;
        });

        const itemsPerPage = 20;
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        document.getElementById('totalPages').textContent = totalPages; // Update total pages based on filtered data

        if (totalItems === 0) {
            displayResults([]); // No items to display after filtering
            return;
        }

        const paginatedItems = paginateItems(filteredItems, page, itemsPerPage);
        displayResults(paginatedItems);
    } else {
        const yearParam = type === 'movie' ? 'primary_release_date' : 'first_air_date';
		const queryParams = {
			with_genres: genre,
			[`${yearParam}.gte`]: `${yearStart}-01-01`,
			[`${yearParam}.lte`]: `${yearEnd}-12-31`, // Change lte to end of year
			'vote_average.gte': voteAverage,
			'vote_count.gte': 100,
			page: page
		};

		try {
			const data = await fetchGeneral(null, `discover/${type}`, null, null, queryParams);
			if (data && data.results) {
				displayResults(data.results);
				document.getElementById('totalPages').textContent = Math.ceil(data.total_results / 20); // Update total pages from API (assuming 20 results per page)
			}
		} catch (error) {
			console.error('Failed to fetch data:', error);
		}
    }
}

function paginateItems(items, page, itemsPerPage) {
    const offset = (page - 1) * itemsPerPage;
    return items.slice(offset, offset + itemsPerPage);
}

async function displayFavoriteList() {
	if (currentListType === 'favorites') {
    const favorites = await getAllItems('favorites');
    const isTV = localStorage.getItem('isTV') === 'true';
    const filteredFavorites = favorites.filter(item => item.type === (isTV ? 'tv' : 'movie'));

    if (filteredFavorites.length === 0) {
        document.getElementById('resultsContainer').innerHTML = '<p>No items in favorites</p>';
        return;
    }

    displayResults(filteredFavorites);
	}
}

async function displayWatchlist() {
	if (currentListType === 'watchlist') {
    const watchlist = await getAllItems('watchlist');
    const isTV = localStorage.getItem('isTV') === 'true';
    const filteredWatchlist = watchlist.filter(item => item.type === (isTV ? 'tv' : 'movie'));

    if (filteredWatchlist.length === 0) {
        document.getElementById('resultsContainer').innerHTML = '<p>No items in watchlist</p>';
        return;
    }

    displayResults(filteredWatchlist);
	}
}

async function displayResults(results) {
	const favorites = await getAllItems('favorites');
    const watchlist = await getAllItems('watchlist');
	const watchingState = await getAllItems('currentWatchingState');
    const container = document.getElementById('resultsContainer');
    container.innerHTML = ''; // Clear previous results
    results.forEach(movie => {
        const isTV = localStorage.getItem('isTV') === 'true'; // Ensure we use the right type
		const itemType = isTV ? "tv" : "movie";
		const isFavorite = checkItemInList(favorites, movie.id, itemType);
		const isWatchlist = checkItemInList(watchlist, movie.id, itemType);
		const isCurrent = checkItemInList(watchingState, movie.id, itemType);
        const movieElement = document.createElement('div');
        movieElement.className = 'movie-card';
		const movieTitleOverlay = document.createElement('div');
		movieTitleOverlay.className = 'movie-title-overlay';

		const movieTitle = document.createElement('span');
		movieTitle.className = 'movie-title';
		movieTitle.textContent = movie.name ? movie.name : movie.title;

		movieTitleOverlay.appendChild(movieTitle);
		movieElement.appendChild(movieTitleOverlay);
		movieTitleOverlay.addEventListener('click', () => goToDetailPage(movie, isTV));
        
        const posterElement = document.createElement('img');
        posterElement.src = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
        posterElement.className = 'movie-poster';
        
        const detailsElement = document.createElement('div');
        detailsElement.className = 'add-to';
        // Icons for watchlist and favorites
        const iconsElement = document.createElement('div');
			detailsElement.className = 'add-to';
			detailsElement.innerHTML = `
					<span class="add-to-list watchlist ${isWatchlist ? 'added' : ''}" onclick="toggleWatchlist(${movie.id}, '${isTV ? 'tv' : 'movie'}')">
						<i class="material-icons">${isWatchlist ? 'check_circle' : 'check_circle_outline'}</i>
					</span>
					<span id="isCurrent" class="add-to-list isCurrent" style="background-color: ${isCurrent ? 'rgba(0, 0, 0, 0.6)' : 'transparent'}">
						<i class="material-icons" >${isCurrent ? 'schedule' : ''}</i>
					</span>
					<span class="add-to-list favorites ${isFavorite ? 'added' : ''}" onclick="toggleFavorite(${movie.id}, '${isTV ? 'tv' : 'movie'}')">
						<i class="material-icons">${isFavorite ? 'bookmark' : 'bookmark_border'}</i>
					</span>
			`;

			movieElement.appendChild(posterElement);
			movieElement.appendChild(detailsElement);
			movieElement.appendChild(iconsElement);
			container.appendChild(movieElement);
			const currentIcon = detailsElement.querySelector('.isCurrent');
			currentIcon.addEventListener('click', () => goToDetailPage(movie, isTV));
		});
}

function applyFilters() {
    fetchFilteredData(1, currentListType); // Resets to page 1 with new filters
    const currentPageInput = document.getElementById('currentPage');
    currentPageInput.value = 1; // Update the input field to reflect page 1
}

function nextPage() {
    const currentPageInput = document.getElementById('currentPage');
    let currentPage = parseInt(currentPageInput.value, 10);
    const totalPages = parseInt(document.getElementById('totalPages').textContent, 10);

    if (currentPage < totalPages) {
        currentPage += 1;
        currentPageInput.value = currentPage;  // Update the input field
        fetchFilteredData(currentPage, currentListType);
    }
}

function previousPage() {
    const currentPageInput = document.getElementById('currentPage');
    let currentPage = parseInt(currentPageInput.value, 10);

    if (currentPage > 1) {
        currentPage -= 1;
        currentPageInput.value = currentPage;  // Update the input field
        fetchFilteredData(currentPage, currentListType);
    }
}

function goBack() {
    window.location.href = 'index.html';
}