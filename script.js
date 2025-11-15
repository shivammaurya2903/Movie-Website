// Load preloaded movie data from JSON file
let preloadedMovies = [];

// Function to extract clean title from full title string
function cleanTitle(fullTitle = '') {
  let clean = String(fullTitle)
    .replace(/\s*(WEB-DL|BluRay|DS4K|HQ-HDTC|HDTC|HDCAM)\s*\[.*?\]/gi, '')
    .replace(/\s*\d{3,4}p\s*&\s*\d{3,4}p\s*&\s*\d{3,4}p\s*/gi, '')
    .replace(/\s*\d{3,4}p\s*/gi, '')
    .replace(/\s*\[.*?\]/gi, '')
    .replace(/\s*\|\s*Full Movie\s*$/gi, '')
    .replace(/\s*\|\s*Full Series\s*$/gi, '')
    .replace(/\s*\|\s*NF Series\s*$/gi, '')
    .replace(/\s*\|\s*AMZN Series\s*$/gi, '')
    .replace(/\s*\|\s*HBO Series\s*$/gi, '')
    .replace(/\s*\|\s*Paramount\+ Series\s*$/gi, '')
    .replace(/\s*\|\s*JioHotStar Series\s*$/gi, '')
    .replace(/\s*\|\s*\[.*?\]\s*$/gi, '')
    .trim();
  return clean;
}

// Load preloaded movies from JSON
async function loadPreloadedMovies() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    preloadedMovies = await res.json();
    preloadedMovies.forEach(movie => {
      movie.clean_title = cleanTitle(movie.title || movie.name || '');
    });
    console.log("Preloaded Movies Loaded:", preloadedMovies.length);
    return preloadedMovies;
  } catch (err) {
    console.error("Failed to load preloaded movies:", err);
    return [];
  }
}

function parseCSV(text) {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur !== '' || row.length > 0) {
        row.push(cur);
        rows.push(row);
        cur = '';
        row = [];
      }
      if (ch === '\r' && next === '\n') i++;
      continue;
    }

    cur += ch;
  }

  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows.shift().map(h => h.trim());

  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] || '').trim());
    // ensure a 'title' key exists before cleaning
    obj.clean_title = cleanTitle(obj.title || obj.name || '');
    return obj;
  });
}

// Load CSV from a folder
async function loadMovies() {
  try {
    const res = await fetch("assets/hdhub4u_data.csv");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const movies = parseCSV(text);
    console.log("Movies Loaded:", movies.length);
    return movies;
  } catch (err) {
    console.error("Failed to load movies:", err);
    return [];
  }
}

