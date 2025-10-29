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


// --- Global Variables ---
let allMovies = [];
let currentUserProfile = null;

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
            const newUserProfile = { email: email, isPremium: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() }; // Add createdAt
            db.collection('users').doc(userCredential.user.uid).set(newUserProfile)
                .then(() => console.log("User profile created"))
                .catch(err => console.error("Error creating profile:", err));
        })
        .catch((error) => {
            console.error('Registration failed:', error.message);
            registerError.textContent = `สมัครสมาชิกล้มเหลว: ${getFirebaseAuthErrorMessage(error)}`; // Use helper for better messages
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
            loginError.textContent = `ล็อกอินล้มเหลว: ${getFirebaseAuthErrorMessage(error)}`; // Use helper
            loginError.style.display = 'block';
        });
});

btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log('Logged out successfully');
        try { // Gracefully remove player
            const playerInstance = jwplayer("player-container");
            if (playerInstance && typeof playerInstance.remove === 'function') {
                 playerInstance.remove();
            }
        } catch(e) { console.warn("Could not remove player:", e.message); }
        playerDiv.style.display = 'none';
        playerHr.style.display = 'none'; // Hide HR too
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

// --- Debounce Function ---
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId); // Clear previous timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Search Functionality (Debounced) ---
const debouncedSearch = debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
    console.log("Searching for:", query);
    // Filter based on title or genre
    const filteredMovies = allMovies.filter(movie =>
        movie.title.toLowerCase().includes(query) ||
        (movie.genre && movie.genre.toLowerCase().includes(query))
    );
    // Re-render only the movie rows, keep "Continue Watching" if it exists
    renderMovieRows(filteredMovies, false); // Pass false to skip clearing continue watching
}, 300);

searchBar.addEventListener('input', debouncedSearch);


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
                    // Create profile if it doesn't exist
                    currentUserProfile = { email: user.email, isPremium: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                    db.collection('users').doc(user.uid).set(currentUserProfile);
                    console.log('Profile created (fallback)');
                }
                // Update UI for signed-in state
                authContainer.style.display = 'none';
                appContainer.style.display = 'block';
                showMovieSection(); // Show movie section by default
                userEmailDisplay.textContent = currentUserProfile.email || user.email;
                premiumBadge.style.display = currentUserProfile.isPremium ? 'inline-block' : 'none';

                // Fetch "Continue Watching" first, then other movies
                fetchAndRenderContinueWatching().then(() => {
                    if (allMovies.length === 0) {
                        fetchMovies();
                    } else {
                        renderMovieRows(allMovies);
                    }
                });

            }).catch((error) => {
                console.error("Error getting profile:", error);
                // Fallback if profile loading fails
                currentUserProfile = { email: user.email, isPremium: false };
                userEmailDisplay.textContent = user.email;
                premiumBadge.style.display = 'none';
                authContainer.style.display = 'none';
                appContainer.style.display = 'block';
                showMovieSection();
                 // Still try to fetch content
                 fetchAndRenderContinueWatching().then(() => {
                     if (allMovies.length === 0) { fetchMovies(); }
                 });
            });
    } else {
        // User is signed out
        console.log('User signed out');
        // Reset state and UI
        currentUserProfile = null;
        allMovies = [];
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        premiumBadge.style.display = 'none';
        movieListContainer.innerHTML = '';
        profileContainer.style.display = 'none'; // Ensure profile is hidden
        movieSection.style.display = 'none'; // Ensure movie section is hidden
        // Clear errors and reset forms
        loginError.style.display = 'none';
        registerError.style.display = 'none';
        loginForm.reset();
        registerForm.reset();
        searchBar.value = '';
    }
});

// --- (★ ใหม่) Navigation between Movie List and Profile ---
profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    showProfileSection();
    loadProfileData(); // Load data when showing
});

backToMoviesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showMovieSection();
});

function showMovieSection() {
    profileContainer.style.display = 'none';
    movieSection.style.display = 'block';
     // Re-fetch continue watching in case something was watched
     if(auth.currentUser) fetchAndRenderContinueWatching();
}

