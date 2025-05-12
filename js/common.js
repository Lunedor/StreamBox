// common.js
let adminConfig = {
    movieGenres: [{
            name: "Action",
            id: 28
        },
        {
            name: "Animation",
            id: 16
        },
        {
            name: "Crime",
            id: 80
        },
        {
            name: "Drama",
            id: 18
        },
        {
            name: "Science Fiction",
            id: 878
        },
        {
            name: "Fantasy",
            id: 14
        },
        {
            name: "Comedy",
            id: 35
        },
        {
            name: "Documentary",
            id: 99
        },
        {
            name: "Romance",
            id: 10749
        },
        {
            name: "Family",
            id: 10751
        },
        {
            name: "Horror",
            id: 27
        },
        {
            name: "Thriller",
            id: 53
        },
        {
            name: "War",
            id: 10752
        },
        {
            name: "Western",
            id: 37
        }
    ],
    tvGenres: [{
            name: "Action & Adventure",
            id: 10759
        },
        {
            name: "Animation",
            id: 16
        },
        {
            name: "Crime",
            id: 80
        },
        {
            name: "Drama",
            id: 18
        },
        {
            name: "Sci-Fi & Fantasy",
            id: 10765
        },
        {
            name: "Comedy",
            id: 35
        },
        {
            name: "Documentary",
            id: 99
        },
        {
            name: "Family",
            id: 10751
        },
        {
            name: "Mistery",
            id: 9648
        },
        {
            name: "War & Politics",
            id: 10768
        },
    ]
};

// Explicitly attach adminConfig to window object for global access
window.adminConfig = adminConfig;

// Globals:
window.mediaItems = {};
window.favorites = [];
window.watched = [];

function formatTime(seconds) {
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = Math.floor(seconds % 60);
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

// Debounce Utility Function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function enableHorizontalMouseDrag(container) {
    let isDown = false;
    let startX;
    let scrollLeft;
    let dragOccurred = false; // Flag to track drag

    container.addEventListener('mousedown', (e) => {
        isDown = true;
        dragOccurred = false; // Reset on mousedown
        container.classList.add('active-drag');
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.classList.remove('active-drag');
    });

    container.addEventListener('mouseup', () => {
        isDown = false;
        container.classList.remove('active-drag');
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault(); // Prevent text selection
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX); // Adjust scroll speed
        container.scrollLeft = scrollLeft - walk;
        dragOccurred = true; // Dragging is happening!
    });

    // Prevent click IFF dragging occurred
    container.addEventListener('click', (e) => {
        if (dragOccurred) {
            e.stopPropagation(); // VERY IMPORTANT: Stop bubbling
        }
    }, true); // Use Capture Phase!
}

// Favori/Watched:
async function reloadFavoritesAndWatched() {
    window.favorites = await window.getFavorites();
    window.watched = await window.getWatched();
}

window.isFavorited = function(id, type) {
    return window.favorites.some(f => f.id == id && f.type === type);
};

window.isWatched = function(id, type) {
    return window.watched.some(w => w.id == id && w.type === type);
};

async function toggleFavorite(id, type, cardEl) {
    let already = isFavorited(id, type);
    if (already) {
        await window.removeFavorite(id, type);
    } else {
        // If item is marked as watched, remove it from watched before adding to favorites
        if (window.isWatched(id, type)) {
            await window.removeWatched(id, type);
        }
        let item = window.mediaItems[id];
        if (item) {
            await window.addFavorite(item);
        }
    }
    await reloadFavoritesAndWatched();
    if (cardEl) updateCardIcons(id, type, cardEl);
    if (window.currentTvSubTab === "favorites" || window.currentMoviesSubTab === "favorites") {
        renderTab(type, "favorites");
    }
}

async function toggleWatched(id, type, cardEl) {
    let already = isWatched(id, type);
    if (already) {
        await window.removeWatched(id, type);
    } else {
        // If item is in favorites, remove it from favorites before marking as watched
        if (window.isFavorited(id, type)) {
            await window.removeFavorite(id, type);
        }
        let item = window.mediaItems[id];
        if (item) {
            await window.addWatched(item);
        }
    }
    await reloadFavoritesAndWatched();
    if (cardEl) updateCardIcons(id, type, cardEl);
    if (window.currentTvSubTab === "watched" || window.currentMoviesSubTab === "watched") {
        renderTab(type, "watched");
    }
}

