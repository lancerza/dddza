// --- ▼▼▼ FIREBASE CONFIG (Your actual config) ▼▼▼ ---
const firebaseConfig = {
    apiKey: "AIzaSyBroNOP-3UiCxKO7OpT6RAA7NebSs8HS30", // Replace with your actual API key if needed, otherwise leave as is for Canvas environment
    authDomain: "flowtv-login.firebaseapp.com",
    projectId: "flowtv-login",
    storageBucket: "flowtv-login.firebaseapp.com", // Corrected typo here
    messagingSenderId: "538439748085",
    appId: "1:538439748085:web:9b115aef758fe3edf2b8bc"
};
// --- ▲▲▲ Config End ▲▲▲ ---


// --- Initialize Firebase (using compat libraries) ---
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Get DOM Elements ---
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const btnRegister = document.getElementById('btn-register');
const registerError = document.getElementById('register-error');

const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const premiumBadge = document.getElementById('premium-badge');

const movieSection = document.getElementById('movie-section'); // Container for search, player, list
const searchContainer = document.querySelector('.search-container');
const searchBar = document.getElementById('search-bar');
const playerDiv = document.getElementById('player-container');
const playerHr = document.getElementById('player-hr'); // HR after player
const movieListContainer = document.getElementById('movie-list-container');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

// (★ ใหม่) Profile Page Elements
const profileLink = document.getElementById('profile-link');
const profileContainer = document.getElementById('profile-container');
const backToMoviesBtn = document.getElementById('back-to-movies-btn');
const profileEmail = document.getElementById('profile-email');
const profileStatus = document.getElementById('profile-status');
const profileExpiry = document.getElementById('profile-expiry');
const changePasswordBtn = document.getElementById('change-password-btn');
const profileWatchHistory = document.getElementById('profile-watch-history');
const historyLoadingMsg = document.getElementById('history-loading-msg');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// (★ ใหม่) Genre Filter & Load More Elements
const genreFilter = document.getElementById('genre-filter');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// (★ ใหม่) Custom Dialog Elements
const customDialogBackdrop = document.getElementById('custom-dialog-backdrop');
const customDialog = document.getElementById('custom-dialog');
const customDialogTitle = document.getElementById('custom-dialog-title');
const customDialogMessage = document.getElementById('custom-dialog-message');
const customDialogOk = document.getElementById('custom-dialog-ok');
const customDialogConfirm = document.getElementById('custom-dialog-confirm');
const customDialogCancel = document.getElementById('custom-dialog-cancel');

// --- Global Variables ---
let allMovies = []; // All movies fetched from source
let currentlyDisplayedMovies = []; // Movies currently being shown (filtered/paginated)
let genres = []; // List of unique genres
let currentUserProfile = null;
let currentPage = 1; // For pagination
const itemsPerPage = 12; // Movies per page/load

// --- Auth Functions & Page Toggling ---
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'block'; registerForm.style.display = 'none'; });

btnRegister.addEventListener('click', (e) => {
    e.preventDefault();
    const email = registerEmail.value;
    const password = registerPassword.value;
    registerError.style.display = 'none';
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Registered successfully:', userCredential.user.uid);
            const newUserProfile = { email: email, isPremium: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
            db.collection('users').doc(userCredential.user.uid).set(newUserProfile)
                .then(() => console.log("User profile created"))
                .catch(err => console.error("Error creating profile:", err));
        })
        .catch((error) => {
            console.error('Registration failed:', error.message);
            showCustomAlert(`สมัครสมาชิกล้มเหลว: ${getFirebaseAuthErrorMessage(error)}`); // Use custom alert
            registerError.textContent = `สมัครสมาชิกล้มเหลว: ${getFirebaseAuthErrorMessage(error)}`;
            registerError.style.display = 'block';
        });
});

btnLogin.addEventListener('click', (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;
    loginError.style.display = 'none';
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Logged in successfully:', userCredential.user.uid);
        })
        .catch((error) => {
            console.error('Login failed:', error.message);
            showCustomAlert(`ล็อกอินล้มเหลว: ${getFirebaseAuthErrorMessage(error)}`); // Use custom alert
            loginError.textContent = `ล็อกอินล้มเหลว: ${getFirebaseAuthErrorMessage(error)}`;
            loginError.style.display = 'block';
        });
});

btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log('Logged out successfully');
        try {
            const playerInstance = jwplayer("player-container");
            if (playerInstance && typeof playerInstance.remove === 'function') { playerInstance.remove(); }
        } catch(e) { console.warn("Could not remove player:", e.message); }
        playerDiv.style.display = 'none';
        playerHr.style.display = 'none';
        playerDiv.innerHTML = '';
    });
});

// --- Modal Functions ---
modalCloseBtn.addEventListener('click', () => { closeModal(); });
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) { closeModal(); } });

