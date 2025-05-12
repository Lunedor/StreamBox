// ui.js - Contains UI-related functionality
var currentMediaType = "movie"; 

// Dropdown Toggle Logic with Accessibility Improvements
function setupHamburgerMenu() {
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const hamburgerDropdown = document.getElementById("hamburgerDropdown");

    // Toggle dropdown on hamburger click
    hamburgerMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        const isExpanded = hamburgerDropdown.classList.contains("open");
        
        // Toggle the dropdown
        hamburgerDropdown.classList.toggle("open");
        
        // Update ARIA attributes for accessibility
        hamburgerMenu.setAttribute("aria-expanded", !isExpanded);
        hamburgerDropdown.setAttribute("aria-hidden", isExpanded);
        
        // Trap focus within dropdown when open (accessibility improvement)
        if (!isExpanded) {
            setTimeout(() => {
                const firstFocusableElement = hamburgerDropdown.querySelector('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (firstFocusableElement) {
                    firstFocusableElement.focus();
                }
            }, 100);
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!hamburgerDropdown.contains(e.target) && !hamburgerMenu.contains(e.target)) {
            hamburgerDropdown.classList.remove("open");
            hamburgerMenu.setAttribute("aria-expanded", "false");
            hamburgerDropdown.setAttribute("aria-hidden", "true");
        }
    });
}

// Theme Toggle Logic
function setupThemeToggle() {
    const themeToggleCheckbox = document.getElementById("themeToggleCheckbox");
    if (!themeToggleCheckbox) return;

    // Ensure we're getting the latest theme setting from localStorage
    const savedTheme = localStorage.getItem('theme');
    const isDarkTheme = savedTheme === 'dark' || !savedTheme; // Default to dark
    
    // Update global state
    window.isDarkTheme = isDarkTheme;
    
    // Set checkbox state based on theme
    themeToggleCheckbox.checked = isDarkTheme;
    
    // Apply theme
    if (typeof window.applyTheme === "function") {
        window.applyTheme(isDarkTheme);
    }

    themeToggleCheckbox.addEventListener("change", (e) => {
        const newDarkTheme = e.target.checked;
        // Save to localStorage
        localStorage.setItem('theme', newDarkTheme ? 'dark' : 'light');
        
        // Update global state
        window.isDarkTheme = newDarkTheme;
        
        // Apply theme
        if (typeof window.applyTheme === "function") {
            window.applyTheme(newDarkTheme);
        }
    });
}

function setupProgressToggle() {
    const hamburgerDropdown = document.getElementById("progressButton");
    if (!hamburgerDropdown) return;

    // Create toggle switch
    const toggleItem = document.createElement("div");
    toggleItem.className = "dropdown-item toggle-switch";
    toggleItem.innerHTML = `
    <span>Progress: </span>
    <label class="switch">
      <input type="checkbox" id="progressToggleCheckbox">
      <span class="slider round"></span>
    </label>
  `;
    hamburgerDropdown.appendChild(toggleItem);

    const progressToggleCheckbox = document.getElementById("progressToggleCheckbox");

    // Load saved state from localStorage
    const isProgressVisible = localStorage.getItem("showProgressSections") === "true";
    progressToggleCheckbox.checked = isProgressVisible;
    applyProgressVisibility(isProgressVisible);

    // Handle toggle changes
    progressToggleCheckbox.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem("showProgressSections", isChecked);
        applyProgressVisibility(isChecked);
    });
}

function applyProgressVisibility(show) {
    const movieProgress = document.getElementById("movieProgressContainer");
    const tvProgress = document.getElementById("tvFixedSections");

    // Initially always hide
    if (movieProgress) {
        movieProgress.style.display = "none";
        movieProgress.innerHTML = 'Loading progress...'; // Show loading indicator
    }
    if (tvProgress) {
        tvProgress.style.display = "none";
        tvProgress.innerHTML = 'Loading progress...'; // Show loading indicator
    }

    if (show) {
        setTimeout(() => {
            if (movieProgress && window.currentMediaType === "movie" && typeof window.renderMovieProgressUI === "function") {
                movieProgress.style.display = "flex";
            } else if (tvProgress && window.currentMediaType === "tv" && typeof window.renderAboveTabsUI === "function") {
                tvProgress.style.display = "flex";
            }
        }, 1500); // Increased delay to allow for loading (adjust as needed)
    } else {
        // If hiding, ensure any loading indicators are also hidden
        if (movieProgress) movieProgress.innerHTML = '';
        if (tvProgress) tvProgress.innerHTML = '';
    }
}

