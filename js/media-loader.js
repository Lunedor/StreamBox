// media-loader.js - Handles loading of media content (movies and TV shows)

// Tracking variables
window.currentTvSubTab = "popular";
window.currentTvPage = 1;
window.tvData = [];
window.currentMoviesSubTab = "popular";
window.currentMoviesPage = 1;
window.moviesData = [];
window.mediaLoading = {
    movie: false,
    tv: false
};
window.seenMediaItemIds = {
    movie: new Set(),
    tv: new Set()
};
window.countScroll = 0;
window.favoritesPage = 1;
window.watchedPage = 1;
window.itemsPerPage = 20;

function getOrCreateGridContainer(container, gridId, headingText) {
    let sectionElement = container.querySelector(".section");
    if (!sectionElement) {
        container.innerHTML = "";
        sectionElement = document.createElement("div");
        sectionElement.className = "section";
        sectionElement.innerHTML = `<h1>${headingText}</h1><div class="grid-container" id="${gridId}"></div>`;
        container.appendChild(sectionElement);
    }
    let gridElement = sectionElement.querySelector(`#${gridId}`);
    if (!gridElement) {
        gridElement = document.createElement("div");
        gridElement.className = "grid-container";
        gridElement.id = gridId;
        sectionElement.appendChild(gridElement);
    } else {
        gridElement.innerHTML = "";
    }
    return gridElement;
}