function showProfileSection() {
    movieSection.style.display = 'none';
    profileContainer.style.display = 'block';
}


// --- Fetch Movie Data ---
function fetchMovies() {
    // Show Skeleton Loader only if continue watching isn't already there
    // and no error message is displayed
    if (!document.getElementById('continue-watching-row') && !movieListContainer.querySelector('p[style*="color: red"]')) {
        let skeletonHTML = '';
        const skeletonGrid = `
            <div class="movie-grid">
                <div class="skeleton-card"></div> <div class="skeleton-card"></div> <div class="skeleton-card"></div>
                <div class="skeleton-card"></div> <div class="skeleton-card"></div>
            </div>`;
        skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
        skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
        movieListContainer.innerHTML += skeletonHTML; // Append skeleton below potential continue watching row
    }

    // ★★★ Ensure this URL points to your updated data.json ★★★
    const dataUrl = 'https://raw.githubusercontent.com/lancerza/dddza/main/data.json';
    const cacheBustUrl = dataUrl + '?cachebust=' + Date.now();

    fetch(cacheBustUrl)
        .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
        .then(data => {
            if (!Array.isArray(data)) throw new Error("Fetched data is not an array");
            allMovies = data; // Store globally
            console.log("Movies loaded:", allMovies.length);
            renderMovieRows(allMovies); // Render regular movie rows
        })
        .catch((error) => {
            console.error("Error fetching movies:", error);
            // Clear only potential skeleton loaders before adding error
            const skeletons = movieListContainer.querySelectorAll('.skeleton-title, .skeleton-card');
            skeletons.forEach(el => el.closest('.movie-grid')?.remove() || el.remove());

            // Append error message after continue watching row if it exists
            const errorElement = document.createElement('p');
            errorElement.style.color = 'red';
            errorElement.textContent = `เกิดข้อผิดพลาดในการโหลดข้อมูลหนัง: ${error.message}`; // Thai error
            movieListContainer.appendChild(errorElement);
        });
}