function setupMediaToggle() {
    const savedType = localStorage.getItem("preferredMediaType") || "movie";
    window.currentMediaType = savedType;

    document.querySelectorAll(".toggle-btn").forEach(function(btn) {
        const type = btn.getAttribute("data-type");

        if (type === window.currentMediaType) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }

        btn.onclick = function() {
            window.countScroll = 0;

            document.querySelectorAll(".toggle-btn").forEach(function(b) {
                b.classList.remove("active");
            });
            btn.classList.add("active");

            window.currentMediaType = type;
            localStorage.setItem("preferredMediaType", window.currentMediaType);

            if (window.currentMediaType === "movie") {
                document.getElementById("moviesSection").style.display = "flex";
                document.getElementById("tvSection").style.display = "none";
            } else {
                document.getElementById("moviesSection").style.display = "none";
                document.getElementById("tvSection").style.display = "flex";
            }

            document.getElementById("moviesSection").classList.toggle("active", window.currentMediaType === "movie");
            document.getElementById("tvSection").classList.toggle("active", window.currentMediaType === "tv");

            loadTrending(window.currentMediaType);
            window.initSubTabs(window.currentMediaType);
            const isProgressVisible = localStorage.getItem("showProgressSections") === "true";

            document.getElementById("movieProgressContainer").style.display = (window.currentMediaType === "movie" && isProgressVisible) ? "flex" : "none";
            document.getElementById("tvFixedSections").style.display = (window.currentMediaType === "tv" && isProgressVisible) ? "flex" : "none";
        };
    });

    if (window.currentMediaType === "movie") {
        document.getElementById("moviesSection").style.display = "flex";
        document.getElementById("tvSection").style.display = "none";
    } else {
        document.getElementById("moviesSection").style.display = "none";
        document.getElementById("tvSection").style.display = "flex";
    }

    document.getElementById("moviesSection").classList.toggle("active", window.currentMediaType === "movie");
    document.getElementById("tvSection").classList.toggle("active", window.currentMediaType === "tv");
}

// Function to show random favorite item in a modal
async function showRandomFavoriteItem(mediaType) {
    // Fetch all favorites (movies and TV shows)
    const favorites = await window.getFavorites();

    // Filter favorites based on active media type
    const filteredFavorites = favorites.filter(item => item.type === mediaType);

    if (filteredFavorites.length === 0) {
        alert(`No favorite ${mediaType === 'movie' ? 'movies' : 'TV shows'} found!`);
        return;
    }

    // Pick a random item
    const randomItem = filteredFavorites[Math.floor(Math.random() * filteredFavorites.length)];

    // Fetch detailed info (for genres, tagline, etc.)
    const details = await window.fetchItemDetails(randomItem.type, randomItem.id);

    // Create modal content
    const modal = document.createElement('div');
    modal.classList.add('random-item-modal');

    const backdropPath = details.backdrop_path ? window.formatImageUrl(details.backdrop_path, true) : '';
    const genres = details.genres ? details.genres.map(g => g.name).join(', ') : 'N/A';

    modal.innerHTML = `
    <div class="modal-content" style="background-image: url('${backdropPath}')">
      <div class="modal-overlay"></div>
      <span class="close-btn">&times;</span>
	    ${
              details.release_date || details.first_air_date
                ? `<h2>${details.title || details.name}</h2> <h4>${new Date(details.release_date || details.first_air_date).getFullYear()}</h4>`
                : `<h2>${details.title || details.name}</h2>`
            }
			<h4>${details.tagline || ''}</h4>
			<div class="icon-info">
			${
              details.runtime
                ? `<p><i class="fas fa-clock" style="opacity: 0.8"></i> ${details.runtime} mins</p>`
                : ''
            }
			${
              details.vote_average
                ? `<p><i class="fas fa-star" style="color:yellow; opacity: 0.8; filter:drop-shadow(0 0 3px gray)"></i> ${details.vote_average.toFixed(1)}</p>`
                : ''
            }
			${
              details.genres?.length
                ? `<p><i class="fas fa-tag" style="opacity: 0.8"></i> ${details.genres.map(g => g.name).join(', ')}</p>`
                : ''       }</div><p class="overview">${details.overview}</p><button class="go-to-details">View Details</button></div>`;

    document.body.appendChild(modal);

    // Close modal when clicking on close button
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Close modal when clicking outside modal-content
    modal.addEventListener('click', (event) => {
        if (!event.target.closest('.modal-content')) {
            modal.remove();
        }
    });

    // Go to details page
    modal.querySelector('.go-to-details').addEventListener('click', () => {
        window.goToDetailPage(randomItem.id, randomItem.type);
    });
}

// Add button to favorites tab when active
function addRandomItemButton() {
    const observer = new MutationObserver(() => {
        const favoritesContainers = [{
                container: document.querySelector("#moviesContent .section h1"),
                mediaType: 'movie'
            },
            {
                container: document.querySelector("#tvContent .section h1"),
                mediaType: 'tv'
            }
        ];

        favoritesContainers.forEach(({
            container,
            mediaType
        }) => {
            if (container && container.textContent.includes('Favorite')) {
                const existingButton = container.parentNode.querySelector('.random-item-btn');

                if (!existingButton) {
                    const randomBtn = document.createElement('button');
                    randomBtn.classList.add('random-item-btn');
                    randomBtn.textContent = `🎲`;

                    randomBtn.addEventListener('click', () => showRandomFavoriteItem(mediaType));

                    container.parentNode.insertBefore(randomBtn, container.nextSibling);
                }
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Setup backup functionality
function setupBackupButtons() {
    const exportBtn = document.getElementById('exportBackupBtn');
    const importInput = document.getElementById('importBackupInput');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            window.exportBackup();
        });
    }
    
    if (importInput) {
        importInput.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                window.importBackup(event.target.files[0]);
            }
        });
    }
}

// Expose functions to window
window.setupHamburgerMenu = setupHamburgerMenu;
window.setupThemeToggle = setupThemeToggle;
window.setupProgressToggle = setupProgressToggle;
window.applyProgressVisibility = applyProgressVisibility;
window.setupMediaToggle = setupMediaToggle;
window.showRandomFavoriteItem = showRandomFavoriteItem;
window.addRandomItemButton = addRandomItemButton;
window.setupBackupButtons = setupBackupButtons;