async function loadMoreMedia(mediaType) {
    await window.ensureAvailableIDs();
    if (window.mediaLoading[mediaType]) {
        return;
    }
    window.mediaLoading[mediaType] = true;
    var containerId = mediaType === "movie" ? "moviesContent" : "tvContent";
    var gridId = mediaType === "movie" ? "moviesGrid" : "tvGrid";
    var currentSubTab = mediaType === "movie" ? window.currentMoviesSubTab : window.currentTvSubTab;
    var currentPage = mediaType === "movie" ? window.currentMoviesPage : window.currentTvPage;
    var dataArray = mediaType === "movie" ? window.moviesData : window.tvData;
    
    // Get genres config safely
    var genreConfig = [];
    if (window.adminConfig && window.adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"]) {
        genreConfig = window.adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"];
    } else if (typeof adminConfig !== 'undefined' && adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"]) {
        genreConfig = adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"];
        // Make it available on window for future use
        if (!window.adminConfig) window.adminConfig = adminConfig;
    } else {
        console.warn("adminConfig not found in loadMoreMedia, using popular tab only");
        // If we can't find genres, just use the popular tab
        if (currentSubTab !== "popular" && currentSubTab !== "favorites" && currentSubTab !== "watched") {
            currentSubTab = "popular";
        }
    }
    
    var fetchPopularFunc = mediaType === "movie" ? window.fetchPopular : window.fetchPopular;
    var fetchDiscoverByGenreFunc = mediaType === "movie" ? window.fetchDiscoverByGenre : window.fetchDiscoverByGenre;
    var container = document.getElementById(containerId);

    if (window.countScroll >= 5) {
        window.mediaLoading[mediaType] = false;
        // Check if the button already exists to avoid duplicates
        if (!container.querySelector('.load-more-btn')) {
            const btn = document.createElement('button');
            btn.className = 'load-more-btn';
            btn.textContent = 'Load More';
            btn.style.margin = '20px auto';
            btn.style.display = 'block';
            btn.addEventListener('click', () => {
                window.countScroll = 0; // reset the counter
                btn.remove(); // remove the button
                loadMoreMedia(mediaType);
            });
            container.appendChild(btn);
        }
        return;
    }

    if (["favorites", "watched"].includes(currentSubTab)) {
        await renderFavoritesOrWatched(mediaType, currentSubTab, container, gridId);
        return;
    }

    var grid = container.querySelector(`#${gridId}`);
    if (!grid) {
        var sectionMain = document.createElement("div");
        sectionMain.className = "section";
        var heading = "";
        if (currentSubTab === "popular") {
            heading = `Popular ${mediaType === "movie" ? "Movies" : "TV Shows"}`;
        } else {
            heading = `${currentSubTab} ${mediaType === "movie" ? "Movies" : "TV Shows"}`;
        }
        sectionMain.innerHTML = `<h1>${heading}</h1><div class="grid-container" id="${gridId}"></div>`;
        container.appendChild(sectionMain);
        grid = container.querySelector(`#${gridId}`);
    }

    // Add skeleton loaders while waiting for data
    const skeletonCount = 12; // Number of skeleton cards to show
    for (let i = 0; i < skeletonCount; i++) {
        const skeletonCard = document.createElement("div");
        skeletonCard.className = "skeleton-card";
        skeletonCard.innerHTML = `
            <div style="height: 90%;"></div>
            <div class="card-actions"></div>
        `;
        grid.appendChild(skeletonCard);
    }

    // Use a loading indicator with better styling
    let loadingIndicator = document.createElement("div");
    loadingIndicator.id = "mediaLoadingIndicator";
    loadingIndicator.className = "loading-indicator";
    loadingIndicator.innerHTML = `
        <span>Loading ${mediaType === "movie" ? "movies" : "TV shows"}...</span>
        <div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>
    `;
    container.appendChild(loadingIndicator);

    var newItems = [];
    window.countScroll += 1;
    try {
        if (currentSubTab === "popular") {
            var popResp = await fetchPopularFunc(mediaType, currentPage);
            newItems = popResp && popResp.results ? popResp.results : [];
        } else if (["continue", "upnext", "waitlist"].includes(currentSubTab) && mediaType === "tv") {
            // Special handling for TV progress tabs
        } else {
            var genreObj = genreConfig.find((g) => g.name === currentSubTab);
            if (!genreObj) {
                console.error(`Unknown ${mediaType} genre sub-tab:`, currentSubTab);
            } else {
                var discResp = await fetchDiscoverByGenreFunc(mediaType, genreObj.id, currentPage);
                newItems = discResp && discResp.results ? discResp.results : [];
            }
        }
    } catch (error) {
        console.error(`Error loading ${mediaType} content:`, error);
    } finally {
        // Remove skeleton loaders
        const skeletons = grid.querySelectorAll(".skeleton-card");
        skeletons.forEach(skeleton => skeleton.remove());
        
        // Remove loading indicator
        const indicatorElement = document.getElementById("mediaLoadingIndicator");
        if (indicatorElement && indicatorElement.parentNode === container) {
            container.removeChild(indicatorElement);
        }
    }

    if (!newItems.length) {
        window.mediaLoading[mediaType] = false;
        return;
    }

    const filteredNewItems = newItems.filter((item) => {
        if (!window.seenMediaItemIds[mediaType].has(item.id)) {
            window.seenMediaItemIds[mediaType].add(item.id);
            return true;
        } else {
            return false;
        }
    });
    newItems = filteredNewItems;

    if (!newItems.length) {
        window.mediaLoading[mediaType] = false;
        return;
    }

    if (mediaType === "movie") {
        window.moviesData = window.moviesData.concat(newItems);
    } else {
        window.tvData = window.tvData.concat(newItems);
    }

    newItems.forEach((item) => {
        var card = window.createMediaCard(item, mediaType);
        grid.appendChild(card);
    });

    if (mediaType === "movie") {
        window.currentMoviesPage++;
    } else {
        window.currentTvPage++;
    }
    window.mediaLoading[mediaType] = false;
}

