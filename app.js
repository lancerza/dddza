// --- ▼▼▼ FIREBASE CONFIG (Your actual config) ▼▼▼ ---
const firebaseConfig = {
    apiKey: "AIzaSyBroNOP-3UiCxKO7OpT6RAA7NebSs8HS30", // Replace with your actual API key if needed, otherwise leave as is for Canvas environment
    authDomain: "flowtv-login.firebaseapp.com",
    projectId: "flowtv-login",
    storageBucket: "flowtv-login.firebasestorage.app", // Corrected typo: firebasestorage -> firebaseapp
    messagingSenderId: "538439748085",
    appId: "1:538439748085:web:9b115aef758fe3edf2b8bc"
};
// --- ▲▲▲ Config End ▲▲▲ ---


// --- Initialize Firebase ---
// Use compat libraries as per original HTML script tags
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
const movieListContainer = document.getElementById('movie-list-container');
const playerDiv = document.getElementById('player-container');
const premiumBadge = document.getElementById('premium-badge');
const searchBar = document.getElementById('search-bar');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

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
    registerError.style.display = 'none'; // Hide previous error
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('สมัครสมาชิกสำเร็จ:', userCredential.user.uid);
            const newUserProfile = { email: email, isPremium: false };
            // Set user profile in Firestore
            db.collection('users').doc(userCredential.user.uid).set(newUserProfile)
                .then(() => console.log("User profile created successfully"))
                .catch(err => console.error("Error creating user profile: ", err));
            // No need to manually switch forms, onAuthStateChanged will handle it
        })
        .catch((error) => {
            console.error('สมัครสมาชิกล้มเหลว:', error.message);
            registerError.textContent = error.message; // Display error
            registerError.style.display = 'block';
        });
});

btnLogin.addEventListener('click', (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;
    loginError.style.display = 'none'; // Hide previous error
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('ล็อกอินสำเร็จ:', userCredential.user.uid);
            // No need to manually switch forms, onAuthStateChanged will handle it
        })
        .catch((error) => {
            console.error('ล็อกอินล้มเหลว:', error.message);
            loginError.textContent = error.message; // Display error
            loginError.style.display = 'block';
        });
});

btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log('ออกจากระบบสำเร็จ');
        // Clean up player if it exists and is playing/paused
        try {
            const playerInstance = jwplayer("player-container");
            if (playerInstance && typeof playerInstance.remove === 'function') {
                 playerInstance.remove();
            }
        } catch(e) {
            console.warn("Could not remove player instance:", e.message);
        }
        playerDiv.style.display = 'none';
        playerDiv.innerHTML = ''; // Clear player div content
        // State change will be handled by onAuthStateChanged
    });
});

// --- Modal Functions ---
modalCloseBtn.addEventListener('click', () => { closeModal(); });
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) { closeModal(); } });

function closeModal() {
    modalBackdrop.style.display = 'none';
    modalBody.innerHTML = ''; // Clear modal content
}

// --- Debounce Function ---
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Search Functionality (Debounced) ---
const debouncedSearch = debounce((e) => {
    const query = e.target.value.toLowerCase().trim(); // Trim whitespace
    console.log("Searching for:", query);
    const filteredMovies = allMovies.filter(movie => {
        // Search in title and maybe genre
        return movie.title.toLowerCase().includes(query) ||
               (movie.genre && movie.genre.toLowerCase().includes(query));
    });
    renderMovieRows(filteredMovies);
}, 300); // 300ms delay

searchBar.addEventListener('input', debouncedSearch); // Use 'input' for better responsiveness than 'keyup'


// --- Auth State Change Listener ---
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('ผู้ใช้ล็อกอินอยู่:', user.uid);
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserProfile = doc.data();
                    console.log("User profile loaded:", currentUserProfile);
                } else {
                    // This case should ideally not happen if profile is created on signup,
                    // but handle it just in case.
                    console.log('สร้างโปรไฟล์ใหม่สำหรับ user นี้ (fallback)');
                    currentUserProfile = { email: user.email, isPremium: false };
                    db.collection('users').doc(user.uid).set(currentUserProfile);
                }

                // Update UI for logged-in user
                authContainer.style.display = 'none';
                appContainer.style.display = 'block';
                userEmailDisplay.textContent = currentUserProfile.email || user.email; // Use profile email first
                premiumBadge.style.display = currentUserProfile.isPremium ? 'inline-block' : 'none';

                // Fetch movies if not already fetched
                if (allMovies.length === 0) {
                    fetchMovies();
                } else {
                    // If movies are already loaded, just re-render in case premium status affects display
                    renderMovieRows(allMovies);
                }

            }).catch((error) => {
                console.error("Error getting user profile:", error);
                // Fallback profile if Firestore fails
                currentUserProfile = { email: user.email, isPremium: false };
                userEmailDisplay.textContent = user.email;
                premiumBadge.style.display = 'none';
                 authContainer.style.display = 'none';
                appContainer.style.display = 'block';
                if (allMovies.length === 0) {
                    fetchMovies();
                }
            });

    } else {
        // User is signed out
        console.log('ผู้ใช้ออกจากระบบแล้ว');
        currentUserProfile = null;
        allMovies = []; // Clear movie data on logout
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        premiumBadge.style.display = 'none';
        movieListContainer.innerHTML = ''; // Clear movie list
        loginError.style.display = 'none'; // Clear any login errors
        registerError.style.display = 'none'; // Clear any register errors
        loginForm.reset(); // Reset form fields
        registerForm.reset();
    }
});


