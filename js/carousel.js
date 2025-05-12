let trendingItems = [];
let currentSlideIndex = 0;
let carouselTimer = null;
let isDragging = false;
let activeHoverFrame = null;
let isTransitioning = false; // Add transition lock

const getElement = (id) => document.getElementById(id);
const createElement = (tag, className = '', innerHTML = '') => {
    const element = document.createElement(tag);
    element.className = className;
    element.innerHTML = innerHTML;
    return element;
};

const resetCarouselTimer = () => clearInterval(carouselTimer);

const playTrailer = async (item, slide, mediaTypeLocal) => {
    if (!item.__trailerKey) return;
    slide.innerHTML = '';
    const container = createElement('div', 'trailer-container');
    const iframe = createElement('iframe', 'trailer-iframe');
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.src = `https://www.youtube.com/embed/${item.__trailerKey}?autoplay=1&controls=1&modestbranding=1&showinfo=0`;
    container.appendChild(iframe);
    slide.appendChild(container);
    slide.setAttribute('data-trailer-playing', 'true');
    getElement('carouselIndicators').style.display = 'none';
    document.querySelector('.carousel-arrows').style.display = 'none';
};

const showSlide = async (index, direction = 'next') => {
    if (isTransitioning) return; // Prevent slide change if already transitioning
    isTransitioning = true;
    
    const container = getElement('carouselContainer');
    resetCarouselTimer();
    container.querySelectorAll('.carousel-slide').forEach(slide => {
        slide.classList.remove('visible');
        slide.classList.add(direction === 'next' ? 'prev-hidden' : 'next-hidden');
        setTimeout(() => slide.remove(), 800);
    });

    if (!trendingItems[index]) {
        container.innerHTML = '<p>No trending items.</p>';
        updateIndicators(0, 0);
        return;
    }

    const item = trendingItems[index];
    const mediaTypeLocal = item.media_type || window.currentMediaType || 'movie';
    if (!item.__fullDetails) {
        try {
            const details = await window.fetchItemDetails(mediaTypeLocal, item.id);
            item.__fullDetails = details;
        } catch (err) {
            console.error('Failed to fetch details for carousel item:', err);
            item.__fullDetails = {};
        }
    }
    const details = item.__fullDetails;
    const slide = createElement('div', 'carousel-slide');
    slide.classList.add(direction === 'next' ? 'next-hidden' : 'prev-hidden');
    slide.style.backgroundImage = `url(${window.formatImageUrl(details.backdrop_path || item.backdrop_path || item.poster_path, true).replace('w1280', 'original')})`;

    const title = details.title || details.name || 'Untitled';
    const year = details.release_date ? new Date(details.release_date).getFullYear() : details.first_air_date ? new Date(details.first_air_date).getFullYear() : '';
    const overlay = createElement('div', 'carousel-info-overlay', `
        <h4 class="carousel-title">${title} ${year ? `(${year})` : ''}</h4>
        ${details.tagline ? `<div class="carousel-tagline">${details.tagline}</div>` : ''}
        <div class="carousel-metadata">
            ${details.vote_average ? `<span class="carousel-rating-stars">${getStarRating(details.vote_average / 2)} <b>${details.vote_average.toFixed(1)}</b></span>` : ''}
        </div>
    `);
    slide.appendChild(overlay);
    container.appendChild(slide);
    void slide.offsetWidth;
    slide.classList.remove(direction === 'next' ? 'next-hidden' : 'prev-hidden');
    slide.classList.add('visible');
    updateIndicators(currentSlideIndex, trendingItems.length);

    let hoverTimeout;
    let isHovering = false;
    slide.addEventListener('mouseenter', async () => {
        if (isDragging) return;
        isHovering = true;
        if (!item.__trailerKey) {
            try {
                const trailer = await window.fetchTrailer(mediaTypeLocal, item.id);
                item.__trailerKey = trailer?.key || null;
            } catch (err) {
                console.error('Error fetching trailer:', err);
                item.__trailerKey = null;
            }
        }
        if (!item.__trailerKey) return;
        clearInterval(carouselTimer);
        slide.setAttribute('data-hover', 'true');
        const indicator = getElement('circleIndicator');
        indicator.style.display = 'flex';
        const progressCircle = indicator.querySelector('.progress-circle');
        progressCircle.classList.add('animate-progress');
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            if (isHovering && !slide.getAttribute('data-trailer-playing')) {
                playTrailer(item, slide, mediaTypeLocal);
                indicator.style.display = 'none';
                progressCircle.classList.remove('animate-progress');
            }
        }, 3000);
    });

    slide.addEventListener('mouseleave', () => {
        isHovering = false;
        slide.removeAttribute('data-hover');
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        const indicator = getElement('circleIndicator');
        indicator.style.display = 'none';
        const progressCircle = indicator.querySelector('.progress-circle');
        progressCircle.classList.remove('animate-progress');
        if (slide.getAttribute('data-trailer-playing')) {
            slide.innerHTML = '';
            slide.style.backgroundImage = `url(${window.formatImageUrl(details.backdrop_path || item.backdrop_path || item.poster_path, true).replace('w1280', 'original')})`;
            slide.removeAttribute('data-trailer-playing');
            slide.appendChild(overlay);
            getElement('carouselIndicators').style.display = 'flex';
            document.querySelector('.carousel-arrows').style.display = 'flex';
        }
        startCarousel();
    });

    slide.addEventListener('click', () => {
        if (!slide.getAttribute('data-trailer-playing')) {
            goToDetailPage(item.id, mediaTypeLocal);
        }
    });

    slide.addEventListener('transitionend', () => {
        isTransitioning = false;
    }, { once: true });
};