// --- Fetch and Render Continue Watching Row ---
async function fetchAndRenderContinueWatching() {
    // Remove existing row first to prevent duplicates on re-renders
    const existingRow = document.getElementById('continue-watching-row');
    if (existingRow) existingRow.remove();

    if (!auth.currentUser) return; // Only for logged-in users

    const userId = auth.currentUser.uid;
    const historyRef = db.collection('users').doc(userId).collection('watchHistory');
    console.log("Fetching continue watching...");

    try {
        // Get top 10 most recently watched items, ordered by lastWatched timestamp
        const snapshot = await historyRef.orderBy('lastWatched', 'desc').limit(10).get();

        if (snapshot.empty) {
            console.log("No watch history found.");
            return; // Exit if no history
        }

        const watchHistoryItems = [];
        snapshot.forEach(doc => {
            // Include document ID (contentId) along with data
            watchHistoryItems.push({ id: doc.id, ...doc.data() });
        });
        console.log("History items fetched:", watchHistoryItems.length);

        // --- Create HTML for the "Continue Watching" row ---
        const continueWatchingContainer = document.createElement('div');
        continueWatchingContainer.id = 'continue-watching-row'; // Assign ID for easy removal/update

        const titleElement = document.createElement('h2');
        titleElement.textContent = 'ดูต่อสำหรับคุณ'; // Thai title
        continueWatchingContainer.appendChild(titleElement);

        const movieGrid = document.createElement('div');
        movieGrid.className = 'movie-grid'; // Use the same grid style

        watchHistoryItems.forEach(item => {
            // Validate essential data for rendering
            if (!item.title || typeof item.position !== 'number' || typeof item.duration !== 'number' || item.duration <= 0) {
                 console.warn("Skipping rendering invalid history item:", item.id, item);
                 return; // Skip this item if data is incomplete
            }

            const movieElement = document.createElement('div');
            // Add specific class for progress bar styling hooks
            movieElement.className = 'movie-item continue-watching-item';

            // Calculate progress percentage (0-100)
            const percentage = Math.min(100, Math.max(0, (item.position / item.duration) * 100));
            // Use placeholder if posterUrl is missing in history data
            const poster = item.posterUrl || `https://placehold.co/180x270/EDF2F7/718096?text=Loading&font=inter`;
            const displayTitle = item.title || 'ไม่มีชื่อเรื่อง'; // Thai fallback
            const displayDesc = item.genre || 'N/A'; // Use genre from history if available

             // Create card HTML, including the Progress Bar structure
             movieElement.innerHTML = `
                <a href="#" class="movie-link" title="ดูต่อ: ${displayTitle}">
                    <div class="box-img">
                        <img class="movie-poster" src="${poster}" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/180x270/E53E3E/FFFFFF?text=Error&font=inter';">

                        <!-- Progress Bar -->
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${percentage.toFixed(1)}%;"></div>
                        </div>

                        <!-- Badges (using data stored in history item) -->
                        ${item.isHD ? '<span class="badge badge-top-right">HD</span>' : ''}
                        ${item.rating > 0 ? `<span class="badge badge-top-left">⭐ ${item.rating.toFixed(1)}</span>` : ''}
                        ${item.episodeInfo ? `<span class="badge badge-bottom-right">${item.episodeInfo}</span>` : ''}
                        ${item.isPremium ? '<span class="badge badge-bottom-left">👑</span>' : ''}

                    </div>
                    <div class="p-box">
                        <div class="p1">${displayDesc}</div>
                        <div class="p2">${displayTitle}</div>
                    </div>
                </a>
            `;

            // Event Listener: Click card to open modal (recommended for episode selection)
             movieElement.querySelector('.movie-link').addEventListener('click', (e) => {
                 e.preventDefault();
                 // Find the corresponding full movie data from `allMovies` using the title
                 const fullMovieData = findMovieDataByContentId(item.id); // Use helper

                 if (fullMovieData) {
                     console.log("Opening modal for continue watching:", fullMovieData.title);
                     openModal(fullMovieData); // Open modal for context and episode selection
                 } else {
                     // Fallback if movie data is not found (e.g., movie removed from main list)
                     console.warn("Could not find full data for history item:", item.id);
                     alert(`ขออภัย ไม่พบข้อมูลสำหรับ "${item.title}" ในรายการปัจจุบัน`); // Thai alert
                 }
             });

            movieGrid.appendChild(movieElement);
        });

        continueWatchingContainer.appendChild(movieGrid);

        // --- Display the "Continue Watching" row ---
        // Prepend it to the main movie list container so it appears first
        movieListContainer.prepend(continueWatchingContainer);
        console.log("Continue Watching row rendered.");

    } catch (error) {
        console.error("Error fetching/rendering continue watching:", error);
        // Do not display the row if there was an error
    }
}