function closeModal() {
    modalBackdrop.style.display = 'none';
    modalBody.innerHTML = '';
}

// --- (★ ใหม่) Custom Dialog Functions ---
let confirmCallback = null; // Store callback for confirm dialog

function showCustomAlert(message, title = "แจ้งเตือน") {
    customDialogTitle.textContent = title;
    customDialogMessage.textContent = message;
    customDialogOk.style.display = 'inline-flex';
    customDialogConfirm.style.display = 'none';
    customDialogCancel.style.display = 'none';
    customDialogBackdrop.style.display = 'flex';
    // Use timeout to allow display:flex to apply before adding class for transition
    setTimeout(() => customDialogBackdrop.classList.add('visible'), 10);
}

function showCustomConfirm(message, title = "ยืนยัน", callback) {
    customDialogTitle.textContent = title;
    customDialogMessage.textContent = message;
    customDialogOk.style.display = 'none';
    customDialogConfirm.style.display = 'inline-flex';
    customDialogCancel.style.display = 'inline-flex';
    confirmCallback = callback; // Store the callback
    customDialogBackdrop.style.display = 'flex';
    setTimeout(() => customDialogBackdrop.classList.add('visible'), 10);
}

function closeCustomDialog() {
    customDialogBackdrop.classList.remove('visible');
    // Use transitionend event listener for smoother closing? For now, timeout.
    setTimeout(() => {
        customDialogBackdrop.style.display = 'none';
        confirmCallback = null; // Clear callback
    }, 200); // Match CSS transition duration
}

// Add event listeners for dialog buttons
customDialogOk.addEventListener('click', closeCustomDialog);
customDialogCancel.addEventListener('click', closeCustomDialog);
customDialogConfirm.addEventListener('click', () => {
    if (typeof confirmCallback === 'function') {
        confirmCallback(); // Execute the stored callback
    }
    closeCustomDialog();
});
customDialogBackdrop.addEventListener('click', (e) => {
    if (e.target === customDialogBackdrop) {
        closeCustomDialog(); // Close if clicking backdrop
    }
});


// --- Debounce Function ---
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Search Functionality (Debounced) ---
const debouncedSearch = debounce(() => {
    filterAndDisplayMovies(); // Use combined filter function
}, 300);
searchBar.addEventListener('input', debouncedSearch);

// --- (★ ใหม่) Genre Filter Functionality ---
genreFilter.addEventListener('change', () => {
    filterAndDisplayMovies(); // Use combined filter function
});


// --- Auth State Change Listener ---
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('User signed in:', user.uid);
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserProfile = doc.data();
                    console.log("Profile loaded:", currentUserProfile);
                } else {
                    currentUserProfile = { email: user.email, isPremium: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                    db.collection('users').doc(user.uid).set(currentUserProfile);
                    console.log('Profile created (fallback)');
                }
                // Update UI
                authContainer.style.display = 'none';
                appContainer.style.display = 'block';
                showMovieSection();
                userEmailDisplay.textContent = currentUserProfile.email || user.email;
                premiumBadge.style.display = currentUserProfile.isPremium ? 'inline-block' : 'none';

                // Fetch "Continue Watching" first, then other movies
                fetchAndRenderContinueWatching().then(() => {
                    if (allMovies.length === 0) {
                        fetchMovies(); // This will trigger initial render via filterAndDisplayMovies
                    } else {
                        populateGenreFilter(); // Populate genres if movies already loaded
                        filterAndDisplayMovies(); // Display initial page
                    }
                });

            }).catch((error) => {
                console.error("Error getting profile:", error);
                currentUserProfile = { email: user.email, isPremium: false }; // Fallback profile
                userEmailDisplay.textContent = user.email; premiumBadge.style.display = 'none';
                authContainer.style.display = 'none'; appContainer.style.display = 'block';
                showMovieSection();
                 // Still try to fetch content
                 fetchAndRenderContinueWatching().then(() => {
                     if (allMovies.length === 0) { fetchMovies(); }
                     else { populateGenreFilter(); filterAndDisplayMovies(); }
                 });
            });
    } else {
        // User is signed out
        console.log('User signed out');
        // Reset state and UI
        currentUserProfile = null; allMovies = []; currentlyDisplayedMovies = []; genres = []; currentPage = 1;
        authContainer.style.display = 'block'; appContainer.style.display = 'none';
        premiumBadge.style.display = 'none'; movieListContainer.innerHTML = '';
        profileContainer.style.display = 'none'; movieSection.style.display = 'none';
        loginError.style.display = 'none'; registerError.style.display = 'none';
        loginForm.reset(); registerForm.reset(); searchBar.value = ''; genreFilter.value = 'all';
        loadMoreContainer.style.display = 'none';
    }
});