const startCarousel = () => {
    clearInterval(carouselTimer);
    carouselTimer = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % trendingItems.length;
        showSlide(currentSlideIndex, 'next');
    }, 5000);
};

const loadTrending = async (mediaType) => {
    const cacheStr = localStorage.getItem(`trending_${mediaType}`);
    let useCache = false;
    if (cacheStr) {
        try {
            const cobj = JSON.parse(cacheStr);
            if (Date.now() - cobj.timestamp < 24 * 3600 * 1000) {
                trendingItems = cobj.data;
                useCache = true;
            }
        } catch (e) {}
    }
    if (!useCache) {
        const resp = await window.fetchTrending(mediaType);
        trendingItems = resp && resp.results ? resp.results : [];
        localStorage.setItem(`trending_${mediaType}`, JSON.stringify({
            timestamp: Date.now(),
            data: trendingItems
        }));
    }
    currentSlideIndex = 0;
    showSlide(0);
    startCarousel();
};

const setupCarouselArrows = () => {
    const carouselPrev = getElement('carouselPrev');
    const carouselNext = getElement('carouselNext');
    
    const handlePrev = () => {
        if (isTransitioning || !trendingItems.length) return;
        currentSlideIndex = (currentSlideIndex - 1 + trendingItems.length) % trendingItems.length;
        showSlide(currentSlideIndex, 'prev');
        resetIndicator();
    };

    const handleNext = () => {
        if (isTransitioning || !trendingItems.length) return;
        currentSlideIndex = (currentSlideIndex + 1) % trendingItems.length;
        showSlide(currentSlideIndex, 'next');
        resetIndicator();
    };

    carouselPrev.onclick = handlePrev;
    carouselNext.onclick = handleNext;

    // Update keyboard event handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
    });
};

const updateIndicators = (currentIndex, totalSlides) => {
    const indicatorsContainer = getElement('carouselIndicators');
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const dot = createElement('span', `indicator${i === currentIndex ? ' active' : ''}`);
        const item = trendingItems[i];
        dot.dataset.title = item.title || item.name || 'Untitled';
        dot.style.setProperty('--preview-image', `url(${window.formatImageUrl(item.backdrop_path || item.poster_path, false)})`);
        dot.addEventListener('click', () => {
            currentSlideIndex = i;
            showSlide(currentSlideIndex);
            clearInterval(carouselTimer);
            startCarousel();
            resetIndicator();
        });
        indicatorsContainer.appendChild(dot);
    }
};

const cleanupCarousel = () => {
    clearInterval(carouselTimer);
    trendingItems = [];
    getElement('carouselContainer').innerHTML = '';
    getElement('carouselPrev').onclick = null;
    getElement('carouselNext').onclick = null;
};

window.addEventListener('beforeunload', cleanupCarousel);

const enableMouseDrag = (carouselElement) => {
    let startX = 0;
    let dragStartTime = 0;
    let lastDragDirection = null;

    const handleDrag = (e, isTouch = false) => {
        if (!isDragging) return;
        const diffX = isTouch ? e.touches[0].clientX - startX : e.pageX - startX;
        lastDragDirection = diffX > 0 ? 'prev' : 'next';
        if (Math.abs(diffX) > 50) {
            const dragDuration = Date.now() - dragStartTime;
            const velocity = Math.abs(diffX) / dragDuration;
            currentSlideIndex = (currentSlideIndex + (diffX > 0 ? -1 : 1) + trendingItems.length) % trendingItems.length;
            showSlide(currentSlideIndex, lastDragDirection);
            isDragging = false;
            startX = isTouch ? e.touches[0].clientX : e.pageX;
            dragStartTime = Date.now();
        }
    };

    carouselElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX;
        dragStartTime = Date.now();
        carouselElement.style.cursor = 'grabbing';
        resetIndicator();
        if (activeHoverFrame) cancelAnimationFrame(activeHoverFrame);
    });

    window.addEventListener('mousemove', (e) => handleDrag(e));
    window.addEventListener('mouseup', () => {
        isDragging = false;
        carouselElement.style.cursor = 'grab';
    });

    carouselElement.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        dragStartTime = Date.now();
        resetIndicator();
        if (activeHoverFrame) cancelAnimationFrame(activeHoverFrame);
    });

    carouselElement.addEventListener('touchmove', (e) => handleDrag(e, true));
    carouselElement.addEventListener('touchend', () => {
        isDragging = false;
    });
};

const resetIndicator = () => {
    const indicator = getElement('circleIndicator');
    indicator.style.display = 'none';
    const progressCircle = indicator.querySelector('.progress-circle');
    progressCircle.classList.remove('animate-progress');
    if (activeHoverFrame) cancelAnimationFrame(activeHoverFrame);
};

document.addEventListener('DOMContentLoaded', () => {
    const container = getElement('carouselContainer');
    if (!container) return;
    setupCarouselArrows();
    enableMouseDrag(container);

    
  // Create logout button if it doesn't exist
  var logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    logoutBtn = document.createElement("button");
    logoutBtn.id = "logoutBtn";
    logoutBtn.textContent = "Log Out";
    logoutBtn.style.display = "none";
    document.body.appendChild(logoutBtn);
  }
});