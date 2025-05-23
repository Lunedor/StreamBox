// progressui.js

async function renderAboveTabsUI() {
    if (window.currentMediaType === "movie") {
        renderMovieProgressUI();
        return;
    }

    const fixedContainer = document.getElementById("tvFixedSections");
    if (!fixedContainer) return;

    // Clear existing fixed sections
    fixedContainer.innerHTML = "";

    // Retrieve all TV progress records from Dexie
    const progressList = await window.getAllTvProgress();
    if (!progressList || progressList.length === 0) return;

    let hasContinueWatching = false;
    let hasNextEpisode = false;
    let hasWaitlist = false;

    for (const p of progressList) {
        const status = getProgressStatus(p);
        if (status === "continue") {
            hasContinueWatching = true;
        } else if (status === "next") {
            hasNextEpisode = true;
        } else if (status === "waitlist") {
            hasWaitlist = true;
        }
    }


    // Build HTML for fixed sections based on flags
    let html = "";
    if (hasContinueWatching) {
        html += `<div class="fixed-section">
               <h3>Continue Watching</h3>
               <div id="continueContainer"></div>
             </div>`;
    }
    if (hasNextEpisode) {
        html += `<div class="fixed-section">
               <h3>Next Episode</h3>
               <div id="upNextContainer"></div>
             </div>`;
    }
    if (hasWaitlist) {
        html += `<div class="fixed-section">
               <h3>Waitlist</h3>
               <div id="waitlistContainer"></div>
             </div>`;
    }

    fixedContainer.innerHTML = html;

    // Render content for each container if it exists
    if (document.getElementById("continueContainer")) {
        await renderTVProgressSection(
            document.getElementById("continueContainer"),
            filterContinueWatching,
            "continue"
        );
        enableHorizontalMouseDrag(document.getElementById("continueContainer"));
    }
    if (document.getElementById("upNextContainer")) {
        await renderTVProgressSection(
            document.getElementById("upNextContainer"),
            filterNextEpisodes,
            "next"
        );
        enableHorizontalMouseDrag(document.getElementById("upNextContainer"));
    }
    if (document.getElementById("waitlistContainer")) {
        await renderTVProgressSection(
            document.getElementById("waitlistContainer"),
            filterWaitlist,
            "waitlist"
        );
        enableHorizontalMouseDrag(document.getElementById("waitlistContainer"));
    }
}

async function resetMovieProgress(id) {
    console.log(id, typeof id);
    if (confirm("Are you sure you want to reset your watch progress for this movie? This cannot be undone.")) {
        try {
            // Convert the id to a number to ensure it matches the stored key type
            await window.removeMovieProgress(Number(id));
            alert('Movie removed.');
            renderAboveTabsUI();
        } catch (e) {
            console.error('Error resetting movie progress:', e);
            alert('Progress reset failed.');
        }
    }
}

async function renderMovieProgressUI() {
    const container = document.getElementById("movieProgressContainer");
    if (!container) return;
    container.innerHTML = ""; // Clear previous content

    const progressList = await window.getAllMovieProgress();
    if (!progressList.length) return;

    // Create fixed section for progress list
    let html = `<div class="fixed-section">
                <h3>Continue Watching</h3>
                <div id="movieProgressList"></div>
              </div>`;
    container.innerHTML = html;

    const progressListContainer = document.getElementById("movieProgressList");

    // Show loading skeletons
    const skeletonFragment = document.createDocumentFragment();
    for (let i = 0; i < Math.min(progressList.length, 5); i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'movie-progress-skeleton progress-skeleton';
        skeleton.innerHTML = `
            <div class="movie-progress-skeleton-img progress-skeleton"></div>
            <div class="movie-progress-skeleton-info">
                <div class="progress-skeleton-text progress-skeleton"></div>
                <div class="progress-skeleton-text progress-skeleton"></div>
            </div>
        `;
        skeletonFragment.appendChild(skeleton);
    }
    progressListContainer.appendChild(skeletonFragment);

    const fragment = document.createDocumentFragment();

    // Fetch all movie details in parallel
    const detailsPromises = progressList.map(progress => 
        window.fetchItemDetails("movie", progress.id)
    );
    const allDetails = await Promise.all(detailsPromises);
    
    // Clear the skeletons
    progressListContainer.innerHTML = "";

    // Create all cards at once
    progressList.forEach((progress, index) => {
        const details = allDetails[index];
        if (!details) return;
        
        const percent = (progress.currentTime / progress.totalTime) * 100;

        const card = document.createElement("div");
        card.className = "movie-progress-card";
        card.innerHTML = `
            <div class="backdrop" style="background-image: url(${window.formatImageUrl(details.backdrop_path, true)})"></div>
            <div class="movie-info">
                <h3>${details.title}</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
            <div class="progress-bottom">
                <span>${formatTime(progress.currentTime)} | ${formatTime(progress.totalTime)}</span>
                <button class="reset-progress-btn"><i class="fa-regular fa-trash-can"></i></button>
            </div>
        `;

        // Attach click events
        card.querySelector(".backdrop").addEventListener("click", () => goToDetailPage(details.id, "movie"));
        card.querySelector(".reset-progress-btn").addEventListener("click", async (event) => {
            event.stopPropagation();
            resetMovieProgress(details.id);
        });

        fragment.appendChild(card);
    });

    // Add all cards to the container in one operation
    progressListContainer.appendChild(fragment);
    enableHorizontalMouseDrag(progressListContainer);
}

