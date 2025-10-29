// --- ▼▼▼ FIREBASE CONFIG (config จริงของคุณ) ▼▼▼ ---
const firebaseConfig = {
    apiKey: "AIzaSyBroNOP-3UiCxKO7OpT6RAA7NebSs8HS30",
    authDomain: "flowtv-login.firebaseapp.com",
    projectId: "flowtv-login",
    storageBucket: "flowtv-login.firebasestorage.app",
    messagingSenderId: "538439748085",
    appId: "1:538439748085:web:9b115aef758fe3edf2b8bc"
};
// --- ▲▲▲ เรียบร้อย ▲▲▲ ---


// --- เริ่มต้น FIREBASE ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); 

// --- ดึง ELEMENT (เหมือนเดิม) ---
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

// --- ตัวแปร (เหมือนเดิม) ---
let allMovies = []; 
let currentUserProfile = null; 

// --- ฟังก์ชัน Auth & สลับหน้า (เหมือนเดิม) ---
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'block'; registerForm.style.display = 'none'; });
btnRegister.addEventListener('click', (e) => {
    e.preventDefault();
    const email = registerEmail.value;
    const password = registerPassword.value;
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('สมัครสมาชิกสำเร็จ:', userCredential.user);
            registerError.style.display = 'none';
            const newUserProfile = { email: email, isPremium: false };
            db.collection('users').doc(userCredential.user.uid).set(newUserProfile)
                .catch(err => console.error("Error creating user profile: ", err));
        })
        .catch((error) => {
            console.error('สมัครสมาชิกล้มเหลว:', error.message);
            registerError.textContent = error.message;
            registerError.style.display = 'block';
        });
});
btnLogin.addEventListener('click', (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('ล็อกอินสำเร็จ:', userCredential.user);
            loginError.style.display = 'none';
        })
        .catch((error) => {
            console.error('ล็อกอินล้มเหลว:', error.message);
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        });
});
btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log('ออกจากระบบสำเร็จ');
        if (jwplayer("player-container").getState()) {
             jwplayer("player-container").remove();
        }
        playerDiv.style.display = 'none'; 
    });
});
modalCloseBtn.addEventListener('click', () => { modalBackdrop.style.display = 'none'; modalBody.innerHTML = ''; });
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) { modalBackdrop.style.display = 'none'; modalBody.innerHTML = ''; } });
// --- จบฟังก์ชัน Auth ---


// --- (แก้) Event Listener สำหรับ Search Bar (เรียก renderMovieRows) ---
searchBar.addEventListener('keyup', (e) => {
    const query = e.target.value.toLowerCase();
    
    const filteredMovies = allMovies.filter(movie => {
        return movie.title.toLowerCase().includes(query);
    });
    
    // (แก้) เรียกฟังก์ชัน render แถวใหม่
    renderMovieRows(filteredMovies); 
});


// --- ตัวตรวจสอบสถานะล็อกอิน (เหมือนเดิม) ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('ผู้ใช้ล็อกอินอยู่:', user.uid);
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserProfile = doc.data(); 
                } else {
                    console.log('สร้างโปรไฟล์ใหม่สำหรับ user นี้');
                    currentUserProfile = { email: user.email, isPremium: false };
                    db.collection('users').doc(user.uid).set(currentUserProfile);
                }
                
                authContainer.style.display = 'none'; 
                appContainer.style.display = 'block';
                userEmailDisplay.textContent = user.email;

                if (currentUserProfile.isPremium) {
                    premiumBadge.style.display = 'inline-block';
                } else {
                    premiumBadge.style.display = 'none';
                }
                
                if (allMovies.length === 0) {
                    fetchMovies(); 
                }
                
            }).catch((error) => {
                console.log("Error getting user profile:", error);
                currentUserProfile = { email: user.email, isPremium: false };
                if (allMovies.length === 0) {
                    fetchMovies();
                }
            });
            
    } else {
        console.log('ผู้ใช้ออกจากระบบแล้ว');
        currentUserProfile = null; 
        allMovies = []; 
        authContainer.style.display = 'block'; 
        appContainer.style.display = 'none';
        premiumBadge.style.display = 'none'; 
    }
});