// Icon Update:
async function updateCardIcons(id, type, cardEl) {
    if (!cardEl) return;

    let favBtn = cardEl.querySelector(".fav-btn");
    let watBtn = cardEl.querySelector(".watched-btn");

    if (window.isFavorited(id, type)) {
        favBtn.innerHTML = '<i class="fas fa-heart favorite-icon"></i>';
    } else {
        favBtn.innerHTML = '<i class="far fa-heart"></i>';
    }

    if (window.isWatched(id, type)) {
        watBtn.innerHTML = '<i class="fas fa-eye watched-icon"></i>';
    } else {
        watBtn.innerHTML = '<i class="far fa-eye"></i>';
    }

    // ✅ **Check if the TV show is in progress and add the Watching Icon**
    if (type === "tv") {
        let isWatching = await window.getTvProgress(id);
        let existingWatchingIcon = cardEl.querySelector(".watching-icon");

        if (isWatching) {
            if (!existingWatchingIcon) {
                let watchingIcon = document.createElement("div");
                watchingIcon.className = "watching-icon";
                watchingIcon.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>Watching';
                cardEl.appendChild(watchingIcon);
            }
        } else {
            if (existingWatchingIcon) {
                existingWatchingIcon.remove();
            }
        }
    }
}


// Global Sets to store available movie and TV show IDs
window.availableMovieIDs = new Set();
window.availableTVIDs = new Set();

// Function to fetch and cache available IDs
async function fetchAvailableIDs() {
    try {
        // Fetch movie IDs
        const movieResponse = await fetch('https://vidsrc.me/ids/mov_tmdb.txt');
        const movieText = await movieResponse.text();
        window.availableMovieIDs = new Set(movieText.trim().split('\n').map(id => parseInt(id)));

        // Fetch TV show IDs
        const tvResponse = await fetch('https://vidsrc.me/ids/tv_tmdb.txt');
        const tvText = await tvResponse.text();
        window.availableTVIDs = new Set(tvText.trim().split('\n').map(id => parseInt(id)));

        // Fetch episode IDs with correct format
        const epsResponse = await fetch('https://vidsrc.me/ids/eps_tmdb.txt');
        const epsText = await epsResponse.text();
        window.availableEpisodeIDs = new Set(epsText.trim().split('\n'));

    } catch (error) {
        console.error('Error fetching available IDs:', error);
    }
}

async function ensureAvailableIDs() {
    if (!window.availableMovieIDs || window.availableMovieIDs.size === 0 ||
        !window.availableTVIDs || window.availableTVIDs.size === 0) {
        await fetchAvailableIDs();
    }
}

// Refresh available IDs every hour
setInterval(fetchAvailableIDs, 60 * 60 * 1000);

// Modify createMediaCard to include available icon
function createMediaCard(item, type) {
    window.mediaItems[item.id] = item;
    item.type = type;

    let title = item.name ? item.name : item.title ? item.title : "Unknown";
    let rating = typeof item.vote_average === 'number' ? item.vote_average.toFixed(1) : "0";
    let year = item.release_date ? new Date(item.release_date).getFullYear() : item.first_air_date ? new Date(item.first_air_date).getFullYear() : "N/A";

    let card = document.createElement("div");
    card.className = "media-card";
    card.setAttribute("data-id", item.id);
    card.setAttribute("data-type", type);

    // Use data-src instead of src for lazy loading
    card.innerHTML = `
    <img data-src="${window.formatImageUrl(item.poster_path, false)}" alt="${title}" class="lazy-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%23303030'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='26px' fill='%23505050'%3ELoading...%3C/text%3E%3C/svg%3E">
    <div class="card-actions">
      <button class="fav-btn" aria-label="Favorite"></button>
      <button class="watched-btn" aria-label="Watched"></button>
    </div>
  `;

    let titleOverlay = document.createElement("div");
    titleOverlay.className = "media-title-overlay";
    let titleElement = document.createElement("span");
    titleElement.className = "movie-title";
    titleElement.textContent = title;
    let ratingContainer = document.createElement("div");
    ratingContainer.className = "rating-container";
    let yearElement = document.createElement("span");
    yearElement.className = "movie-year";
    yearElement.textContent = year;
    let starsContainer = document.createElement("div");
    starsContainer.className = "rating-stars";
    starsContainer.innerHTML = getStarRating(item.vote_average / 2);
    let ratingText = document.createElement("div");
    ratingText.className = "rating-text";
    ratingText.textContent = rating;
    ratingContainer.appendChild(yearElement);
    ratingContainer.appendChild(starsContainer);
    ratingContainer.appendChild(ratingText);
    titleOverlay.appendChild(titleElement);
    titleOverlay.appendChild(ratingContainer);
    card.appendChild(titleOverlay);
    titleOverlay.addEventListener("click", () => goToDetailPage(item.id, type));
    updateCardIcons(item.id, type, card);

    let favBtn = card.querySelector(".fav-btn");
    let watBtn = card.querySelector(".watched-btn");

    favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(item.id, type, card);
    };
    watBtn.onclick = (e) => {
        e.stopPropagation();
        toggleWatched(item.id, type, card);
    };

    let isAvailable = (type === 'movie' && window.availableMovieIDs.has(item.id)) ||
        (type === 'tv' && window.availableTVIDs.has(item.id));
    if (isAvailable) {
        let availableIcon = document.createElement("div");
        availableIcon.className = "available-icon";
        availableIcon.innerHTML = '<i class="fas fa-play-circle"></i>Available';
        card.appendChild(availableIcon);
    }

    // 3D tilt and shadow effects
    card.addEventListener("mousemove", handleCardMouseMove);
    card.addEventListener("mouseleave", handleCardMouseLeave);

    // Call lazyLoadImages to handle any new images added to the DOM
    setTimeout(lazyLoadImages, 10);

    return card;
}