async function renderTab(mediaType, tab) {
    const currentSubTabVar = mediaType === "movie" ? "currentMoviesSubTab" : "currentTvSubTab";
    const currentPageVar = mediaType === "movie" ? "currentMoviesPage" : "currentTvPage";
    const dataArrayVar = mediaType === "movie" ? "moviesData" : "tvData";
    const contentId = mediaType === "movie" ? "moviesContent" : "tvContent";

    // Set global state for active tab and reset pagination
    window[currentSubTabVar] = tab;
    window[currentPageVar] = 1;
    window[dataArrayVar] = [];
    window.seenMediaItemIds[mediaType].clear();

    const container = document.getElementById(contentId);
    container.innerHTML = "";
    container.scrollTop = 0;

    if (["favorites", "watched"].includes(tab)) {
        // Reset local pagination counters for favorites/watched
        if (tab === "favorites") {
            window.favoritesPage = 1;
        } else {
            window.watchedPage = 1;
        }
        const gridId = mediaType === "movie" ? "moviesGrid" : "tvGrid";
        // Render the first chunk of favorites/watched items
        await renderFavoritesChunk(mediaType, tab, container, gridId, 1);
        // Set up infinite scrolling for this container
        setupFavoritesScroll(mediaType, tab);
        window.mediaLoading[mediaType] = false;
        return;
    } else {
        // For other tabs, load media normally
        await loadMoreMedia(mediaType);
    }
}

async function renderFavoritesOrWatched(mediaType, subTab, container, gridId) {
    await window.reloadFavoritesAndWatched();
    const items = (subTab === "favorites" ? window.favorites : window.watched)
        .filter(item => item.type === mediaType);
    const heading = `${subTab === "favorites" ? "Favorite" : "Watched"} ${mediaType === "movie" ? "Movies" : "TV Shows"}`;
    const gridElement = getOrCreateGridContainer(container, gridId, heading);
    items.forEach(item => {
        const card = window.createMediaCard(item, mediaType);
        gridElement.appendChild(card);
    });
}

async function renderFavoritesChunk(mediaType, subTab, container, gridId, page) {
    // Ensure favorites/watched data is up-to-date.
    await window.reloadFavoritesAndWatched();
    const allItems = (subTab === "favorites" ? window.favorites : window.watched)
        .filter(item => item.type === mediaType);

    // Calculate start and end index for pagination
    const startIndex = (page - 1) * window.itemsPerPage;
    const endIndex = startIndex + window.itemsPerPage;
    const chunk = allItems.slice(startIndex, endIndex);

    // Get or create the grid container
    const heading = `${subTab === "favorites" ? "Favorite" : "Watched"} ${mediaType === "movie" ? "Movies" : "TV Shows"}`;
    const gridElement = getOrCreateGridContainer(container, gridId, heading);

    // Append each item as a media card
    chunk.forEach(item => {
        const card = window.createMediaCard(item, mediaType);
        gridElement.appendChild(card);
    });

    return chunk.length; // Return number of items loaded
}

function setupFavoritesScroll(mediaType, subTab) {
    // Select the container based on mediaType ("moviesContent" or "tvContent")
    const containerId = mediaType === "movie" ? "moviesContent" : "tvContent";
    const gridId = mediaType === "movie" ? "moviesGrid" : "tvGrid";
    const container = document.getElementById(containerId);

    // Remove any previous scroll listener if needed
    container.onscroll = null;

    container.addEventListener('scroll', throttle(async () => {
        // Check if user has scrolled near the bottom of the container
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
            // Determine which page to load next
            let currentPage = subTab === "favorites" ? window.favoritesPage : window.watchedPage;
            const loadedCount = await renderFavoritesChunk(mediaType, subTab, container, gridId, currentPage + 1);

            // If we loaded items, increment page count; otherwise, you reached the end.
            if (loadedCount > 0) {
                if (subTab === "favorites") {
                    window.favoritesPage++;
                } else {
                    window.watchedPage++;
                }
            }
        }
    }, 200));
}

function throttle(fn, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            fn(...args);
        }
    };
}

