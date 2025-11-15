// Function to extract clean title from full title string
function cleanTitle(fullTitle) {
  // Remove common metadata patterns like WEB-DL, BluRay, etc., and quality info
  let clean = fullTitle.replace(/\s*(WEB-DL|BluRay|DS4K|HQ-HDTC|HDTC|HDCAM)\s*\[.*?\]/gi, '');
  // Remove quality and audio info like 1080p, 720p, Dual Audio, etc.
  clean = clean.replace(/\s*\d{3,4}p\s*&\s*\d{3,4}p\s*&\s*\d{3,4}p\s*/gi, '');
  clean = clean.replace(/\s*\d{3,4}p\s*/gi, '');
  clean = clean.replace(/\s*\[.*?\]/gi, ''); // Remove any remaining brackets
  clean = clean.replace(/\s*\|\s*Full Movie\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*Full Series\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*NF Series\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*AMZN Series\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*HBO Series\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*Paramount\+ Series\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*JioHotStar Series\s*$/gi, '');
  clean = clean.replace(/\s*\|\s*\[.*?\]\s*$/gi, '');
  // Trim extra spaces
  clean = clean.trim();
  return clean;
}

// CSV Parser
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
    obj.clean_title = cleanTitle(obj.title);
    return obj;
  });
}

// Load CSV from a folder
async function loadMovies() {
  try {
    const res = await fetch("assets/hdhub4u_data.csv");
    const text = await res.text();
    const movies = parseCSV(text);
    console.log("Movies Loaded:", movies);
    return movies;
  } catch (err) {
    console.error("Failed to load movies:", err);
    return [];
  }
}

// Global variables
let allMovies = [];

// Populate all movie lists from CSV
async function populateMovies() {
  allMovies = await loadMovies();

  // Define sections and their movie ranges
  const sections = [
    { selector: '.movie-list-container:nth-of-type(1) .movie-list', start: 0, count: 10 }, // New & Noteworthy
    { selector: '.movie-list-container:nth-of-type(2) .movie-list', start: 10, count: 10 }, // Popular Picks
    { selector: '.movie-list-container:nth-of-type(3) .movie-list', start: 20, count: 10 }, // Action & Adventure
    { selector: '.movie-list-container:nth-of-type(4) .movie-list', start: 30, count: 10 }  // Superheroes & Sci‑Fi
  ];

  sections.forEach(section => {
    const movieList = document.querySelector(section.selector);
    if (!movieList) return;

    // Clear existing items
    movieList.innerHTML = '';

    const endIndex = Math.min(section.start + section.count, allMovies.length);

    for (let i = section.start; i < endIndex; i++) {
      const movie = allMovies[i];
      const item = document.createElement('div');
      item.className = 'movie-list-item';

      item.innerHTML = `
        <img class="movie-list-item-img" src="${movie.image_url}" alt="${movie.clean_title}" onerror="this.src='gif/img-not load.png'">
        <span class="movie-list-item-title">${movie.clean_title}</span>
        <div class="movie-item-actions">
          <a href="${movie.movie_link}" target="_blank" class="movie-list-item-button"><i class="fas fa-download"></i> Download</a>
          <button class="movie-list-item-watchlist"><i class="fas fa-plus"></i> Add to Watchlist</button>
        </div>
      `;

      movieList.appendChild(item);
    }
  });
}

// Banner slideshow functionality
let currentSlide = 0;
const slides = document.querySelectorAll('.banner-slide');
const totalSlides = slides.length;
let autoSlideInterval;
let isPaused = false;

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.remove('active');
    if (i === index) {
      slide.classList.add('active');
    }
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
  currentSlide = index;
  showSlide(currentSlide);
}

function updateDots() {
  const dots = document.querySelectorAll('.banner-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function createDots() {
  const dotsContainer = document.getElementById('bannerDots');
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = 'banner-dot';
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  }
  updateDots();
}

function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    if (!isPaused) {
      nextSlide();
    }
  }, 4000);
}

function stopAutoSlide() {
  clearInterval(autoSlideInterval);
}

function pauseOnHover() {
  const banner = document.querySelector('.banner');
  if (!banner) return; // Only run if banner exists
  banner.addEventListener('mouseenter', () => {
    isPaused = true;
  });
  banner.addEventListener('mouseleave', () => {
    isPaused = false;
  });
}

// Event listeners for arrows (only if elements exist)
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
if (prevBtn) prevBtn.addEventListener('click', prevSlide);
if (nextBtn) nextBtn.addEventListener('click', nextSlide);