// Add CSS for available-icon
document.addEventListener("DOMContentLoaded", function() {
    const style = document.createElement('style');
    style.textContent = `
    .available-icon {
      z-index: 10;
	  filter: drop-shadow(2px 4px 6px black);
    }
  `;
    document.head.appendChild(style);
});

function handleCardMouseMove(e) {
    const card = e.currentTarget;

    if (e.target.closest('.card-actions')) {
        card.style.transform = "perspective(500px) rotateX(0deg) rotateY(0deg) scale(1)";
        card.style.boxShadow = "none";
        return;
    }

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 10; // maximum tilt (degree)
    const tiltY = ((x - centerX) / centerX) * maxTilt;
    const tiltX = -((y - centerY) / centerY) * maxTilt;

    card.style.transform = `perspective(500px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.04)`;

    const shadowX = -tiltY;
    const shadowY = -tiltX;
    card.style.boxShadow = `${shadowX}px ${shadowY}px 20px rgba(0, 0, 0, 0.4)`;
}

function handleCardMouseLeave(e) {
    const card = e.currentTarget;
    card.style.transform = "perspective(500px) rotateX(0deg) rotateY(0deg) scale(1)";
    card.style.boxShadow = "none";
}

function getStarRating(rating) {
    rating = Math.max(0, Math.min(rating, 5));
    let fullStars = Math.floor(rating);
    let decimalPart = rating - fullStars;
    let hasHalfStar = decimalPart >= 0.5;
    let emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    let starsHtml = "";
    for (let index = 0; index < fullStars; index++) starsHtml += '<i class="fa-duotone fa-solid fa-star"></i>';
    if (hasHalfStar) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
    for (let index = 0; index < emptyStars; index++) starsHtml += '<i class="fa-duotone fa-regular fa-star"></i>';
    return starsHtml;
}

// Function to navigate to the details page
function goToDetailPage(itemId, type) {
    window.location.href = `details.html?id=${itemId}&type=${type}`;
}

// Function to navigate to the person page
function goPersonPage(personId) {
    window.location.href = `person.html?id=${personId}`;
}

// When the user scrolls down 20px from the top of the document, show the button
window.addEventListener("scroll", function() {
    let goTopBtn = document.getElementById("goTopBtn");
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        goTopBtn.style.display = "block";
    } else {
        goTopBtn.style.display = "none";
    }
});

// When the user clicks on the button, scroll to the top of the document
document.getElementById("goTopBtn").addEventListener("click", function() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
// Check saved theme in localStorage on page load
let isDarkTheme = localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme'); // Default to dark

// Make sure isDarkTheme is available globally
window.isDarkTheme = isDarkTheme;

const themeToggleBtn = document.getElementById("themeToggleBtn");

// Function to Apply Theme
function applyTheme(darkTheme) {
    // Update the global state whenever theme is applied
    window.isDarkTheme = darkTheme;
    
    document.documentElement.style.setProperty('--background-color', darkTheme ? '#1b1b1b' : '#e7e8e8');
    document.documentElement.style.setProperty('--text-color', darkTheme ? '#e0e0e0' : '#222');
    document.documentElement.style.setProperty('--hover-color', darkTheme ? 'crimson' : 'crimson');
    document.documentElement.style.setProperty('--border-color', darkTheme ? '#333' : '#d1d9e6');
    document.documentElement.style.setProperty('--accent-color', darkTheme ? '#888888' : '#888888');
    document.documentElement.style.setProperty('--button-color', darkTheme ? '#ccc' : '#333');
    document.documentElement.style.setProperty('--img-filter', darkTheme ? 'invert(0.8)' : 'invert(0)');
    document.documentElement.style.setProperty('--logo-filter', darkTheme ? 'invert(0)' : 'invert(1)');
    document.documentElement.style.setProperty('--scrollbar-thumb', darkTheme ? '#606060' : '#ddd');
    document.documentElement.style.setProperty('--scrollbar-track', darkTheme ? '#202020' : '#bbb');
    themeToggleBtn ? themeToggleBtn.textContent = darkTheme ? "Switch to Light Theme" : "Switch to Dark Theme" : "";
}

// Ensure applyTheme is accessible globally
window.applyTheme = applyTheme;

// Apply the theme immediately
applyTheme(isDarkTheme);

// Lazy loading for images
function lazyLoadImages() {
  // Use Intersection Observer to detect when images enter the viewport
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          // Add fade-in effect
          img.classList.add('fade-in');
        }
        // Once loaded, stop observing this image
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '200px 0px' // Start loading images when they're 200px from entering the viewport
  });

  // Find all images that have data-src attribute and observe them
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// Call lazyLoadImages after DOM is loaded and whenever new content is added
document.addEventListener('DOMContentLoaded', lazyLoadImages);