// --- Render Movie Rows (Adjusted to handle Continue Watching row) ---
function renderMovieRows(movies, clearPreviousRows = true) {
    const continueWatchingRow = document.getElementById('continue-watching-row'); // Reference to the CW row

    // Select all direct children rows/elements in the container EXCEPT the continue watching row
    const rowsToRemove = Array.from(movieListContainer.children).filter(el => el !== continueWatchingRow);

    // Remove them if needed
    if (clearPreviousRows) {
        rowsToRemove.forEach(row => row.remove());
    } else {
        // If not clearing all (e.g., during search), only remove rows added by this function (H2, .movie-grid, p)
        rowsToRemove.filter(row => row.tagName === 'H2' || row.classList.contains('movie-grid') || row.tagName === 'P')
                    .forEach(row => row.remove());
    }

    // Handle empty results after filtering/clearing
    if (!Array.isArray(movies) || movies.length === 0) {
        // Show "not found" only if the container is truly empty (or only has CW row)
        if (!continueWatchingRow || movieListContainer.children.length <= 1) { // Allow for the CW row itself
             const noResults = document.createElement('p');
             noResults.textContent = 'ไม่พบซีรี่ส์ที่ตรงกับเงื่อนไข'; // Thai message
             movieListContainer.appendChild(noResults); // Append (will be after CW row if it exists)
        }
        return; // Exit if no movies to render
    }

    // --- Grouping & Ordering ---
    const moviesByCategory = movies.reduce((groups, movie) => { const category = movie.category || 'อื่นๆ'; if (!groups[category]) groups[category] = []; groups[category].push(movie); return groups; }, {});
    const preferredOrder = ['หนังไทย', 'ซีรี่ส์ฝรั่ง', 'ซีรี่ส์เกาหลี', 'การ์ตูน']; // ★ Adjust order if needed
    const otherCategories = Object.keys(moviesByCategory).filter(cat => !preferredOrder.includes(cat) && cat !== 'อื่นๆ').sort();
    const finalOrder = [...preferredOrder, ...otherCategories];
    if (moviesByCategory['อื่นๆ']) finalOrder.push('อื่นๆ');

    // --- Loop through ordered categories and render rows ---
    finalOrder.forEach(category => {
        const moviesInCategory = moviesByCategory[category];
        if (moviesInCategory && moviesInCategory.length > 0) {
            const categoryTitle = document.createElement('h2'); categoryTitle.textContent = category;
            const movieGrid = document.createElement('div'); movieGrid.className = 'movie-grid';

            moviesInCategory.forEach((movie) => {
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';
                // Prepare data with fallbacks
                const isPremium = movie.isPremium || false;
                const isHD = movie.isHD || false;
                const rating = movie.rating || 0;
                const epInfo = movie.episodeInfo || '';
                const desc = movie.description_short || movie.genre || 'N/A';
                const poster = movie.posterUrl || `https://placehold.co/180x270/EDF2F7/718096?text=No+Image&font=inter`;
                const title = movie.title || 'ไม่มีชื่อเรื่อง'; // Thai fallback

                // Create card HTML
                movieElement.innerHTML = `
                    <a href="#" class="movie-link" title="${title}">
                        <div class="box-img">
                            <img class="movie-poster" src="${poster}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/180x270/E53E3E/FFFFFF?text=Error&font=inter';">
                            ${isHD ? '<span class="badge badge-top-right">HD</span>' : ''}
                            ${rating > 0 ? `<span class="badge badge-top-left">⭐ ${rating.toFixed(1)}</span>` : ''}
                            ${epInfo ? `<span class="badge badge-bottom-right">${epInfo}</span>` : ''}
                            ${isPremium ? '<span class="badge badge-bottom-left">👑</span>' : ''}
                        </div>
                        <div class="p-box">
                            <div class="p1">${desc}</div>
                            <div class="p2">${title}</div>
                        </div>
                    </a>
                `;
                // Add click listener to open modal
                movieElement.querySelector('.movie-link').addEventListener('click', (e) => { e.preventDefault(); openModal(movie); });
                movieGrid.appendChild(movieElement); // Add card to grid
            });
            // Append the category title and the grid to the main container
            movieListContainer.appendChild(categoryTitle);
            movieListContainer.appendChild(movieGrid);
        }
    });
}


// --- Open Modal Function ---
function openModal(movie) {
    if (!movie) return;
    modalBody.innerHTML = `
        <div class="modal-body-content">
            <img src="${movie.posterUrl || 'https://placehold.co/150x225/EDF2F7/718096?text=No+Image&font=inter'}" alt="${movie.title || ''}" class="modal-poster" onerror="this.onerror=null; this.src='https://placehold.co/150x225/E53E3E/FFFFFF?text=Error&font=inter';">
            <div class="modal-info">
                <h2>${movie.title || 'ไม่มีชื่อเรื่อง'}</h2>
                <p>${movie.genre || 'N/A'} (ปี ${movie.year || 'N/A'})</p>
                ${movie.description_full ? `<p>${movie.description_full}</p>` : (movie.description_short ? `<p>${movie.description_short}</p>` : '')}
                <h3 class="modal-episodes-title" id="modal-title-type"></h3>
                <div class="modal-episodes-list" id="modal-episodes"></div>
            </div>
        </div>`;
    const episodesList = document.getElementById('modal-episodes');
    const titleType = document.getElementById('modal-title-type');
    if (movie.episodes && Array.isArray(movie.episodes) && movie.episodes.length > 0) {
        titleType.textContent = 'ตอนทั้งหมด'; // Thai
        movie.episodes.forEach((ep, index) => { if(ep.title && ep.streamUrl) { episodesList.appendChild(createPlayButton(ep.title, movie, ep.streamUrl)); } else { console.warn(`Ep ${index+1} missing data for ${movie.title}`); } });
    } else if (movie.streamUrl) {
        titleType.textContent = 'รับชม'; // Thai
        episodesList.appendChild(createPlayButton('▶ เล่นเลย', movie, movie.streamUrl)); // Thai
    } else {
        titleType.textContent = 'ข้อมูล'; // Thai
        episodesList.innerHTML = '<p>ยังไม่มีลิงก์สำหรับรับชม</p>'; // Thai
    }
    modalBackdrop.style.display = 'flex';
}