// Watchlist functionality with icon toggle
function initializeWatchlist() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.movie-list-item-watchlist') || e.target.closest('.movie-grid-item-watchlist')) {
      const button = e.target.closest('.movie-list-item-watchlist') || e.target.closest('.movie-grid-item-watchlist');
      const icon = button.querySelector('i');

      // Toggle added state
      button.classList.toggle('added');

      if (button.classList.contains('added')) {
        icon.className = 'fas fa-check';
        button.innerHTML = '<i class="fas fa-check"></i> Added to Watchlist';
        // Add animation class
        button.classList.add('pulse');
        setTimeout(() => button.classList.remove('pulse'), 300);
      } else {
        icon.className = 'fas fa-plus';
        button.innerHTML = '<i class="fas fa-plus"></i> Add to Watchlist';
      }
    }
  });
}

// Global variables for infinite scroll
let currentPage = 0;
const moviesPerPage = 20;
let isLoading = false;

// Populate movies grid for movies.html page with infinite scroll
async function populateMoviesGrid() {
  const moviesGrid = document.getElementById('moviesGrid');
  if (!moviesGrid) return; // Only run on movies page

  if (currentPage === 0) {
    allMovies = await loadMovies();
    // Shuffle the movies array for random order
    allMovies = shuffleArray(allMovies);
  }

  if (isLoading) return;
  isLoading = true;

  const startIndex = currentPage * moviesPerPage;
  const endIndex = Math.min(startIndex + moviesPerPage, allMovies.length);

  // Show loading indicator
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.remove('hide');
    loadingIndicator.classList.add('show');
  }

  for (let i = startIndex; i < endIndex; i++) {
    const movie = allMovies[i];
    const item = document.createElement('div');
    item.className = 'movie-grid-item';

    item.innerHTML = `
      <img class="movie-grid-item-img" src="${movie.image_url}" alt="${movie.clean_title}" onerror="this.src='gif/img-not load.png'">
      <div class="movie-grid-item-overlay">
        <h3 class="movie-grid-item-title">${movie.clean_title}</h3>
        <div class="movie-grid-item-actions">
          <a href="${movie.movie_link}" target="_blank" class="movie-grid-item-button"><i class="fas fa-download"></i> Download</a>
          <a href="error.html" class="movie-grid-item-watch"><i class="fas fa-play"></i> Watch</a>
          <button class="movie-grid-item-watchlist"><i class="fas fa-plus"></i> Add to Watchlist</button>
        </div>
      </div>
    `;

    // Add animation class for staggered effect
    item.style.animationDelay = `${(i % 20) * 0.1}s`;

    moviesGrid.appendChild(item);
  }

  // Hide loading indicator
  if (loadingIndicator) {
    loadingIndicator.classList.remove('show');
    loadingIndicator.classList.add('hide');
  }

  currentPage++;
  isLoading = false;
}

// Shuffle array function using Fisher-Yates algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Infinite scroll functionality
function handleScroll() {
  const moviesGrid = document.getElementById('moviesGrid');
  if (!moviesGrid) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Load more when user is near the bottom (100px threshold)
  if (scrollTop + windowHeight >= documentHeight - 100) {
    const totalMoviesLoaded = currentPage * moviesPerPage;
    if (totalMoviesLoaded < allMovies.length && !isLoading) {
      populateMoviesGrid();
      // Check if 200 movies are loaded, then stop infinite scroll and add Load More button
      if (totalMoviesLoaded + moviesPerPage >= 200) {
        window.removeEventListener('scroll', handleScroll);
        // Add Load More button
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

// Hamburger menu toggle
function initializeHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const menuContainer = document.getElementById('menuContainer');

  if (hamburger && menuContainer) {
    hamburger.addEventListener('click', () => {
      menuContainer.classList.toggle('active');
    });

    // Close menu when clicking outside or on a link
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !menuContainer.contains(e.target)) {
        menuContainer.classList.remove('active');
      }
    });

    menuContainer.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        menuContainer.classList.remove('active');
      }
    });
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  populateMovies();
  populateMoviesGrid(); // Add this for movies page
  if (slides.length > 0) {
    createDots();
    showSlide(currentSlide); // Initialize first slide
    startAutoSlide();
    pauseOnHover();
  }
  initializeWatchlist();
  initializeHamburgerMenu(); // Add hamburger menu functionality

  // Add scroll event listener for infinite scroll on movies page
  const moviesGrid = document.getElementById('moviesGrid');
  if (moviesGrid) {
    window.addEventListener('scroll', handleScroll);
  }
});

