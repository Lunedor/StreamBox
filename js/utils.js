// utils.js - Contains utility functions used across the application

// Refresh all user-dependent data (favorites, watched, progress, icons, etc.)
function refreshUserData() {
  window.reloadFavoritesAndWatched().then(function() {
    if (typeof window.updateButtonStates === "function") {
      window.updateButtonStates();
    }
  });
}

// Initialize the application
function init() {
  // Apply theme from localStorage first thing
  const savedTheme = localStorage.getItem('theme');
  const isDarkTheme = savedTheme === 'dark' || !savedTheme; // Default to dark
  window.isDarkTheme = isDarkTheme;
  if (typeof window.applyTheme === "function") {
    window.applyTheme(isDarkTheme);
  }
  
  // Set up UI components
  window.setupMediaToggle();
  window.setupSearch();
  window.setupProgressToggle();
  window.setupHamburgerMenu();
  window.setupThemeToggle();
  window.setupBackupButtons();
  window.setupFilterButton();
  
  // Run daily updates
  window.runDailyWaitlistUpdate();
  
  // Reload favorites and watched data first
  window.reloadFavoritesAndWatched().then(function() {
    window.initSubTabs(window.currentMediaType);
    loadTrending(window.currentMediaType);
    setupCarouselArrows();
    resetCarouselTimer();
    var carouselContainer = document.getElementById("carouselContainer");
    enableMouseDrag(carouselContainer);
    window.addRandomItemButton();
    window.setupInfiniteScroll();
    
    // Refresh the progress UI for tv or movie based on currentMediaType
    refreshUserData();
  });
}

// Handle page visibility changes to refresh data when page becomes visible
function setupVisibilityChangeHandler() {
  document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
      refreshUserData();
    }
  });
}

// DOMContentLoaded event handler
function setupDOMContentLoadedHandler() {
  document.addEventListener("DOMContentLoaded", function() {
    init();
    setupVisibilityChangeHandler();
  });
}

// Export functions to window
window.refreshUserData = refreshUserData;
window.init = init;

// Auto-initialize when DOM is loaded
setupDOMContentLoadedHandler();