// --- Navigation between Movie List and Profile ---
profileLink.addEventListener('click', (e) => { e.preventDefault(); showProfileSection(); loadProfileData(); });
backToMoviesBtn.addEventListener('click', (e) => { e.preventDefault(); showMovieSection(); });

function showMovieSection() {
    profileContainer.style.display = 'none';
    movieSection.style.display = 'block';
     if(auth.currentUser) fetchAndRenderContinueWatching(); // Refresh CW on return
}

function showProfileSection() {
    movieSection.style.display = 'none';
    profileContainer.style.display = 'block';
}


// --- Fetch Movie Data ---
// Fetches ALL movies initially. Pagination is handled client-side in filterAndDisplayMovies.
function fetchMovies() {
    // Show Skeleton Loader only if continue watching isn't already there
    if (!document.getElementById('continue-watching-row') && !movieListContainer.querySelector('p[style*="color: red"]')) {
        let skeletonHTML = ''; /* ... Skeleton HTML ... */
         const skeletonGrid = `
            <div class="movie-grid">
                <div class="skeleton-card"></div> <div class="skeleton-card"></div> <div class="skeleton-card"></div>
                <div class="skeleton-card"></div> <div class="skeleton-card"></div>
            </div>`;
        skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
        skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
        movieListContainer.innerHTML += skeletonHTML;
    }

    // ★★★ Ensure this URL points to your updated data.json ★★★
    const dataUrl = 'https://raw.githubusercontent.com/lancerza/dddza/main/data.json';
    const cacheBustUrl = dataUrl + '?cachebust=' + Date.now();

    fetch(cacheBustUrl)
        .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("Fetched data is not an array");
            allMovies = data; // Store ALL movies globally
            console.log("All movies loaded:", allMovies.length);
            populateGenreFilter(); // Populate filter dropdown
            filterAndDisplayMovies(); // Display the first page
        })
        .catch((error) => {
            console.error("Error fetching movies:", error);
            const skeletons = movieListContainer.querySelectorAll('.skeleton-title, .skeleton-card, .movie-grid'); // Select grid too
            skeletons.forEach(el => el.remove()); // Clear all skeletons
            const errorElement = document.createElement('p');
            errorElement.style.color = 'red';
            errorElement.textContent = `เกิดข้อผิดพลาดในการโหลดข้อมูลหนัง: ${error.message}`;
            movieListContainer.appendChild(errorElement);
        });
}

// --- (★ ใหม่) Populate Genre Filter Dropdown ---
function populateGenreFilter() {
    // Extract unique genres from allMovies
    const uniqueGenres = [...new Set(allMovies.flatMap(movie => movie.genre ? movie.genre.split(',').map(g => g.trim()) : []))]
                         .filter(genre => genre) // Remove empty strings
                         .sort(); // Sort alphabetically

    genres = ['all', ...uniqueGenres]; // Store globally if needed

    // Clear existing options except "All"
    genreFilter.innerHTML = '<option value="all">ทั้งหมด</option>';

    // Add options for each unique genre
    uniqueGenres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });
    console.log("Genres populated:", uniqueGenres.length);
}

// --- (★ ใหม่) Filter Movies based on Search and Genre ---
function filterMovies() {
    const searchTerm = searchBar.value.toLowerCase().trim();
    const selectedGenre = genreFilter.value;

    console.log(`Filtering with search: "${searchTerm}", genre: "${selectedGenre}"`);

    let filtered = allMovies;

    // Apply genre filter first
    if (selectedGenre !== 'all') {
        filtered = filtered.filter(movie =>
            movie.genre && movie.genre.toLowerCase().split(',').map(g => g.trim()).includes(selectedGenre.toLowerCase())
        );
    }

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(movie =>
            movie.title.toLowerCase().includes(searchTerm) ||
            (movie.genre && movie.genre.toLowerCase().includes(searchTerm))
            // Add more fields to search if needed (e.g., description_short)
            // || (movie.description_short && movie.description_short.toLowerCase().includes(searchTerm))
        );
    }
    console.log("Filtered movies count:", filtered.length);
    return filtered;
}

// --- (★ ใหม่) Combined Filter and Display Logic with Pagination ---
function filterAndDisplayMovies(loadMore = false) {
    if (!loadMore) {
        currentPage = 1; // Reset to first page if not loading more
    }

    const filtered = filterMovies(); // Get all filtered movies
    currentlyDisplayedMovies = filtered; // Store the full filtered list

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const moviesToDisplay = currentlyDisplayedMovies.slice(startIndex, endIndex); // Get movies for the current page(s)

    console.log(`Displaying page ${currentPage}, items ${startIndex + 1}-${Math.min(endIndex, currentlyDisplayedMovies.length)} of ${currentlyDisplayedMovies.length}`);

    // Render only the movies for the current page(s)
    // Pass `!loadMore` to `clearPreviousRows`: clear if it's a new filter, append if loading more
    renderMovieRows(moviesToDisplay, !loadMore);

    // Show/hide "Load More" button
    if (endIndex < currentlyDisplayedMovies.length) {
        loadMoreContainer.style.display = 'block'; // Show button if more movies exist
    } else {
        loadMoreContainer.style.display = 'none'; // Hide button if all movies are shown
    }
}

