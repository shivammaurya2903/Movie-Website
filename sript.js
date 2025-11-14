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
    const res = await fetch("assets/hdhub_data.csv");
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
        <img class="movie-list-item-img" src="${movie.image_url}" alt="${movie.clean_title}">
        <span class="movie-list-item-title">${movie.clean_title}</span>
        <div class="movie-item-actions">
          <a href="${movie.movie_link}" target="_blank" class="movie-list-item-button">Download</a>
          <button class="movie-list-item-watchlist">Add to Watchlist</button>
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
  banner.addEventListener('mouseenter', () => {
    isPaused = true;
  });
  banner.addEventListener('mouseleave', () => {
    isPaused = false;
  });
}

// Event listeners for arrows
document.getElementById('prevBtn').addEventListener('click', prevSlide);
document.getElementById('nextBtn').addEventListener('click', nextSlide);

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  populateMovies();
  createDots();
  showSlide(currentSlide); // Initialize first slide
  startAutoSlide();
  pauseOnHover();
});