// Keyboard navigation support
document.addEventListener('keydown', function(event) {
  // Only handle keyboard events if no input is focused
  if (document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA') {
    return;
  }

  switch(event.key) {
    case 'ArrowLeft':
      // Use the same handler as carousel prev button
      const carouselPrev = document.getElementById('carouselPrev');
      if (carouselPrev && carouselPrev.onclick) {
        carouselPrev.onclick();
      }
      break;
    
    case 'ArrowRight':
      // Use the same handler as carousel next button
      const carouselNext = document.getElementById('carouselNext');
      if (carouselNext && carouselNext.onclick) {
        carouselNext.onclick();
      }
      break;
    
    case 'm':
      // Switch to Movies tab
      document.querySelector('.toggle-btn[data-type="movie"]').click();
      break;
    
    case 't':
      // Switch to TV Shows tab
      document.querySelector('.toggle-btn[data-type="tv"]').click();
      break;
    
    case 'Escape':
      // Close any open modal
      const modals = document.querySelectorAll('.random-item-modal, .modal.open');
      modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) closeBtn.click();
      });
      
      // Also close the hamburger menu if it's open
      if (hamburgerDropdown.classList.contains('open')) {
        hamburgerDropdown.classList.remove('open');
      }
      break;
    
    case '/':
      // Focus search input
      event.preventDefault();
      document.getElementById('searchInput').focus();
      break;
    
    case 'Home':
      // Scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      break;
  }
});

// Add tooltip to help users discover keyboard shortcuts
function createKeyboardShortcutsHelp() {
  const helpBtn = document.createElement('button');
  helpBtn.innerHTML = '<i class="fas fa-keyboard"></i>';
  helpBtn.className = 'keyboard-help-btn';
  helpBtn.setAttribute('aria-label', 'Keyboard shortcuts');
  helpBtn.title = 'Keyboard shortcuts';
  
  helpBtn.addEventListener('click', () => {
    const shortcutsModal = document.createElement('div');
    shortcutsModal.className = 'shortcuts-modal';
    shortcutsModal.innerHTML = `
      <div class="shortcuts-content">
        <h2>Keyboard Shortcuts</h2>
        <div class="shortcut-grid">
          <div class="shortcut-item">
            <span class="shortcut-key">←</span>
            <span class="shortcut-desc">Previous carousel item</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">→</span>
            <span class="shortcut-desc">Next carousel item</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">M</span>
            <span class="shortcut-desc">Switch to Movies</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">T</span>
            <span class="shortcut-desc">Switch to TV Shows</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">/</span>
            <span class="shortcut-desc">Focus search</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Esc</span>
            <span class="shortcut-desc">Close modal/menu</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-key">Home</span>
            <span class="shortcut-desc">Scroll to top</span>
          </div>
        </div>
        <button class="close-shortcuts-btn">Close</button>
      </div>
    `;
    
    document.body.appendChild(shortcutsModal);
    
    // Styling for the shortcuts modal
    const style = document.createElement('style');
    style.textContent = `
      .shortcuts-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      
      .shortcuts-content {
        background-color: var(--background-color);
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        border: 1px solid var(--border-color);
      }
      
      .shortcuts-content h2 {
        text-align: center;
        margin-bottom: 20px;
        color: var(--text-color);
      }
      
      .shortcut-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .shortcut-item {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .shortcut-key {
        display: inline-block;
        padding: 5px 10px;
        background-color: var(--dark-accent-color);
        border-radius: 4px;
        font-family: monospace;
        font-weight: bold;
        min-width: 30px;
        text-align: center;
      }
      
      .shortcut-desc {
        color: var(--text-color);
      }
      
      .close-shortcuts-btn {
        display: block;
        margin: 20px auto 0;
        padding: 8px 20px;
        background-color: var(--hover-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `;
    
    document.head.appendChild(style);
    
    // Close button functionality
    shortcutsModal.querySelector('.close-shortcuts-btn').addEventListener('click', () => {
      shortcutsModal.remove();
    });
    
    // Close on Escape key
    shortcutsModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        shortcutsModal.remove();
      }
    });
    
    // Close on click outside
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsModal.remove();
      }
    });
  });
  
  // Add to DOM
  document.body.appendChild(helpBtn);
  
  // Show/hide on scroll like the go-to-top button
  window.addEventListener('scroll', function() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
      helpBtn.style.display = 'block';
    } else {
      helpBtn.style.display = 'none';
    }
  });
}