// Utility: shuffle array (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* ---------- Main app logic (runs after DOM ready) ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Global variables that depend on DOM
  let allMovies = [];
  let currentPage = 0;
  const moviesPerPage = 20;
  let isLoading = false;

  // Banner slideshow variables (initialized only if slides exist)
  let currentSlide = 0;
  let slides = [];
  let totalSlides = 0;
  let autoSlideInterval = null;
  let isPaused = false;

  /* ---------- Movie sections population ---------- */
  async function populateMovies() {
    allMovies = await loadPreloadedMovies();

    // Define sections and their movie ranges
    const sections = [
      { selector: '.movie-list-container:nth-of-type(1) .movie-list', start: 0, count: 10 }, // New & Noteworthy
      { selector: '.movie-list-container:nth-of-type(2) .movie-list', start: 10, count: 10 }, // Popular Picks
      { selector: '.movie-list-container:nth-of-type(3) .movie-list', start: 20, count: 10 } // Action & Adventure
    ];

    sections.forEach(section => {
      const movieList = document.querySelector(section.selector);
      if (!movieList) return;

      movieList.innerHTML = '';

      const endIndex = Math.min(section.start + section.count, allMovies.length);

      for (let i = section.start; i < endIndex; i++) {
        const movie = allMovies[i] || {};
        const item = document.createElement('div');
        item.className = 'movie-list-item';

        // Use safe defaults for image and links
        const imgSrc = movie.image_url || 'gif/img-not load.png';
        const movieLink = movie.movie_link || '#';

        item.innerHTML = `
          <img class="movie-list-item-img" src="${imgSrc}" alt="${movie.clean_title || ''}" onerror="this.src='gif/img-not load.png'">
          <span class="movie-list-item-title">${movie.clean_title || (movie.title || '')}</span>
          <div class="movie-item-actions">
            <a href="${movieLink}" target="_blank" rel="noopener" class="movie-list-item-button"><i class="fas fa-download"></i> Download</a>
            <button class="movie-list-item-watchlist"><i class="fas fa-plus"></i> Add to Watchlist</button>
          </div>
        `;

        movieList.appendChild(item);
      }
    });
  }

  /* ---------- Movies grid (infinite scroll) ---------- */
  async function populateMoviesGrid() {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid) return;

    if (!navigator.onLine) {
      moviesGrid.innerHTML = '<div class="offline-message">You are currently offline. Please check your internet connection and try again.</div>';
      return;
    }

    if (currentPage === 0) {
      allMovies = await loadMovies();
      allMovies = shuffleArray(allMovies);
    }

    if (isLoading) return;
    isLoading = true;

    const startIndex = currentPage * moviesPerPage;
    const endIndex = Math.min(startIndex + moviesPerPage, allMovies.length);

    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('hide');
      loadingIndicator.classList.add('show');
    }

    for (let i = startIndex; i < endIndex; i++) {
      const movie = allMovies[i] || {};
      const item = document.createElement('div');
      item.className = 'movie-grid-item';

      const imgSrc = movie.image_url || 'gif/img-not load.png';
      const movieLink = movie.movie_link || '#';

      item.innerHTML = `
        <img class="movie-grid-item-img" src="${imgSrc}" alt="${movie.clean_title || ''}" onerror="this.src='gif/img-not load.png'">
        <div class="movie-grid-item-overlay">
          <h3 class="movie-grid-item-title">${movie.clean_title || (movie.title || '')}</h3>
          <div class="movie-grid-item-actions">
            <a href="${movieLink}" target="_blank" rel="noopener" class="movie-grid-item-button"><i class="fas fa-download"></i> Download</a>
            <a href="error.html" class="movie-grid-item-watch"><i class="fas fa-play"></i> Watch</a>
            <button class="movie-grid-item-watchlist"><i class="fas fa-plus"></i> Add to Watchlist</button>
          </div>
        </div>
      `;

      item.style.animationDelay = `${(i % 20) * 0.05}s`;
      moviesGrid.appendChild(item);
    }

    if (loadingIndicator) {
      loadingIndicator.classList.remove('show');
      loadingIndicator.classList.add('hide');
    }

    currentPage++;
    isLoading = false;
  }

  // Infinite scroll handler (throttled)
  let scrollThrottle = false;
  function handleScroll() {
    if (scrollThrottle) return;
    scrollThrottle = true;
    setTimeout(() => scrollThrottle = false, 150);

    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid || !navigator.onLine) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 100) {
      const totalMoviesLoaded = currentPage * moviesPerPage;
      if (totalMoviesLoaded < allMovies.length && !isLoading) {
        populateMoviesGrid();

        if (totalMoviesLoaded + moviesPerPage >= 200) {
          window.removeEventListener('scroll', handleScroll);
          const loadMoreBtn = document.createElement('button');
          loadMoreBtn.id = 'loadMoreBtn';
          loadMoreBtn.className = 'load-more-btn';
          loadMoreBtn.textContent = 'Load More Movies';
          loadMoreBtn.addEventListener('click', populateMoviesGrid);
          moviesGrid.parentNode.appendChild(loadMoreBtn);
        }
      }
    }
  }

  /* ---------- Watchlist: delegation for dynamic content ---------- */
  function initializeWatchlist() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.movie-list-item-watchlist, .movie-grid-item-watchlist');
      if (!button) return;

      // Toggle added state
      const added = button.classList.toggle('added');

      if (added) {
        button.innerHTML = '<i class="fas fa-check"></i> Added to Watchlist';
        button.classList.add('pulse');
        setTimeout(() => button.classList.remove('pulse'), 300);
      } else {
        button.innerHTML = '<i class="fas fa-plus"></i> Add to Watchlist';
      }
    });
  }

  /* ---------- Hamburger menu (no layout writes on load) ---------- */
  function initializeHamburgerMenu() {
    // Prefer class selectors since markup earlier used .hamburger and .menu-container
    const hamburger = document.querySelector('.hamburger') || document.getElementById('hamburger');
    const menuContainer = document.querySelector('.menu-container') || document.getElementById('menuContainer');

    if (!hamburger || !menuContainer) return;

    // Toggle class only — CSS media queries determine visible layout
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      menuContainer.classList.toggle('active'); // your CSS should show .menu-container.active for mobile open state
      const expanded = menuContainer.classList.contains('active');
      hamburger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    // Close menu on outside click or when a link is clicked
    document.addEventListener('click', (e) => {
      if (!menuContainer.contains(e.target) && !hamburger.contains(e.target)) {
        menuContainer.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    menuContainer.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        menuContainer.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // keep menu closed when switching to desktop
    const mq = window.matchMedia('(min-width: 768px)');
    const handleMq = () => {
      if (mq.matches) {
        menuContainer.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    };
    handleMq();
    mq.addEventListener ? mq.addEventListener('change', handleMq) : mq.addListener(handleMq);
  }

  /* ---------- Banner slideshow (initialized only if slides exist) ---------- */
  function initializeBanner() {
    slides = Array.from(document.querySelectorAll('.banner-slide'));
    totalSlides = slides.length;
    if (totalSlides === 0) return;

    currentSlide = 0;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      updateDots();
    }

    function nextSlide() {
      currentSlide = (currentSlide + 1) % totalSlides;
      showSlide(currentSlide);
    }

    function prevSlide() {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      showSlide(currentSlide);
    }

    function goToSlide(index) {
      currentSlide = index % totalSlides;
      showSlide(currentSlide);
    }

    function updateDots() {
      const dots = document.querySelectorAll('.banner-dot');
      dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
    }

    function createDots() {
      const dotsContainer = document.getElementById('bannerDots');
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'banner-dot';
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      }
      updateDots();
    }

    function startAutoSlide() {
      stopAutoSlide();
      autoSlideInterval = setInterval(() => {
        if (!isPaused) nextSlide();
      }, 4000);
    }

    function stopAutoSlide() {
      if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
      }
    }

    function pauseOnHover() {
      const banner = document.querySelector('.banner');
      if (!banner) return;
      banner.addEventListener('mouseenter', () => { isPaused = true; });
      banner.addEventListener('mouseleave', () => { isPaused = false; });
    }

    // Wire up arrows if present
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    createDots();
    showSlide(currentSlide);
    startAutoSlide();
    pauseOnHover();
  }

  /* ---------- Initialize everything ---------- */
  populateMovies().catch(console.error);

  // Only initialize movies grid if present
  const moviesGridEl = document.getElementById('moviesGrid');
  if (moviesGridEl) {
    populateMoviesGrid().catch(console.error);
    window.addEventListener('scroll', handleScroll);
  }

  initializeWatchlist();
  initializeHamburgerMenu();
  initializeBanner();

  // Optional: handle resize (debounced) to react to orientation changes
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Close mobile menu if switching to desktop handled in hamburger init via matchMedia
      // Recompute any layout dependent values if necessary (not forcing layout)
      // Example: restart banner if necessary
      // (we avoid writing styles here to prevent repaint/flicker)
    }, 150);
  });
});