function createTVProgressCard(details, progress, type) {
    const card = document.createElement("div");
	card.className = "tv-progress-card"; 
    let html = "";
    if (type === "continue") {
        const percentWatched = (progress.currentTime / progress.totalDuration) * 100;
        html = `
      <div class="tv-progress-img" style="background-image: url(${window.formatImageUrl(details.backdrop_path || details.poster_path, false)})"></div>
      <div class="tv-progress-info">
         <h4>${details.name}</h4>
         <p>S:${progress.season} | E:${progress.episode}</p>
         <div class="progress-bar">
           <div class="progress-fill" style="width: ${percentWatched}%;"></div>
         </div>
         ${progress.currentTime === 0 ? '' : `<span>${formatTime(progress.currentTime)} | ${formatTime(progress.totalDuration)}</span>`}
      </div>
    `;
        card.addEventListener("click", () => goToDetailPage(details.id, "tv"));
    } else if (type === "next") {
        const airDate = new Date(progress.nextEpisodeAirDate);
        const formattedDate = new Intl.DateTimeFormat('en-GB').format(airDate);
        html = `
      <div class="tv-progress-img" style="background-image: url(${window.formatImageUrl(details.backdrop_path || details.poster_path, false)})"></div>
      <div class="tv-progress-info">
         <h4>${details.name}</h4>
         <p>S:${progress.nextSeason} | E:${progress.nextEpisode}</p>
		 <p>${formattedDate}</p>
      </div>
    `;
        card.addEventListener("click", () => goToDetailPage(details.id, "tv"));
    } else if (type === "waitlist") {
        html = `
      <div class="tv-progress-img" style="background-image: url(${window.formatImageUrl(details.backdrop_path || details.poster_path, false)})"></div>
      <div class="tv-progress-info">
         <h4>${details.name}</h4>
         <p>Waiting for new episode...</p>
      </div>
    `;
        card.addEventListener("click", () => goToDetailPage(details.id, "tv"));
    }
    card.innerHTML = html;
    return card;
}

async function renderTVProgressSection(container, filterFn, cardType) {
    // Retrieve all TV progress records
    let progressList = await window.getAllTvProgress();
    // Apply filtering criteria
    progressList = progressList.filter(filterFn);
    // Sort by updatedAt descending
    progressList.sort((a, b) => b.updatedAt - a.updatedAt);
    // Clear the container
    container.innerHTML = "";

    // Show loading skeletons
    const skeletonFragment = document.createDocumentFragment();
    for (let i = 0; i < Math.min(progressList.length, 5); i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'progress-skeleton-card progress-skeleton';
        skeleton.innerHTML = `
            <div class="progress-skeleton-img progress-skeleton"></div>
            <div class="progress-skeleton-info">
                <div class="progress-skeleton-text progress-skeleton"></div>
                <div class="progress-skeleton-text progress-skeleton"></div>
            </div>
        `;
        skeletonFragment.appendChild(skeleton);
    }
    container.appendChild(skeletonFragment);

    // Create a document fragment for the actual content
    const fragment = document.createDocumentFragment();
    
    // First, fetch all details in parallel
    const detailsPromises = progressList.map(progress => 
        window.fetchItemDetails("tv", progress.id)
    );
    
    const allDetails = await Promise.all(detailsPromises);
    
    // Clear the skeletons
    container.innerHTML = "";
    
    // Create all cards at once
    progressList.forEach((progress, index) => {
        const details = allDetails[index];
        if (!details) return;
        
        const card = createTVProgressCard(details, progress, cardType);
        fragment.appendChild(card);
    });
    
    // Add all cards to the container in one operation
    container.appendChild(fragment);
}

// Cache for progress status results
const statusCache = new Map();

// Helper to generate cache key
function getStatusCacheKey(p) {
    return `${p.id}-${p.season}-${p.episode}-${p.lastSeason}-${p.lastEpisode}-${p.nextEpisodeAirDate}-${p.inProduction}-${p.updatedAt}`;
}

function getProgressStatus(p) {
    const cacheKey = getStatusCacheKey(p);
    
    // Return cached result if available
    if (statusCache.has(cacheKey)) {
        return statusCache.get(cacheKey);
    }
    
    let result;
    // If we don't have valid last aired info, return null
    if (p.lastSeason == null || p.lastEpisode == null) {
        result = null;
    }
    // If current progress is before or exactly at the last aired episode, return "continue"
    else if (p.season < p.lastSeason || (p.season === p.lastSeason && p.episode <= p.lastEpisode)) {
        result = "continue";
    }
    // Otherwise, if the user has watched past the aired episodes...
    else if (p.season > p.lastSeason || (p.season === p.lastSeason && p.episode > p.lastEpisode)) {
        // If there is a valid future next episode air date, return "next"
        if (p.nextEpisodeAirDate && p.nextEpisodeAirDate !== "N/A" && new Date(p.nextEpisodeAirDate) > new Date()) {
            result = "next";
        }
        // If there is no valid nextEpisodeAirDate and the show is still in production, return "waitlist"
        else if ((!p.nextEpisodeAirDate || p.nextEpisodeAirDate === "N/A") && p.inProduction) {
            result = "waitlist";
        }
    }
    
    // Set default fallback
    if (!result) {
        result = "continue";
    }
    
    // Cache the result
    statusCache.set(cacheKey, result);
    
    return result;
}

// Clear cache when it gets too large (prevent memory leaks)
function clearStatusCacheIfNeeded() {
    if (statusCache.size > 1000) {
        statusCache.clear();
    }
}

// Optimized filter functions using the cached status
function filterContinueWatching(p) {
    clearStatusCacheIfNeeded();
    return getProgressStatus(p) === "continue";
}

function filterNextEpisodes(p) {
    clearStatusCacheIfNeeded();
    return getProgressStatus(p) === "next";
}

function filterWaitlist(p) {
    clearStatusCacheIfNeeded();
    return getProgressStatus(p) === "waitlist";
}