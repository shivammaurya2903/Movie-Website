# TODO: Implement Scroll-Based Loading of Random Movies

- [x] Add a global flag `isLoading` to prevent multiple simultaneous loads.
- [x] Create a `loadRandomMovies` function that selects 10 random movies from `allMovies`, creates a new `movie-list-container` section titled "More Movies", and appends it to the container.
- [x] Add a scroll event listener to the window that checks if the user is near the bottom of the page (e.g., within 100px), and if not loading, calls `loadRandomMovies`.
- [x] Ensure the new section uses the same HTML structure as existing sections for consistency.