// --- (แก้) ฟังก์ชันดึง "รายชื่อหนัง" (เรียก renderMovieRows) ---
function fetchMovies() {
    movieListContainer.innerHTML = '<p>กำลังโหลดรายชื่อหนัง...</p>';
    const dataUrl = 'https://raw.githubusercontent.com/lancerza/dddza/main/data.json'; 
    const cacheBustUrl = dataUrl + '?cachebust=' + new Date().getTime();

    fetch(cacheBustUrl)
        .then(response => {
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => { 
            if (!data || data.length === 0) {
                movieListContainer.innerHTML = '<p>ยังไม่มีหนังในระบบ</p>';
                return;
            }

            allMovies = data; 
            // (แก้) เรียกฟังก์ชัน render แถวใหม่
            renderMovieRows(allMovies);
        })
        .catch((error) => {
            console.error("Error fetching movie data: ", error);
            movieListContainer.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูลหนัง</p>';
        });
}

// --- (★ แก้ไข) ฟังก์ชันสำหรับแสดงผลแบบ "แถว" (Rows) (อัปเกรดแล้ว) ---
function renderMovieRows(movies) {
    movieListContainer.innerHTML = ''; // เคลียร์ของเก่า
    
    if (movies.length === 0) {
        movieListContainer.innerHTML = '<p>ไม่พบซีรี่ส์ที่คุณค้นหา</p>';
        return;
    }
    
    // --- 1. จัดกลุ่มหนังตาม Category ---
    const moviesByCategory = movies.reduce((groups, movie) => {
        const category = movie.category || 'อื่นๆ'; // ถ้าไม่มี category ให้อยู่ใน 'อื่นๆ'
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(movie);
        return groups;
    }, {});

    // --- 2. (แก้) จัดลำดับการแสดงผลแบบไดนามิก ---
    const preferredOrder = ['หนังไทย', 'ซีรี่ส์ฝรั่ง', 'การ์ตูน'];
    
    // ดึงหมวดหมู่อื่นๆ ที่เหลือทั้งหมด (ยกเว้น 'อื่นๆ')
    const otherCategories = Object.keys(moviesByCategory)
        .filter(category => !preferredOrder.includes(category) && category !== 'อื่นๆ')
        .sort(); // เรียงตามตัวอักษร

    // รวมลำดับทั้งหมด โดยให้ 'อื่นๆ' อยู่ท้ายสุดเสมอ
    const finalOrder = [...preferredOrder, ...otherCategories];
    
    // ถ้ามี 'อื่นๆ' ให้นำไปต่อท้าย
    if (moviesByCategory['อื่นๆ']) {
        finalOrder.push('อื่นๆ');
    }
    
    // --- 3. วนลูปด้วยลำดับใหม่นี้เพื่อสร้างแต่ละแถว ---
    finalOrder.forEach(category => {
        const moviesInCategory = moviesByCategory[category];
        
        if (moviesInCategory && moviesInCategory.length > 0) {
            // --- 4. สร้าง H2 (ชื่อหมวดหมู่) ---
            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category;
            movieListContainer.appendChild(categoryTitle);

            // --- 5. สร้าง Grid (แถวแนวนอน) สำหรับแถวนี้ ---
            const movieGrid = document.createElement('div');
            movieGrid.className = 'movie-grid'; // (ใช้ class ใหม่จาก CSS)
            
            // --- 6. วนลูปสร้างการ์ดหนังในแถวนี้ ---
            moviesInCategory.forEach((movie) => {
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';

                // ▼▼▼ (ใหม่!) เพิ่มป้าย Premium (👑) ▼▼▼
                if (movie.isPremium) {
                    const premiumBadge = document.createElement('div');
                    premiumBadge.className = 'card-premium-badge';
                    premiumBadge.textContent = '👑';
                    movieElement.appendChild(premiumBadge);
                }
                // ▲▲▲ (ใหม่!) จบส่วนป้าย Premium ▲▲▲
                
                movieElement.addEventListener('click', () => {
                    openModal(movie); 
                });
                
                const posterImg = document.createElement('img');
                posterImg.className = 'movie-poster';
                posterImg.src = movie.posterUrl || 'https://placehold.co/180x270/EDF2F7/718096?text=No+Image';
                posterImg.alt = movie.title;
                posterImg.loading = 'lazy'; 
                posterImg.onerror = () => { 
                    posterImg.src = 'https://placehold.co/180x270/EDF2F7/E53E3E?text=Error';
                };

                const movieDetails = document.createElement('div');
                movieDetails.className = 'movie-details';

                const movieInfo = document.createElement('div');
                movieInfo.className = 'movie-info';
                movieInfo.innerHTML = `
                    <h4>${movie.title || 'ไม่มีชื่อเรื่อง'}</h4> 
                    <p>${movie.genre || 'N/A'}</p> 
                `;
                
                movieElement.appendChild(posterImg);     
                movieElement.appendChild(movieDetails);    
                movieDetails.appendChild(movieInfo);     
                
                movieGrid.appendChild(movieElement); // เพิ่มใน grid ของแถว
            });
            
            movieListContainer.appendChild(movieGrid); // เพิ่ม grid ของแถว
        }
    });
}


// --- ฟังก์ชัน Modal (openModal) (เหมือนเดิม) ---
function openModal(movie) {
    modalBody.innerHTML = `
        <div class="modal-body-content">
            <img src="${movie.posterUrl || 'https://placehold.co/150x225/EDF2F7/718096?text=No+Image'}" alt="${movie.title}" class="modal-poster" onerror="this.src='https://placehold.co/150x225/EDF2F7/E53E3E?text=Error'">
            <div class="modal-info">
                <h2>${movie.title || 'ไม่มีชื่อเรื่อง'}</h2>
                <p>${movie.genre || 'N/A'} (ปี ${movie.year || 'N/A'})</p>
                <h3 class="modal-episodes-title" id="modal-title-type"></h3>
                <div class="modal-episodes-list" id="modal-episodes">
                    </div>
            </div>
        </div>
    `;

    const episodesList = document.getElementById('modal-episodes');
    const titleType = document.getElementById('modal-title-type');

    if (movie.episodes && movie.episodes.length > 0) {
        titleType.textContent = 'ตอนทั้งหมด';
        movie.episodes.forEach(ep => {
            const epButton = createPlayButton(ep.title, movie, ep.streamUrl);
            episodesList.appendChild(epButton);
        });
    } else if (movie.streamUrl) {
        titleType.textContent = 'รับชม';
        const playButton = createPlayButton('▶ เล่นเลย', movie, movie.streamUrl);
        episodesList.appendChild(playButton);
    } else {
        titleType.textContent = 'ข้อผิดพลาด';
        episodesList.innerHTML = '<p>ยังไม่มีตอนสำหรับเรื่องนี้</p>';
    }

    modalBackdrop.style.display = 'flex';
}


// --- ฟังก์ชัน createPlayButton (เหมือนเดิม) ---
function createPlayButton(buttonText, movie, streamUrl) {
    const playButton = document.createElement('button');
    playButton.className = 'play-button'; 
    
    const isMoviePremium = movie.isPremium || false; 
    const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false; 
    
    if(isMoviePremium) {
        playButton.textContent = '👑 ' + buttonText;
    } else {
        playButton.textContent = '▶ ' + buttonText;
    }

    if (isMoviePremium) {
        if (isUserPremium) {
            playButton.classList.add('premium-unlocked');
        } else {
            playButton.classList.add('premium-locked');
        }
    }

    playButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        
        if (isMoviePremium && !isUserPremium) {
            alert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!');
        } else {
            if (streamUrl) {
                playMovie(streamUrl); 
            } else {
                alert('ไม่พบลิงก์สำหรับเล่นหนังเรื่องนี้');
            }
        }
    });
    return playButton;
}

// --- ฟังก์ชัน playMovie (เหมือนเดิม) ---
function playMovie(videoUrl) {
    console.log('กำลังเล่น URL:', videoUrl);
    playerDiv.style.display = 'block';
    try {
        jwplayer("player-container").setup({
            file: videoUrl,
            type: "hls", 
            width: "100%",
            aspectratio: "16:9",
            autoplay: true 
        });
        playerDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error("JW Player error:", e);
        playerDiv.innerHTML = `<p style="color:red; padding:1rem;">เกิดข้อผิดพลาดในการโหลด JW Player</p>`;
    }
}
