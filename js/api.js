/**
 * fetchGeneral: base function to build a TMDB URL.
 */
window.fetchGeneral = async function(id, type, section, sectionNumber, params) {
  params = params || {};
  let url = 'https://api.themoviedb.org/3';
  if (type) url += '/' + type;
  if (id) url += '/' + id;
  if (section) {
    url += '/' + section;
    if (sectionNumber) url += '/' + sectionNumber;
  }
  params.api_key = apiKey;
  let qs = new URLSearchParams(params).toString();
  url += '?' + qs;
  
  try {
    // Create an AbortController to set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(`HTTP ${resp.status}: ${errorData.status_message || resp.statusText}`);
    }
    
    return await resp.json();
  } catch (err) {
    console.error('API Error:', err.name === 'AbortError' ? 'Request timed out' : err.message);
    
    // Show user-friendly error notification
    showErrorNotification(
      err.name === 'AbortError' 
        ? 'Request timed out. Please check your connection and try again.' 
        : `Couldn't load data: ${err.message}`
    );
    
    return null;
  }
};

/**
 * Shows a user-friendly error notification
 */
function showErrorNotification(message) {
  // Check if a notification already exists to avoid duplicates
  if (document.getElementById('api-error-notification')) return;
  
  const notification = document.createElement('div');
  notification.id = 'api-error-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    </div>
    <button class="close-notification"><i class="fas fa-times"></i></button>
  `;
  
  document.body.appendChild(notification);
  
  // Style the notification with CSS
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '5px';
  notification.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
  notification.style.zIndex = '9999';
  notification.style.display = 'flex';
  notification.style.justifyContent = 'space-between';
  notification.style.alignItems = 'center';
  notification.style.maxWidth = '400px';
  notification.style.animation = 'slideIn 0.3s ease-out forwards';
  
  // Add animation keyframes
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    #api-error-notification .notification-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #api-error-notification .close-notification {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      padding: 0 5px;
    }
  `;
  document.head.appendChild(styleSheet);
  
  // Close button functionality
  const closeBtn = notification.querySelector('.close-notification');
  closeBtn.addEventListener('click', () => {
    notification.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

/**
 * fetchTrending
 */
window.fetchTrending = async function(mediaType) {
  return await window.fetchGeneral(null, 'trending', mediaType, 'day');
};

/**
 * fetchPopular
 *   e.g. /movie/popular or /tv/popular (with page)
 */
window.fetchPopular = async function(mediaType, page) {
  page = page || 1;
  let params = {
    page: page,
    "vote_count.gte": 500,
    "vote_average.gte": 5
  };
  if (mediaType === "tv") {
    // Use discover/tv to apply genre exclusion and sort by popularity descending.
    return await window.fetchGeneral(
      null,
      "discover/tv",
      null,
      null,
      Object.assign({}, params, {
        without_genres: "10763,10764,10766,10767",
        sort_by: "popularity.desc"
      })
    );
  } else {
    return await window.fetchGeneral(null, mediaType, 'popular', null, params);
  }
};


//*** fetchDiscoverByGenre*/
window.fetchDiscoverByGenre = async function(mediaType, genreId, page) {
  page = page || 1;
  let params = {
    with_genres: genreId,
    page: page
  };
  if (mediaType === "tv") {
    params.without_genres = "10764,10766,10767"; // Exclude reality and soap operas
    params.sort_by = "popularity.desc";   // Optional: sort by popularity
  }
  return await window.fetchGeneral(null, "discover/" + mediaType, null, null, params);
};


/**
 * searchMedia
 */
window.searchMedia = async function(query, mediaType, page) {
  page = page || 1;
  return await window.fetchGeneral(null, 'search/' + mediaType, null, null, {
    query: query, 
    page: page
  });
};

/**
 * fetchTrailer
 */
window.fetchTrailer = async function(mediaType, id) {
  let data = await window.fetchGeneral(id, mediaType, 'videos');
  if (data && data.results) {
    let trailer = data.results.find(function(v) {
      return v.type === 'Trailer' && v.site === 'YouTube';
    });
    return trailer;
  }
  return null;
};

/**
 * formatImageUrl - Returns optimized image URLs with WebP support
 * Provides better performance through optimized image formats
 */
window.formatImageUrl = function(path, hd) {
  if (!path) {
    // Return placeholder if no image path
    return hd 
      ? 'https://placehold.co/1280x720?text=No+Image'
      : 'https://placehold.co/500x750?text=No+Image';
  }
  
  // Check if browser supports WebP
  const supportsWebP = window.supportsWebP || localStorage.getItem('supportsWebP');
  
  // Configure base URL based on image size
  const baseUrl = hd 
    ? 'https://image.tmdb.org/t/p/w1280'
    : 'https://image.tmdb.org/t/p/w500';
  
  // Use WebP when supported for better performance
  if (supportsWebP === 'true') {
    return `${baseUrl}${path}.webp`;
  }
  
  // Fallback to normal JPG
  return `${baseUrl}${path}`;
};

/**
 * fetchItemDetails
 */

window.fetchItemDetails = async function(type, id) {
  return await window.fetchGeneral(id, type, null, null, {
    append_to_response: 'credits,similar'
  });
};