// Call this function during init
document.addEventListener('DOMContentLoaded', function() {
  createKeyboardShortcutsHelp();
});

// Check for WebP support on startup
function checkWebPSupport() {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = function() { 
      const result = (webP.width > 0) && (webP.height > 0);
      localStorage.setItem('supportsWebP', result);
      window.supportsWebP = result;
      resolve(result);
    };
    webP.onerror = function() {
      localStorage.setItem('supportsWebP', false);
      window.supportsWebP = false;
      resolve(false);
    };
    webP.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
}

// Add WebP support check to initialization
document.addEventListener('DOMContentLoaded', function() {
  checkWebPSupport();
  // ...existing code...
});

// Implement event delegation for media cards and tabs to improve performance
function setupEventDelegation() {
  // Event delegation for movie content area
  const moviesContent = document.getElementById('moviesContent');
  if (moviesContent) {
    moviesContent.addEventListener('click', handleContentClick);
  }
  
  // Event delegation for TV content area
  const tvContent = document.getElementById('tvContent');
  if (tvContent) {
    tvContent.addEventListener('click', handleContentClick);
  }
  
  // Handle delegated events
  function handleContentClick(event) {
    // Handle favorite button clicks
    if (event.target.closest('.fav-btn')) {
      event.stopPropagation();
      const card = event.target.closest('.media-card');
      if (card) {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type');
        toggleFavorite(id, type, card);
      }
      return;
    }
    
    // Handle watched button clicks
    if (event.target.closest('.watched-btn')) {
      event.stopPropagation();
      const card = event.target.closest('.media-card');
      if (card) {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type');
        toggleWatched(id, type, card);
      }
      return;
    }
    
    // Handle title overlay clicks (go to detail page)
    if (event.target.closest('.media-title-overlay')) {
      const card = event.target.closest('.media-card');
      if (card) {
        const id = card.getAttribute('data-id');
        const type = card.getAttribute('data-type');
        goToDetailPage(id, type);
      }
      return;
    }
  }
}

// Call setupEventDelegation during initialization
document.addEventListener('DOMContentLoaded', function() {
  setupEventDelegation();
});

// Add mouse/keyboard navigation detection for better focus states
function setupFocusDetection() {
  // Add a class to the body when the user is navigating with a mouse
  document.body.addEventListener('mousedown', function() {
    document.body.classList.add('mouse-user');
  });

  // Remove the class when the user presses a key (likely navigating with keyboard)
  document.body.addEventListener('keydown', function(e) {
    // Only consider Tab key as indication of keyboard navigation
    if (e.key === 'Tab') {
      document.body.classList.remove('mouse-user');
    }
  });

  // Make media cards keyboard focusable
  document.querySelectorAll('.media-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    
    // Add keyboard event to trigger click on Enter/Space
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const titleOverlay = this.querySelector('.media-title-overlay');
        if (titleOverlay) {
          titleOverlay.click();
        }
      }
    });
  });
}

// Add this to the DOM loaded event
document.addEventListener('DOMContentLoaded', function() {
  setupFocusDetection();
  
  // Create a MutationObserver to handle dynamically added cards
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const cards = node.classList && node.classList.contains('media-card') 
              ? [node] 
              : node.querySelectorAll('.media-card');
            
            cards.forEach(card => {
              if (!card.hasAttribute('tabindex')) {
                card.setAttribute('tabindex', '0');
                card.addEventListener('keydown', function(e) {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const titleOverlay = this.querySelector('.media-title-overlay');
                    if (titleOverlay) {
                      titleOverlay.click();
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
  });
  
  // Observe the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});