// --- (★ ใหม่) Load More Button Handler ---
loadMoreBtn.addEventListener('click', () => {
    currentPage++; // Go to the next page
    filterAndDisplayMovies(true); // Load more (append)
});


// --- Fetch and Render Continue Watching Row ---
async function fetchAndRenderContinueWatching() {
    const existingRow = document.getElementById('continue-watching-row');
    if (existingRow) existingRow.remove();
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const historyRef = db.collection('users').doc(userId).collection('watchHistory');
    console.log("Fetching continue watching...");
    try {
        const snapshot = await historyRef.orderBy('lastWatched', 'desc').limit(10).get();
        if (snapshot.empty) { console.log("No watch history."); return; }
        const watchHistoryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Simpler map
        console.log("History items fetched:", watchHistoryItems.length);

        const continueWatchingContainer = document.createElement('div');
        continueWatchingContainer.id = 'continue-watching-row';
        const titleElement = document.createElement('h2');
        titleElement.textContent = 'ดูต่อสำหรับคุณ';
        continueWatchingContainer.appendChild(titleElement);
        const movieGrid = document.createElement('div');
        movieGrid.className = 'movie-grid';

        watchHistoryItems.forEach(item => {
             if (!item.title || typeof item.position !== 'number' || typeof item.duration !== 'number' || item.duration <= 0) {
                 console.warn("Skipping invalid history item:", item.id); return;
             }
            const movieElement = document.createElement('div');
            movieElement.className = 'movie-item continue-watching-item';
            const percentage = Math.min(100, Math.max(0, (item.position / item.duration) * 100));
            const poster = item.posterUrl || `https://placehold.co/180x270/EDF2F7/718096?text=Loading&font=inter`;
            const displayTitle = item.title || 'ไม่มีชื่อเรื่อง';
            const displayDesc = item.genre || 'N/A';

             movieElement.innerHTML = `
                <a href="#" class="movie-link" title="ดูต่อ: ${displayTitle}">
                    <div class="box-img">
                        <img class="movie-poster" src="${poster}" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/180x270/E53E3E/FFFFFF?text=Error&font=inter';">
                        <div class="progress-bar-container"><div class="progress-bar" style="width: ${percentage.toFixed(1)}%;"></div></div>
                        ${item.isHD ? '<span class="badge badge-top-right">HD</span>' : ''}
                        ${item.rating > 0 ? `<span class="badge badge-top-left">⭐ ${item.rating.toFixed(1)}</span>` : ''}
                        ${item.episodeInfo ? `<span class="badge badge-bottom-right">${item.episodeInfo}</span>` : ''}
                        ${item.isPremium ? '<span class="badge badge-bottom-left">👑</span>' : ''}
                    </div>
                    <div class="p-box"><div class="p1">${displayDesc}</div><div class="p2">${displayTitle}</div></div>
                </a>`;
             movieElement.querySelector('.movie-link').addEventListener('click', (e) => {
                 e.preventDefault();
                 const fullMovieData = findMovieDataByContentId(item.id);
                 if (fullMovieData) { openModal(fullMovieData); }
                 else { console.warn("Could not find full data for:", item.id); showCustomAlert(`ขออภัย ไม่พบข้อมูลสำหรับ "${item.title}"`); } // Use custom alert
             });
            movieGrid.appendChild(movieElement);
        });
        continueWatchingContainer.appendChild(movieGrid);
        movieListContainer.prepend(continueWatchingContainer);
        console.log("Continue Watching row rendered.");
    } catch (error) { console.error("Error fetching/rendering continue watching:", error); }
}