// --- Create Play Button (for Modal) ---
function createPlayButton(buttonText, movie, streamUrl) {
    const playButton = document.createElement('button'); playButton.className = 'play-button';
    const isMoviePremium = movie.isPremium || false;
    const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false;
    playButton.textContent = (isMoviePremium ? '👑 ' : '▶ ') + buttonText;
    if (isMoviePremium) { playButton.classList.add(isUserPremium ? 'premium-unlocked' : 'premium-locked'); }
    // Generate unique ID for history
    const contentId = movie.episodes ? `${movie.title} | ${buttonText}` : movie.title;
    playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMoviePremium && !isUserPremium) { alert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!'); } // Thai
        else if (streamUrl) {
            closeModal(); // Close modal before playing
            playMovie(streamUrl, contentId); // Play selected episode/movie
         }
        else { alert('ไม่พบลิงก์สำหรับเล่น'); } // Thai
    });
    return playButton;
}


// --- (★ Adjust) Play Movie Function - Moved scrollIntoView & added play() call ---
async function playMovie(videoUrl, contentId) {
    console.log(`Attempting to play: ${contentId} from URL: ${videoUrl}`);
    playerDiv.style.display = 'block'; // Make player visible
    playerHr.style.display = 'block'; // Show HR above player
    playerDiv.innerHTML = ''; // Clear previous errors/player
    let savedPosition = 0; let docRef = null;

    // --- 1. Load Watch History ---
    if (auth.currentUser && contentId) {
        try {
            docRef = db.collection('users').doc(auth.currentUser.uid).collection('watchHistory').doc(contentId);
            const doc = await docRef.get();
            if (doc.exists && typeof doc.data().position === 'number') {
                savedPosition = doc.data().position;
                const duration = typeof doc.data().duration === 'number' ? doc.data().duration : 0;
                if(duration > 0 && savedPosition > duration - 30) savedPosition = 0; // Restart if near end
                else if (savedPosition > 0) console.log(`Resuming at: ${savedPosition.toFixed(2)}s`);
            }
        } catch (e) { console.error("Error getting history:", e); }
    } else { console.log("Cannot load history (not logged in or no contentId)."); }

    // --- 2. Setup Player ---
    try {
        const playerInstance = jwplayer("player-container").setup({
            file: videoUrl,
            type: "hls", // Assuming HLS
            width: "100%",
            aspectratio: "16:9",
            autoplay: true, // Keep autoplay true as the primary method
            starttime: Math.max(0, savedPosition - 5) // Resume slightly before
        });

        // --- (★ Adjust) Handle 'ready' event for scrolling and forcing play ---
        playerInstance.on('ready', () => {
             console.log("Player ready, scrolling into view and attempting play...");
             // Scroll player DIV into view AFTER the player is ready
             // Using 'start' to align the top of the player with the top of the viewport
             playerDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
             // Try forcing play again, might help with some browser policies
             // Use a small timeout to ensure scroll has initiated before playing
             setTimeout(() => {
                 // Check if player still exists before trying to play
                 if(jwplayer("player-container")?.getState) {
                     playerInstance.play(true);
                 }
             }, 150); // Increased timeout slightly
        });
        playerInstance.on('autoplayBlocked', () => {
             console.warn("Autoplay was blocked by the browser. User interaction might be needed.");
             // You could display a play icon overlay here for the user to click
        });


        // --- 3. Save Watch History (Logic remains the same) ---
        if (docRef) {
            let lastSaveTime = 0; const saveInterval = 10000;
            const currentMovieData = findMovieDataByContentId(contentId);

            playerInstance.on('time', (event) => {
                const now = Date.now();
                if (now - lastSaveTime > saveInterval) {
                    const currentPosition = event.position; const duration = event.duration;
                    if (duration > 0 && currentPosition > 5 && (duration - currentPosition) > 30) {
                        const historyData = {
                            position: currentPosition,
                            lastWatched: firebase.firestore.FieldValue.serverTimestamp(),
                            duration: duration,
                            title: currentMovieData?.title || movieTitleFromContentId(contentId),
                            posterUrl: currentMovieData?.posterUrl || null,
                            genre: currentMovieData?.genre || null,
                            isHD: currentMovieData?.isHD || false,
                            rating: currentMovieData?.rating || 0,
                            isPremium: currentMovieData?.isPremium || false,
                            episodeInfo: currentMovieData?.episodes ? findEpisodeInfo(contentId, currentMovieData) : (currentMovieData?.episodeInfo || null)
                        };
                        Object.keys(historyData).forEach(key => (historyData[key] == null) && delete historyData[key]);
                        docRef.set(historyData, { merge: true })
                           .catch(err => console.error("Error saving history:", err));
                        lastSaveTime = now;
                    }
                }
            });
            playerInstance.on('complete', () => {
                 console.log(`Playback complete for ${contentId}, deleting history.`);
                 docRef.delete().catch(err => console.error("Error deleting history:", err));
             });
        }

        // --- 4. Handle Errors (Logic remains the same) ---
        playerInstance.on('error', (event) => {
            console.error(`JW Player Error (${event.code}): ${event.message}`, event);
            playerDiv.innerHTML = `<div class="player-error-message"><h3>เกิดข้อผิดพลาด (${event.code})</h3><p>ขออภัย ไม่สามารถเล่นวิดีโอนี้ได้ อาจเกิดจากปัญหาลิงก์หมดอายุ, การเชื่อมต่อ, หรือไฟล์เสียหาย</p><p style="font-size: 0.8em; color: #718096;">(${event.message})</p></div>`; // Thai
            playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    } catch (e) {
        console.error("Error setting up Player:", e);
        playerDiv.innerHTML = `<p style="color:red; padding:1rem;">เกิดข้อผิดพลาดร้ายแรงในการโหลด JW Player</p>`; // Thai
        playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


// --- (★ ใหม่) Load Profile Data Function ---
async function loadProfileData() {
    if (!currentUserProfile || !auth.currentUser) {
        console.error("Cannot load profile data: No user logged in or profile missing.");
        profileEmail.textContent = 'N/A';
        profileStatus.textContent = 'N/A';
        profileExpiry.textContent = 'N/A';
        profileWatchHistory.innerHTML = '<p id="history-loading-msg">กรุณาเข้าสู่ระบบเพื่อดูข้อมูล</p>'; // Thai
        return;
    }

    const userId = auth.currentUser.uid;

    // --- 1. Populate Account Details ---
    profileEmail.textContent = currentUserProfile.email || 'ไม่พบอีเมล'; // Thai
    profileStatus.textContent = currentUserProfile.isPremium ? '👑 Premium' : 'สมาชิกทั่วไป'; // Thai

    // --- 2. Populate Premium Expiry ---
    const expirySpan = profileExpiry;
    if (currentUserProfile.isPremium && currentUserProfile.premiumExpiry && currentUserProfile.premiumExpiry.toDate) { // Check if it's a Firestore Timestamp
        try {
            const expiryDate = currentUserProfile.premiumExpiry.toDate(); // Convert Timestamp to Date
            const now = new Date();

            if (expiryDate < now) {
                // Expired
                expirySpan.textContent = `หมดอายุแล้ว (${expiryDate.toLocaleDateString('th-TH')})`; // Thai
                expirySpan.style.color = 'red';
                // Optional: Automatically update isPremium to false in Firestore if expired
                // db.collection('users').doc(userId).update({ isPremium: false });
            } else {
                // Still active
                expirySpan.textContent = expiryDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }); // Thai formatting
                expirySpan.style.color = 'green';
            }
        } catch (e) {
             console.error("Error processing expiry date:", e);
             expirySpan.textContent = 'ข้อมูลผิดพลาด'; // Thai
             expirySpan.style.color = 'orange';
        }
    } else if (currentUserProfile.isPremium) {
        expirySpan.textContent = 'ตลอดชีพ / ไม่ระบุ'; // Thai (If premium but no expiry date)
        expirySpan.style.color = 'green';
    } else {
        expirySpan.textContent = 'ไม่มี'; // Thai (Not premium)
        expirySpan.style.color = 'inherit';
    }

    // --- 3. Populate Watch History ---
    profileWatchHistory.innerHTML = '<p id="history-loading-msg">กำลังโหลดประวัติ...</p>'; // Reset and show loading

    try {
        const historyRef = db.collection('users').doc(userId).collection('watchHistory');
        const snapshot = await historyRef.orderBy('lastWatched', 'desc').limit(20).get(); // Get latest 20

        // Clear loading message before adding items or showing empty message
        const loadingMsgElement = profileWatchHistory.querySelector('#history-loading-msg');

        if (snapshot.empty) {
             if(loadingMsgElement) loadingMsgElement.textContent = 'ยังไม่มีประวัติการรับชม'; // Thai
            return;
        }

         if(loadingMsgElement) loadingMsgElement.remove(); // Remove loading message

        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };

            // Basic validation
             if (!item.title || !item.lastWatched?.toDate) {
                 console.warn("Skipping history item with missing data:", item.id);
                 return;
             }

            const historyItemElement = document.createElement('div');
            historyItemElement.className = 'history-item';
            const poster = item.posterUrl || `https://placehold.co/60x90/EDF2F7/718096?text=?&font=inter`;
            const displayTitle = item.title || 'ไม่มีชื่อเรื่อง'; // Thai
            const lastWatchedDate = item.lastWatched.toDate();
            // Format date and time in Thai locale
            const formattedDate = lastWatchedDate.toLocaleString('th-TH', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            historyItemElement.innerHTML = `
                <img src="${poster}" alt="" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/60x90/E0E6ED/718096?text=?&font=inter';">
                <div class="history-item-info">
                    <h4>${displayTitle}</h4>
                    ${item.episodeInfo ? `<p>${item.episodeInfo}</p>` : ''} {/* Show episode if available */}
                    <p class="history-date">ดูเมื่อ: ${formattedDate}</p> {/* Thai */}
                </div>
            `;

            // Make the history item clickable to open the modal
            historyItemElement.addEventListener('click', () => {
                const fullMovieData = findMovieDataByContentId(item.id);
                if (fullMovieData) {
                    // Switch back to movie view and open modal
                    showMovieSection(); // Go back to movie list view first
                    // Use a small timeout to ensure the section is visible before opening modal
                    setTimeout(() => openModal(fullMovieData), 50);
                } else {
                    alert(`ขออภัย ไม่พบข้อมูลสำหรับ "${item.title}" ในรายการปัจจุบัน`); // Thai
                }
            });

            profileWatchHistory.appendChild(historyItemElement);
        });

    } catch (error) {
        console.error("Error fetching profile watch history:", error);
        const loadingMsgElement = profileWatchHistory.querySelector('#history-loading-msg');
        if(loadingMsgElement) {
            loadingMsgElement.textContent = 'เกิดข้อผิดพลาดในการโหลดประวัติ'; // Thai
            loadingMsgElement.style.color = 'red';
        } else {
             profileWatchHistory.innerHTML = '<p style="color:red;">เกิดข้อผิดพลาดในการโหลดประวัติ</p>'; // Fallback error display
        }
    }
}