function initSubTabs(mediaType) {
    const st = document.getElementById(mediaType === "movie" ? "moviesSubTabs" : "tvSubTabs");
    if (!st) return; // Exit if tab container doesn't exist
    
    let html =
        '<button class="sub-tab-btn active" data-tab="popular"><i class="fa-duotone fa-solid fa-star" style="color:yellow;"></i><p>Popular</p></button>' +
        '<button class="sub-tab-btn" data-tab="favorites"><i class="fas fa-heart" style="color:#e50914;"></i><p>Favorites</p></button>' +
        '<button class="sub-tab-btn" data-tab="watched"><i class="fas fa-eye" style="color:#0f0;"></i><p>Watched</p></button>';

    // Get genres safely - check if adminConfig exists in both window and global scope
    let genres = [];
    if (window.adminConfig && window.adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"]) {
        genres = window.adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"];
    } else if (typeof adminConfig !== 'undefined' && adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"]) {
        // Try to use the global variable directly if it exists
        genres = adminConfig[mediaType === "movie" ? "movieGenres" : "tvGenres"];
        // Also make it available on window for future use
        if (!window.adminConfig) window.adminConfig = adminConfig;
    } else {
        console.warn("adminConfig not found, using fallback genres");
        // Fallback genres if adminConfig isn't available
        if (mediaType === "movie") {
            genres = [
                { name: "Action", id: 28 },
                { name: "Comedy", id: 35 },
                { name: "Drama", id: 18 }
            ];
        } else {
            genres = [
                { name: "Action & Adventure", id: 10759 },
                { name: "Comedy", id: 35 },
                { name: "Drama", id: 18 }
            ];
        }
    }

    genres.forEach(function(g) {
        const encodedGenreName = g.name === "Action & Adventure" ? encodeURIComponent("action	") : g.name === "Mistery" ? encodeURIComponent("detective") : g.name === "Romance" ? encodeURIComponent("novel--v1") : (g.name === "War" || g.name === "War & Politics") ? encodeURIComponent("cannon") : (g.name === "Science Fiction" || g.name === "Sci-Fi & Fantasy") ? encodeURIComponent("sci-fi") : encodeURIComponent(g.name).toLowerCase(); // URL için güvenli hale getir
        let logoUrl = "https://img.icons8.com/glyph-neue/64/"
        html += `<button class="sub-tab-btn" data-tab="${g.name}">
		<img width="40" height="40" src="${logoUrl}${encodedGenreName}.png" alt="${g.name} title="${g.name}"/>
		<p>${g.name}</p>
	  </button>`;
    });

    st.innerHTML = html;
    renderTab(mediaType, "popular");
    loadMoreMedia(mediaType);
    st.querySelectorAll(".sub-tab-btn").forEach(function(b) {
        b.onclick = function() {
            // Reset scroll counter and pagination
            window.countScroll = 0;
            window.favoritesPage = 1;
            window.watchedPage = 1;
            st.querySelectorAll(".sub-tab-btn").forEach((x) => x.classList.remove("active"));
            this.classList.add("active");
            var tab = this.getAttribute("data-tab");
            renderTab(mediaType, tab);

            // If the selected tab is favorites or watched, set up infinite scroll on that container.
            if (tab === "favorites" || tab === "watched") {
                setupFavoritesScroll(mediaType, tab);
            }
        };
    });
    // Render the fixed sections above tabs
    if (typeof window.renderAboveTabsUI === "function") {
        window.renderAboveTabsUI();
    }
}

// Setup infinite scroll for main page
function setupInfiniteScroll() {
    window.addEventListener('scroll', throttle(() => {
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 50)) {
            if (window.currentMediaType === "movie") {
                loadMoreMedia("movie");
            } else {
                loadMoreMedia("tv");
            }
        }
    }, 50));
}

// Setup filter button
function setupFilterButton() {
    const filterButton = document.getElementById("filterBtn");
    if (filterButton) {
        filterButton.addEventListener("click", function() {
            window.location.href = 'filter.html';
        });
    }
}

// Export functions to be used by other modules
window.loadMoreMedia = loadMoreMedia;
window.renderTab = renderTab;
window.renderFavoritesOrWatched = renderFavoritesOrWatched;
window.renderFavoritesChunk = renderFavoritesChunk;
window.setupFavoritesScroll = setupFavoritesScroll;
window.initSubTabs = initSubTabs;
window.setupInfiniteScroll = setupInfiniteScroll;
window.setupFilterButton = setupFilterButton;
window.throttle = throttle;