// --- (★ Adjust) Render Movie Rows (Handles Appending/Clearing) ---
// Now renders only the movies passed to it. Clearing/appending is handled by filterAndDisplayMovies.
function renderMovieRows(moviesToRender, clearPreviousRegularRows = true) {

    // --- Refined Clearing Logic ---
    if (clearPreviousRegularRows) {
        // Select only regular movie rows (H2, .movie-grid, p) to remove
        const rowsToRemove = movieListContainer.querySelectorAll(':scope > h2:not(#continue-watching-row h2), :scope > .movie-grid:not(#continue-watching-row .movie-grid), :scope > p');
        rowsToRemove.forEach(row => row.remove());
         // Also clear potential skeletons if clearing
         const skeletons = movieListContainer.querySelectorAll('.skeleton-title, .skeleton-card');
         skeletons.forEach(el => el.closest('.movie-grid')?.remove() || el.remove());
    }

    if (!Array.isArray(moviesToRender) || moviesToRender.length === 0) {
        // Show "not found" only if this function was asked to clear previous rows
        // AND the container is now empty (or just has the CW row).
        const otherContentExists = Array.from(movieListContainer.children).some(el => el.id !== 'continue-watching-row');
        if (clearPreviousRegularRows && !otherContentExists) {
            const noResults = document.createElement('p');
            noResults.textContent = 'ไม่พบซีรี่ส์ที่ตรงกับเงื่อนไข';
            movieListContainer.appendChild(noResults);
        }
        return; // Exit if no movies to render in this batch
    }

    // --- Grouping & Ordering (Only for the movies passed) ---
    const moviesByCategory = moviesToRender.reduce((groups, movie) => { const category = movie.category || 'อื่นๆ'; if (!groups[category]) groups[category] = []; groups[category].push(movie); return groups; }, {});
    const preferredOrder = ['หนังไทย', 'ซีรี่ส์ฝรั่ง', 'ซีรี่ส์เกาหลี', 'การ์ตูน']; // ★ Adjust order if needed
    const otherCategories = Object.keys(moviesByCategory).filter(cat => !preferredOrder.includes(cat) && cat !== 'อื่นๆ').sort();
    const finalOrder = [...preferredOrder, ...otherCategories];
    if (moviesByCategory['อื่นๆ']) finalOrder.push('อื่นๆ');

    // --- Loop through ordered categories and render/append rows ---
    finalOrder.forEach(category => {
        const moviesInCategory = moviesByCategory[category];
        if (moviesInCategory && moviesInCategory.length > 0) {
            // Check if a title for this category already exists (from previous load)
            let categoryTitle = movieListContainer.querySelector(`h2[data-category="${category}"]`);
            if (!categoryTitle) {
                categoryTitle = document.createElement('h2');
                categoryTitle.textContent = category;
                categoryTitle.dataset.category = category; // Add data attribute to find later
                movieListContainer.appendChild(categoryTitle); // Append new title
            }

            // Check if a grid for this category already exists
            let movieGrid = movieListContainer.querySelector(`.movie-grid[data-category="${category}"]`);
            if (!movieGrid) {
                movieGrid = document.createElement('div');
                movieGrid.className = 'movie-grid';
                movieGrid.dataset.category = category;
                // Insert grid after its title
                if (categoryTitle.nextSibling) {
                     movieListContainer.insertBefore(movieGrid, categoryTitle.nextSibling);
                } else {
                     movieListContainer.appendChild(movieGrid);
                }
            }

            // Append movie cards to the grid (either new or existing)
            moviesInCategory.forEach((movie) => {
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';
                // Prepare data...
                const isPremium = movie.isPremium || false; const isHD = movie.isHD || false; const rating = movie.rating || 0;
                const epInfo = movie.episodeInfo || ''; const desc = movie.description_short || movie.genre || 'N/A';
                const poster = movie.posterUrl || `https://placehold.co/180x270/EDF2F7/718096?text=No+Image&font=inter`;
                const title = movie.title || 'ไม่มีชื่อเรื่อง';
                // Create card HTML...
                movieElement.innerHTML = `
                    <a href="#" class="movie-link" title="${title}">
                        <div class="box-img">
                            <img class="movie-poster" src="${poster}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/180x270/E53E3E/FFFFFF?text=Error&font=inter';">
                            ${isHD ? '<span class="badge badge-top-right">HD</span>' : ''}
                            ${rating > 0 ? `<span class="badge badge-top-left">⭐ ${rating.toFixed(1)}</span>` : ''}
                            ${epInfo ? `<span class="badge badge-bottom-right">${epInfo}</span>` : ''}
                            ${isPremium ? '<span class="badge badge-bottom-left">👑</span>' : ''}
                        </div>
                        <div class="p-box"><div class="p1">${desc}</div><div class="p2">${title}</div></div>
                    </a>`;
                // Add listener...
                movieElement.querySelector('.movie-link').addEventListener('click', (e) => { e.preventDefault(); openModal(movie); });
                movieGrid.appendChild(movieElement); // Append card to its category grid
            });
        }
    });
     // Remove potential skeleton loaders that might still be present after rendering actual data
     const skeletons = movieListContainer.querySelectorAll('.skeleton-title, .skeleton-card');
     skeletons.forEach(el => el.closest('.movie-grid')?.remove() || el.remove());
}