// --- (★ ใหม่) Change Password Function ---
changePasswordBtn.addEventListener('click', () => {
    if (!currentUserProfile || !currentUserProfile.email) {
        // Use a more user-friendly message display instead of alert if possible
        alert('ไม่พบข้อมูลอีเมลสำหรับส่งลิงก์รีเซ็ตรหัสผ่าน'); // Thai
        return;
    }
    const email = currentUserProfile.email;
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert(`ลิงก์สำหรับรีเซ็ตรหัสผ่านถูกส่งไปยัง ${email} แล้ว กรุณาตรวจสอบอีเมลของคุณ (รวมถึงโฟลเดอร์สแปม)`); // Thai, added spam folder note
        })
        .catch((error) => {
            console.error("Error sending password reset email:", error);
            alert(`เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ต: ${getFirebaseAuthErrorMessage(error)}`); // Thai, use helper
        });
});

// --- (★ ใหม่) Clear Watch History Function ---
clearHistoryBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;

    // Replace prompt with a more robust confirmation mechanism in a real app
     if (prompt("คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการดูทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้ กรุณาพิมพ์ 'ยืนยัน' เพื่อดำเนินการ:") !== 'ยืนยัน') { // Thai prompt, changed confirmation word
         console.log("History clear cancelled by user.");
         return;
     }

    const userId = auth.currentUser.uid;
    const historyRef = db.collection('users').doc(userId).collection('watchHistory');
    clearHistoryBtn.textContent = 'กำลังล้าง...'; // Thai
    clearHistoryBtn.disabled = true;

    try {
        // Loop to delete in batches until empty
        let deletedCount = 0;
        let snapshot;
        do {
            snapshot = await historyRef.limit(100).get(); // Delete in batches of 100
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                deletedCount += snapshot.size;
                console.log(`Deleted ${snapshot.size} history items...`);
            }
        } while (!snapshot.empty); // Continue until no more documents found

        console.log(`Total deleted: ${deletedCount}`);
        alert('ล้างประวัติการดูทั้งหมดสำเร็จ'); // Thai
        loadProfileData(); // Reload profile to show empty list immediately

    } catch (error) {
        console.error("Error clearing watch history:", error);
        alert(`เกิดข้อผิดพลาดในการล้างประวัติ: ${error.message}`); // Thai
    } finally {
        // Re-enable button regardless of success/failure
        clearHistoryBtn.textContent = 'ล้างประวัติการดูทั้งหมด'; // Thai
        clearHistoryBtn.disabled = false;
    }
});