// --- Fetch Movie Data ---
function fetchMovies() {
    // Show Skeleton Loader
    let skeletonHTML = '';
    const skeletonGrid = `
        <div class="movie-grid">
            <div class="skeleton-card"></div> <div class="skeleton-card"></div> <div class="skeleton-card"></div>
            <div class="skeleton-card"></div> <div class="skeleton-card"></div>
        </div>`;
    skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
    skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
    movieListContainer.innerHTML = skeletonHTML;

    // Fetch actual data
    // ★★★ Ensure this URL points to your updated data.json ★★★
    const dataUrl = 'https://raw.githubusercontent.com/lancerza/dddza/main/data.json';
    const cacheBustUrl = dataUrl + '?cachebust=' + Date.now(); // Use Date.now()

    fetch(cacheBustUrl)
        .then(response => {
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
             }
             return response.json();
        })
        .then(data => {
            // Validate data structure (basic check)
            if (!Array.isArray(data)) {
                 throw new Error("Fetched data is not an array.");
            }
            if (data.length === 0) {
                movieListContainer.innerHTML = '<p>ยังไม่มีหนังในระบบ</p>';
                return;
            }

            allMovies = data; // Store fetched data globally
            console.log("Movies loaded:", allMovies.length);
            renderMovieRows(allMovies); // Render the movies
        })
        .catch((error) => {
            console.error("Error fetching movie data: ", error);
            movieListContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูลหนัง: ${error.message}</p>`;
        });
}

// --- Render Movie Rows (Adjusted for seriesday-hd card style) ---
function renderMovieRows(movies) {
    movieListContainer.innerHTML = ''; // Clear previous content or skeleton

    if (!Array.isArray(movies) || movies.length === 0) {
        movieListContainer.innerHTML = '<p>ไม่พบซีรี่ส์ที่ตรงกับเงื่อนไข</p>';
        return;
    }

    // --- 1. Group movies by Category ---
    const moviesByCategory = movies.reduce((groups, movie) => {
        const category = movie.category || 'อื่นๆ';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(movie);
        return groups;
    }, {});

    // --- 2. Define category order ---
    const preferredOrder = ['หนังไทย', 'ซีรี่ส์ฝรั่ง', 'ซีรี่ส์เกาหลี', 'การ์ตูน']; // ★ Adjust preferred order here
    const otherCategories = Object.keys(moviesByCategory)
        .filter(category => !preferredOrder.includes(category) && category !== 'อื่นๆ')
        .sort(); // Sort remaining categories alphabetically
    const finalOrder = [...preferredOrder, ...otherCategories];
    if (moviesByCategory['อื่นๆ']) {
        finalOrder.push('อื่นๆ'); // Ensure 'อื่นๆ' is always last
    }

    // --- 3. Loop through ordered categories ---
    finalOrder.forEach(category => {
        const moviesInCategory = moviesByCategory[category];

        // Only render if there are movies in this category
        if (moviesInCategory && moviesInCategory.length > 0) {
            // Create category title
            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category;
            movieListContainer.appendChild(categoryTitle);

            // Create horizontal scroll container for this category
            const movieGrid = document.createElement('div');
            movieGrid.className = 'movie-grid';

            // --- 4. Loop through movies in this category to create cards ---
            moviesInCategory.forEach((movie) => {
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';

                // Prepare data with fallbacks
                const isPremium = movie.isPremium || false;
                const isHD = movie.isHD || false;
                const rating = movie.rating || 0;
                const epInfo = movie.episodeInfo || '';
                // Use description_short, fallback to genre, fallback to 'N/A' for p1
                const desc = movie.description_short || movie.genre || 'N/A';
                const poster = movie.posterUrl || `https://placehold.co/180x270/EDF2F7/718096?text=No+Image&font=inter`; // Placeholder with Inter font
                const title = movie.title || 'ไม่มีชื่อเรื่อง';

                // Create inner HTML using Template Literal (seriesday-hd style)
                movieElement.innerHTML = `
                    <a href="#" class="movie-link" title="${title}">
                        <div class="box-img">
                            <img class="movie-poster" src="${poster}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/180x270/E53E3E/FFFFFF?text=Error&font=inter';">

                            <!-- Badges overlaying the image -->
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

                // Add event listener to the link covering the card to open the modal
                movieElement.querySelector('.movie-link').addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent default link navigation
                    openModal(movie);   // Open the modal
                });

                movieGrid.appendChild(movieElement); // Add card to the grid
            });

            movieListContainer.appendChild(movieGrid); // Add the grid (row) to the container
        }
    });
}


// --- Open Modal Function ---
function openModal(movie) {
    if (!movie) return; // Basic validation

    // Populate modal content
    modalBody.innerHTML = `
        <div class="modal-body-content">
            <img src="${movie.posterUrl || 'https://placehold.co/150x225/EDF2F7/718096?text=No+Image&font=inter'}"
                 alt="${movie.title || ''}" class="modal-poster"
                 onerror="this.onerror=null; this.src='https://placehold.co/150x225/E53E3E/FFFFFF?text=Error&font=inter';">
            <div class="modal-info">
                <h2>${movie.title || 'ไม่มีชื่อเรื่อง'}</h2>
                <p>${movie.genre || 'N/A'} (ปี ${movie.year || 'N/A'})</p>
                <!-- Add full description if available -->
                ${movie.description_full ? `<p>${movie.description_full}</p>` : ''}
                <h3 class="modal-episodes-title" id="modal-title-type"></h3>
                <div class="modal-episodes-list" id="modal-episodes">
                    <!-- Episode/Play buttons will be added here -->
                </div>
            </div>
        </div>
    `;

    const episodesList = document.getElementById('modal-episodes');
    const titleType = document.getElementById('modal-title-type');

    // Add play buttons based on movie type (series vs single movie)
    if (movie.episodes && Array.isArray(movie.episodes) && movie.episodes.length > 0) {
        titleType.textContent = 'ตอนทั้งหมด';
        movie.episodes.forEach((ep, index) => {
            // Ensure episode has a title and streamUrl
            if(ep.title && ep.streamUrl) {
                const epButton = createPlayButton(ep.title, movie, ep.streamUrl);
                episodesList.appendChild(epButton);
            } else {
                console.warn(`Episode ${index + 1} for ${movie.title} is missing title or streamUrl.`);
            }
        });
    } else if (movie.streamUrl) {
        titleType.textContent = 'รับชม';
        const playButton = createPlayButton('▶ เล่นเลย', movie, movie.streamUrl);
        episodesList.appendChild(playButton);
    } else {
        // Handle case where there's no streamUrl and no episodes
        titleType.textContent = 'ข้อมูล';
        episodesList.innerHTML = '<p>ยังไม่มีลิงก์สำหรับรับชมเรื่องนี้</p>';
    }

    modalBackdrop.style.display = 'flex'; // Show the modal
}


// --- Create Play Button (for Modal) ---
function createPlayButton(buttonText, movie, streamUrl) {
    const playButton = document.createElement('button');
    playButton.className = 'play-button';

    const isMoviePremium = movie.isPremium || false;
    // Check currentUserProfile existence before accessing isPremium
    const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false;

    // Set button text with icon
    playButton.textContent = (isMoviePremium ? '👑 ' : '▶ ') + buttonText;

    // Add premium styling if necessary
    if (isMoviePremium) {
        playButton.classList.add(isUserPremium ? 'premium-unlocked' : 'premium-locked');
    }

    // Generate unique content ID for watch history (Movie Title | Episode Title or Movie Title)
    const contentId = movie.episodes ? `${movie.title} | ${buttonText}` : movie.title;

    playButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent modal close if clicking inside

        if (isMoviePremium && !isUserPremium) {
            // Replace alert with a more user-friendly message if possible
            // For now, alert is used as per original code
            alert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!');
        } else if (streamUrl) {
            closeModal(); // Close modal before playing
            playMovie(streamUrl, contentId); // Play the selected content
        } else {
            alert('ไม่พบลิงก์สำหรับเล่น');
        }
    });
    return playButton;
}

// --- Play Movie Function (with Continue Watching & Error Handling) ---
async function playMovie(videoUrl, contentId) {
    console.log(`Attempting to play: ${contentId} from ${videoUrl}`);
    playerDiv.style.display = 'block'; // Show player area
    playerDiv.innerHTML = ''; // Clear previous error messages or player remnants

    let savedPosition = 0; // Default start time
    let docRef = null; // Firestore document reference for watch history

    // --- 1. Load Watch History (if user is logged in) ---
    if (auth.currentUser && contentId) { // Ensure contentId is valid
        try {
            // Path: users/{userId}/watchHistory/{contentId}
            docRef = db.collection('users').doc(auth.currentUser.uid)
                       .collection('watchHistory').doc(contentId);

            const doc = await docRef.get();
            if (doc.exists && doc.data().position) {
                savedPosition = parseFloat(doc.data().position) || 0;
                // Avoid seeking too close to the end
                const duration = parseFloat(doc.data().duration) || 0;
                if(duration > 0 && savedPosition > duration - 30) {
                    savedPosition = 0; // Start from beginning if watched almost till end
                     console.log(`Watched near end (${savedPosition}s of ${duration}s), restarting.`);
                } else if (savedPosition > 0) {
                     console.log(`พบประวัติการดู: ${savedPosition.toFixed(2)} วินาที`);
                }

            }
        } catch (e) {
            console.error("Error getting watch history:", e);
            // Continue without saved position if Firestore fails
        }
    } else {
        console.log("User not logged in or contentId missing, cannot load watch history.");
    }

    // --- 2. Setup JW Player ---
    try {
        const playerInstance = jwplayer("player-container").setup({
            file: videoUrl,
            type: "hls", // Assume HLS, might need adjustment if using other types
            width: "100%",
            aspectratio: "16:9",
            autoplay: true,
            // Start playing from saved position (subtract 5s for context, but not less than 0)
            starttime: Math.max(0, savedPosition - 5)
        });

        // Scroll player into view smoothly
        playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // --- 3. Save Watch History (if user is logged in) ---
        if (docRef) {
            let lastSaveTime = 0;
            const saveInterval = 10000; // Save every 10 seconds

            playerInstance.on('time', (event) => {
                const now = Date.now();
                // Throttle saving to avoid excessive Firestore writes
                if (now - lastSaveTime > saveInterval) {
                    const currentPosition = event.position;
                    const duration = event.duration;

                    // Only save if position and duration are valid numbers
                    // and not too close to the beginning or end
                    if (duration > 0 && currentPosition > 5 && (duration - currentPosition) > 30) {
                       // console.log(`Saving position ${currentPosition.toFixed(2)} for ${contentId}`);
                        docRef.set({
                            position: currentPosition,
                            lastWatched: firebase.firestore.FieldValue.serverTimestamp(), // Use server timestamp
                            duration: duration,
                            // Optional: Store title/poster for a "Continue Watching" row later
                            title: movieTitleFromContentId(contentId), // Helper function needed
                            posterUrl: getPosterUrlForContentId(contentId) // Helper function needed
                        }, { merge: true }) // Use merge to update fields without overwriting others
                        .catch(err => console.error("Error saving watch history:", err)); // Log Firestore save errors

                        lastSaveTime = now;
                    }
                }
            });

             // Optional: Clear history if playback completes
             playerInstance.on('complete', () => {
                 console.log(`Playback complete for ${contentId}, clearing history.`);
                 docRef.delete().catch(err => console.error("Error deleting watch history on complete:", err));
             });
        }

        // --- 4. Handle Player Errors ---
        playerInstance.on('error', (event) => {
            console.error(`JW Player Error (${event.code}): ${event.message}`, event);
            // Display a user-friendly error message in the player div
            playerDiv.innerHTML = `
                <div class="player-error-message">
                    <h3>เกิดข้อผิดพลาด (${event.code})</h3>
                    <p>ขออภัย ไม่สามารถเล่นวิดีโอนี้ได้ อาจเกิดจากปัญหาลิงก์หมดอายุ, การเชื่อมต่อ, หรือไฟล์เสียหาย</p>
                    <p style="font-size: 0.8em; color: #718096;">(${event.message})</p>
                </div>`;
            playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

    } catch (e) {
        // Catch errors during player setup itself
        console.error("Error setting up JW Player:", e);
        playerDiv.innerHTML = `<p style="color:red; padding:1rem;">เกิดข้อผิดพลาดร้ายแรงในการโหลด JW Player</p>`;
        playerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// --- Helper functions for watch history (Needs implementation) ---
// These are examples, you need to adapt them based on how you store/access movie data
function movieTitleFromContentId(contentId) {
    if (!contentId) return 'Unknown Title';
    // If ID format is "Movie Title | Episode Title", extract the movie part
    return contentId.includes(' | ') ? contentId.split(' | ')[0] : contentId;
}

function getPosterUrlForContentId(contentId) {
     if (!contentId) return null;
     const title = movieTitleFromContentId(contentId);
     const movie = allMovies.find(m => m.title === title);
     return movie ? movie.posterUrl : null;
}