// --- Open Modal Function ---
function openModal(movie) {
    if (!movie) return;
    modalBody.innerHTML = `...`; // Same content generation as before
    const episodesList = document.getElementById('modal-episodes');
    const titleType = document.getElementById('modal-title-type');
    if (movie.episodes && Array.isArray(movie.episodes) && movie.episodes.length > 0) {
        titleType.textContent = 'ตอนทั้งหมด';
        movie.episodes.forEach((ep, index) => { if(ep.title && ep.streamUrl) { episodesList.appendChild(createPlayButton(ep.title, movie, ep.streamUrl)); } else { console.warn(`Ep ${index+1} missing data`); } });
    } else if (movie.streamUrl) {
        titleType.textContent = 'รับชม';
        episodesList.appendChild(createPlayButton('▶ เล่นเลย', movie, movie.streamUrl));
    } else {
        titleType.textContent = 'ข้อมูล';
        episodesList.innerHTML = '<p>ยังไม่มีลิงก์สำหรับรับชม</p>';
    }
    modalBackdrop.style.display = 'flex';
}

// --- Create Play Button (for Modal) ---
function createPlayButton(buttonText, movie, streamUrl) {
    const playButton = document.createElement('button'); playButton.className = 'play-button btn btn-light'; // Apply base btn class
    const isMoviePremium = movie.isPremium || false;
    const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false;
    playButton.textContent = (isMoviePremium ? '👑 ' : '▶ ') + buttonText;
    if (isMoviePremium) { playButton.classList.add(isUserPremium ? 'premium-unlocked' : 'premium-locked'); }
    // Update classes for premium states
    if (isMoviePremium && isUserPremium) { playButton.classList.replace('btn-light', 'btn-primary'); } // Unlocked Premium
    else if (isMoviePremium && !isUserPremium) { playButton.disabled = true; } // Locked Premium

    const contentId = movie.episodes ? `${movie.title} | ${buttonText}` : movie.title;
    playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMoviePremium && !isUserPremium) { showCustomAlert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!'); } // Use custom alert
        else if (streamUrl) { closeModal(); playMovie(streamUrl, contentId); }
        else { showCustomAlert('ไม่พบลิงก์สำหรับเล่น'); } // Use custom alert
    });
    return playButton;
}


