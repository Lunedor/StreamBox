const apiKey = 'YOUR-API-KEY';
window.vidSource = { type: 'me', base: 'https://vidsrc.me' };
let enterTimeout;
let debounceTimeout;
const genreMap = {
    10759: "Action & Adventure",
    28: "Action",
    12: "Adventure", 
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    10762: "Kids",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10763: "News",
    10764: "Reality",
    10749: "Romance",
    878: "Science Fiction",
    10765: "Sci-Fi & Fantasy",
    10766: "Soap",
    10767: "Talk",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    10768: "War & Politics",
    37: "Western"
};

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function formatDate(dateString) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [year, month, day] = dateString.split('-');
  const monthName = months[parseInt(month) - 1];

  return `${day} ${monthName} ${year}`;
}

function mouseDrag() {
    let isDragging = false; // Add this flag
    let dragStartX, dragStartY; // Variables to store initial positions

    document.addEventListener('mousedown', function(event) {
        let target = event.target;

        // Only proceed if the target is an img element
        if (target.tagName === 'IMG' || target.className === 'movie-backdrop' || target.className === 'movie-title-overlay' || target.className === 'movie-title') {
            // Prevent default drag behavior on images.
            target.addEventListener('dragstart', function(e) {
                e.preventDefault();
            });

            // Find the nearest scrollable ancestor.
            while (target != null && !(target.scrollHeight > target.clientHeight || target.scrollWidth > target.clientWidth)) {
                target = target.parentElement;  // Move up in the DOM tree
            }

            if (target) {
                isDragging = false;
                dragStartX = event.pageX;
                dragStartY = event.pageY;
                let startPos = target.scrollWidth > target.clientWidth ? event.pageX : event.pageY;
                let scrollStartPos = target.scrollWidth > target.clientWidth ? target.scrollLeft : target.scrollTop;
                target.style.cursor = 'grabbing';
                target.style.userSelect = 'none';

                function onMouseMove(moveEvent) {
                    if (!isDragging && (Math.abs(moveEvent.pageX - dragStartX) > 5 || Math.abs(moveEvent.pageY - dragStartY) > 5)) {
                        isDragging = true; // Set the flag if the mouse has moved enough to be considered a drag
                    }
                    if (!isDragging) return;
                    const currentPos = target.scrollWidth > target.clientWidth ? moveEvent.pageX : moveEvent.pageY;
                    const diff = startPos - currentPos;
                    if (target.scrollWidth > target.clientWidth) {
                        target.scrollLeft = scrollStartPos + diff;
                    } else {
                        target.scrollTop = scrollStartPos + diff;
                    }
                }

                function onMouseUp() {
                    target.style.cursor = '';
                    target.style.userSelect = '';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        }
    });

    document.addEventListener('click', function(event) {
        if (isDragging) {
            event.stopPropagation(); // Prevent the click event if it was a drag
            event.preventDefault();  // Prevent default action of the click event
            isDragging = false; // Reset the flag
        }
    }, true); 
}

async function fetchGeneral(id, type, section = null, sectionNumber = null, queryParams = {}) {
    let url = `https://api.themoviedb.org/3`;

	if (type) {
        url += `/${type}`;
    }
	
	if (id) {
        url += `/${id}`;
    }
	
    if (section) {
        url += `/${section}`;
        if (sectionNumber) {
            url += `/${sectionNumber}`;
        }
    }

    // Add the API key to the query parameters
    queryParams.api_key = apiKey;

    // Construct the query string
    const queryString = new URLSearchParams(queryParams).toString();
    url += `?${queryString}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch item details:', error);
        return null;
    }
}

async function fetchItemDetails(id, type) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`);
        const data = await response.json();

        const itemData = {
            id: data.id,
            type: type,
            title: type === 'tv' ? data.name : data.title,
            overview: data.overview,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            vote_average: data.vote_average,
            release_date: data.release_date || data.first_air_date,
            genres: data.genres.map(genre => genre.name),
			timestamp: Date.now(),
        };

        return itemData;
    } catch (error) {
        console.error('Failed to fetch item details:', error);
        return null;
    }
}

async function checkIfFavorite(id, type) {
    const favorites = await getAllItems('favorites');
    return favorites.some(item => item.id === id && item.type === type);
}

async function checkIfWatchlist(id, type) {
    const watchlist = await getAllItems('watchlist');
    return watchlist.some(item => item.id === id && item.type === type);
}

async function toggleFavorite(id, type) {
    const isFavorite = await getItem('favorites', id);

    if (isFavorite) {
        await deleteItem('favorites', id);
    } else {
        const itemData = await fetchItemDetails(id, type);
        if (itemData) {
            await addItem('favorites', itemData);
        }
    }

    updateFavoriteIcon(id, type);
	displayFavoriteList();
}

async function toggleWatchlist(id, type) {
    const isWatchlist = await getItem('watchlist', id);

    if (isWatchlist) {
        await deleteItem('watchlist', id);
    } else {
        const itemData = await fetchItemDetails(id, type);
        if (itemData) {
            await addItem('watchlist', itemData);
        }
    }

    updateWatchlistIcon(id, type);
	displayWatchlist();
}

async function updateFavoriteIcon(id, type) {
    const favoriteButtons = document.querySelectorAll(`span[onclick^="toggleFavorite(${id}, '${type}')"] i`);
    const isFavorite = await checkIfFavorite(id, type);
    favoriteButtons.forEach(button => {
        if (isFavorite) {
            button.innerText = 'bookmark';
            button.parentElement.classList.add('added');
        } else {
            button.innerText = 'bookmark_border';
            button.parentElement.classList.remove('added');
        }
    });
}

async function updateWatchlistIcon(id, type) {
    const watchlistButtons = document.querySelectorAll(`span[onclick^="toggleWatchlist(${id}, '${type}')"] i`);
    const isWatchlist = await checkIfWatchlist(id, type);
    watchlistButtons.forEach(button => {
        if (isWatchlist) {
            button.innerText = 'check_circle';
            button.parentElement.classList.add('added');
        } else {
            button.innerText = 'check_circle_outline';
            button.parentElement.classList.remove('added');
        }
    });
}

async function resetProgress(tvId) {
    await deleteItem('currentWatchingState', tvId);
    updateEpisodeVisuals(tvId);
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mediaDatabase', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('favorites', { keyPath: 'id' });
            db.createObjectStore('watchlist', { keyPath: 'id' });
            db.createObjectStore('currentWatchingState', { keyPath: 'id' });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function getObjectStore(storeName, mode) {
    return openDatabase().then((db) => {
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    });
}

function addItem(storeName, item) {
    return getObjectStore(storeName, 'readwrite').then((store) => {
        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    });
}

function updateItem(storeName, item) {
    return getObjectStore(storeName, 'readwrite').then((store) => {
        return new Promise((resolve, reject) => {
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    });
}

function getItem(storeName, key) {
    return getObjectStore(storeName, 'readonly').then((store) => {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    });
}

function getAllItems(storeName) {
    return getObjectStore(storeName, 'readonly').then((store) => {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    });
}

function deleteItem(storeName, key) {
    return getObjectStore(storeName, 'readwrite').then((store) => {
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    });
}

function checkItemInList(list, itemId, itemType) {
    return list.some(item => item.id === itemId && item.type === itemType);
}

function goToDetailPage(item, isTV) {
    const id = item.id;
    localStorage.setItem('detailIsTV', isTV);
    window.location.href = `detail.html?id=${id}`;
}

function goBack() {
    window.location.href = 'index.html';
}

function goToFilterPage() {
    window.location.href = 'items.html';
}