// --- Helper functions ---
function movieTitleFromContentId(contentId) {
    if (!contentId) return 'Unknown Title';
    return contentId.includes(' | ') ? contentId.split(' | ')[0].trim() : contentId.trim();
}

function findMovieDataByContentId(contentId) {
    if (!contentId || !Array.isArray(allMovies)) return null;
    const title = movieTitleFromContentId(contentId);
    return allMovies.find(m => m.title === title) || null;
}

function findEpisodeInfo(contentId, movieData) {
    if (!contentId || !movieData || !movieData.episodes || !contentId.includes(' | ')) {
        return movieData?.episodeInfo || null;
    }
    const parts = contentId.split(' | ');
    const episodeTitle = parts.length > 1 ? parts[1].trim() : null;
    return episodeTitle;
}

// Helper to provide more user-friendly Firebase Auth error messages (in Thai)
function getFirebaseAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'รูปแบบอีเมลไม่ถูกต้อง';
        case 'auth/user-disabled': return 'บัญชีผู้ใช้นี้ถูกปิดใช้งาน';
        case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้ที่ตรงกับอีเมลนี้';
        case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง';
        case 'auth/email-already-in-use': return 'อีเมลนี้ถูกใช้งานแล้วโดยบัญชีอื่น';
        case 'auth/weak-password': return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        case 'auth/operation-not-allowed': return 'การเข้าสู่ระบบด้วยอีเมล/รหัสผ่านไม่ได้เปิดใช้งาน';
        case 'auth/network-request-failed': return 'เกิดปัญหาในการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง';
        case 'auth/too-many-requests': return 'มีการร้องขอมากเกินไป ลองใหม่อีกครั้งภายหลัง'; // Added common error
        case 'auth/requires-recent-login': return 'การดำเนินการนี้ต้องมีการเข้าสู่ระบบใหม่ กรุณาออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง'; // Added common error
        default: return error.message; // Fallback to default message
    }
}