// --- Play Movie Function (Adjusted Scroll & Autoplay) ---
async function playMovie(videoUrl, contentId) {
    console.log(`Attempting to play: ${contentId} from URL: ${videoUrl}`);
    playerDiv.style.display = 'block'; playerHr.style.display = 'block';
    playerDiv.innerHTML = ''; // Clear previous errors/player
    const autoplayMsg = document.getElementById('autoplay-blocked-msg'); // Get autoplay message element
    if (autoplayMsg) autoplayMsg.style.display = 'none'; // Hide initially

    let savedPosition = 0; let docRef = null;

    // --- 1. Load Watch History ---
    if (auth.currentUser && contentId) { /* ... Same loading logic ... */ try { docRef = db.collection('users').doc(auth.currentUser.uid).collection('watchHistory').doc(contentId); const doc = await docRef.get(); if (doc.exists && typeof doc.data().position === 'number') { savedPosition = doc.data().position; const duration = typeof doc.data().duration === 'number' ? doc.data().duration : 0; if(duration > 0 && savedPosition > duration - 30) savedPosition = 0; else if (savedPosition > 0) console.log(`Resuming at: ${savedPosition.toFixed(2)}s`); } } catch (e) { console.error("Error getting history:", e); } } else { console.log("Cannot load history."); }

    // --- 2. Setup Player ---
    try {
        const playerInstance = jwplayer("player-container").setup({
            file: videoUrl, type: "hls", width: "100%", aspectratio: "16:9",
            autoplay: true, // Attempt autoplay
            starttime: Math.max(0, savedPosition - 5)
        });

        // --- Handle 'ready' event for scrolling and forcing play ---
        playerInstance.on('ready', () => {
             console.log("Player ready, scrolling into view...");
             playerDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Scroll top of player to top
             // No explicit play() here, rely on autoplay first
        });

        // --- (★ Adjust) Handle Autoplay Blocked ---
        playerInstance.on('autoplayBlocked', () => {
             console.warn("Autoplay was blocked.");
             if (autoplayMsg) {
                 autoplayMsg.style.display = 'flex'; // Show the overlay message
                 const playAnywayBtn = document.getElementById('play-anyway-btn');
                 // Add a ONE-TIME listener to the button
                 playAnywayBtn.onclick = () => { // Use onclick for simplicity here
                      console.log("Play Anyway button clicked");
                      playerInstance.play(true); // Force play on click
                      autoplayMsg.style.display = 'none'; // Hide message
                      playAnywayBtn.onclick = null; // Remove listener
                 };
             }
        });


        // --- 3. Save Watch History (Same logic) ---
        if (docRef) { /* ... Same saving logic ... */ let lastSaveTime = 0; const saveInterval = 10000; const currentMovieData = findMovieDataByContentId(contentId); playerInstance.on('time', (event) => { const now = Date.now(); if (now - lastSaveTime > saveInterval) { const currentPosition = event.position; const duration = event.duration; if (duration > 0 && currentPosition > 5 && (duration - currentPosition) > 30) { const historyData = { position: currentPosition, lastWatched: firebase.firestore.FieldValue.serverTimestamp(), duration: duration, title: currentMovieData?.title || movieTitleFromContentId(contentId), posterUrl: currentMovieData?.posterUrl || null, genre: currentMovieData?.genre || null, isHD: currentMovieData?.isHD || false, rating: currentMovieData?.rating || 0, isPremium: currentMovieData?.isPremium || false, episodeInfo: currentMovieData?.episodes ? findEpisodeInfo(contentId, currentMovieData) : (currentMovieData?.episodeInfo || null) }; Object.keys(historyData).forEach(key => (historyData[key] == null) && delete historyData[key]); docRef.set(historyData, { merge: true }).catch(err => console.error("Error saving history:", err)); lastSaveTime = now; } } }); playerInstance.on('complete', () => { console.log(`Playback complete for ${contentId}, deleting history.`); docRef.delete().catch(err => console.error("Error deleting history:", err)); }); }

        // --- 4. Handle Errors (Same logic) ---
        playerInstance.on('error', (event) => { /* ... Same error handling ... */ console.error(`JW Player Error (${event.code}): ${event.message}`, event); playerDiv.innerHTML = `<div class="player-error-message"><h3>Error (${event.code})</h3><p>Could not play video.</p><p>(${event.message})</p></div>`; playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    } catch (e) { /* ... Same setup error handling ... */ console.error("Error setting up Player:", e); playerDiv.innerHTML = `<p style="color:red; padding:1rem;">Error loading player.</p>`; playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}


// --- Load Profile Data Function ---
async function loadProfileData() {
    if (!currentUserProfile || !auth.currentUser) { console.error("Cannot load profile data."); /* ... Set defaults ... */ profileEmail.textContent = 'N/A'; profileStatus.textContent = 'N/A'; profileExpiry.textContent = 'N/A'; profileWatchHistory.innerHTML = '<p id="history-loading-msg">Please log in.</p>'; return; }
    const userId = auth.currentUser.uid;
    // --- Populate Account Details ---
    profileEmail.textContent = currentUserProfile.email || 'No email';
    profileStatus.textContent = currentUserProfile.isPremium ? '👑 Premium' : 'Standard Member';
    // --- Populate Premium Expiry ---
    const expirySpan = profileExpiry;
    if (currentUserProfile.isPremium && currentUserProfile.premiumExpiry?.toDate) { /* ... Same expiry logic ... */ try { const expiryDate = currentUserProfile.premiumExpiry.toDate(); const now = new Date(); if (expiryDate < now) { expirySpan.textContent = `Expired (${expiryDate.toLocaleDateString('th-TH')})`; expirySpan.style.color = 'red'; } else { expirySpan.textContent = expiryDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }); expirySpan.style.color = 'green'; } } catch (e) { console.error("Error processing expiry:", e); expirySpan.textContent = 'Invalid date'; expirySpan.style.color = 'orange'; } } else if (currentUserProfile.isPremium) { expirySpan.textContent = 'Lifetime / Not set'; expirySpan.style.color = 'green'; } else { expirySpan.textContent = 'N/A'; expirySpan.style.color = 'inherit'; }
    // --- Populate Watch History ---
    profileWatchHistory.innerHTML = '<p id="history-loading-msg">Loading history...</p>';
    try {
        const historyRef = db.collection('users').doc(userId).collection('watchHistory');
        const snapshot = await historyRef.orderBy('lastWatched', 'desc').limit(20).get();
        const loadingMsgElement = profileWatchHistory.querySelector('#history-loading-msg');
        if (snapshot.empty) { if(loadingMsgElement) loadingMsgElement.textContent = 'No watch history yet.'; return; }
        if(loadingMsgElement) loadingMsgElement.remove();
        snapshot.forEach(doc => { /* ... Same history item creation logic ... */ const item = { id: doc.id, ...doc.data() }; if (!item.title || !item.lastWatched?.toDate) { console.warn("Skipping bad history item:", item.id); return; } const historyItemElement = document.createElement('div'); historyItemElement.className = 'history-item'; const poster = item.posterUrl || `https://placehold.co/60x90/EDF2F7/718096?text=?&font=inter`; const displayTitle = item.title || 'No Title'; const lastWatchedDate = item.lastWatched.toDate(); const formattedDate = lastWatchedDate.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); const percentage = (item.duration > 0) ? Math.min(100, Math.max(0, (item.position / item.duration) * 100)) : 0; historyItemElement.innerHTML = `<img src="${poster}" alt="" loading="lazy" onerror="this.onerror=null; this.src='...';"><div class="history-item-info"><h4>${displayTitle}</h4>${item.episodeInfo ? `<p>${item.episodeInfo}</p>` : ''}<p class="history-date">Watched: ${formattedDate}</p></div><div class="progress-bar-container"><div class="progress-bar" style="width: ${percentage.toFixed(1)}%;"></div></div>`; historyItemElement.addEventListener('click', () => { const fullMovieData = findMovieDataByContentId(item.id); if (fullMovieData) { showMovieSection(); setTimeout(() => openModal(fullMovieData), 50); } else { showCustomAlert(`Data not found for "${item.title}"`); } }); profileWatchHistory.appendChild(historyItemElement); });
    } catch (error) { /* ... Same error handling ... */ console.error("Error fetching history:", error); const loadingMsgElement = profileWatchHistory.querySelector('#history-loading-msg'); if(loadingMsgElement) { loadingMsgElement.textContent = 'Error loading history.'; loadingMsgElement.style.color = 'red'; } else { profileWatchHistory.innerHTML = '<p style="color:red;">Error loading history.</p>'; } }
}

// --- Change Password Function ---
changePasswordBtn.addEventListener('click', () => {
    if (!currentUserProfile || !currentUserProfile.email) { showCustomAlert('Cannot find email to send reset link.'); return; }
    const email = currentUserProfile.email;
    auth.sendPasswordResetEmail(email)
        .then(() => { showCustomAlert(`Password reset link sent to ${email}. Please check your inbox (and spam folder).`); })
        .catch((error) => { console.error("Reset email error:", error); showCustomAlert(`Error sending reset email: ${getFirebaseAuthErrorMessage(error)}`); });
});

// --- Clear Watch History Function ---
clearHistoryBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    // Use Custom Confirm
    showCustomConfirm("Are you sure you want to clear all watch history? This cannot be undone.", "Confirm Clear History", async () => {
        const userId = auth.currentUser.uid;
        const historyRef = db.collection('users').doc(userId).collection('watchHistory');
        clearHistoryBtn.textContent = 'Clearing...'; clearHistoryBtn.disabled = true;
        try {
            let deletedCount = 0; let snapshot;
            do { // Loop to delete in batches
                snapshot = await historyRef.limit(100).get();
                if (!snapshot.empty) {
                    const batch = db.batch(); snapshot.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
                    deletedCount += snapshot.size; console.log(`Deleted ${snapshot.size}...`);
                }
            } while (!snapshot.empty);
            console.log(`Total deleted: ${deletedCount}`);
            showCustomAlert('Watch history cleared successfully.'); // Use custom alert
            loadProfileData(); // Reload profile
        } catch (error) { console.error("Clear history error:", error); showCustomAlert(`Error clearing history: ${error.message}`); }
        finally { clearHistoryBtn.textContent = 'ล้างประวัติการดูทั้งหมด'; clearHistoryBtn.disabled = false; } // Reset button
    });
});


// --- Helper functions ---
function movieTitleFromContentId(contentId) { /*...*/ if (!contentId) return 'Unknown Title'; return contentId.includes(' | ') ? contentId.split(' | ')[0].trim() : contentId.trim(); }
function findMovieDataByContentId(contentId) { /*...*/ if (!contentId || !Array.isArray(allMovies)) return null; const title = movieTitleFromContentId(contentId); return allMovies.find(m => m.title === title) || null; }
function findEpisodeInfo(contentId, movieData) { /*...*/ if (!contentId || !movieData || !movieData.episodes || !contentId.includes(' | ')) { return movieData?.episodeInfo || null; } const parts = contentId.split(' | '); const episodeTitle = parts.length > 1 ? parts[1].trim() : null; return episodeTitle; }
function getFirebaseAuthErrorMessage(error) { /*...*/ switch (error.code) { case 'auth/invalid-email': return 'Invalid email format'; case 'auth/user-disabled': return 'User disabled'; case 'auth/user-not-found': return 'User not found'; case 'auth/wrong-password': return 'Incorrect password'; case 'auth/email-already-in-use': return 'Email already in use'; case 'auth/weak-password': return 'Password should be at least 6 characters'; case 'auth/operation-not-allowed': return 'Operation not allowed'; case 'auth/network-request-failed': return 'Network error'; case 'auth/too-many-requests': return 'Too many requests, try again later'; case 'auth/requires-recent-login': return 'Requires recent login, please sign out and sign in again'; default: return error.message; } }

