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

// --- (ใหม่) ฟังก์ชัน Debounce (จากครั้งก่อน) ---
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

// --- (ใหม่) Event Listener สำหรับ Search Bar (แบบ Debounce) ---
const debouncedSearch = debounce((e) => {
    const query = e.target.value.toLowerCase();
    
    const filteredMovies = allMovies.filter(movie => {
        return movie.title.toLowerCase().includes(query);
    });
    
    renderMovieRows(filteredMovies); 
}, 300); // หน่วงเวลา 300ms

searchBar.addEventListener('keyup', debouncedSearch);


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


// --- (แก้) ฟังก์ชันดึง "รายชื่อหนัง" (เพิ่ม Skeleton Loader) (จากครั้งก่อน) ---
function fetchMovies() {
    // (ใหม่!) สร้าง Skeleton HTML
    let skeletonHTML = '';
    const skeletonGrid = `
        <div class="movie-grid">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>`;
    
    skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
    skeletonHTML += `<div class="skeleton-title"></div>${skeletonGrid}`;
    
    movieListContainer.innerHTML = skeletonHTML; // แสดง Skeleton
    
    // ดึงข้อมูลจริง (สมมติว่า data.json ของคุณอัปเดตแล้ว)
    // ★★★ อย่าลืมเปลี่ยน URL นี้เป็น URL ของ data.json ที่คุณอัปโหลดไว้ ★★★
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
            renderMovieRows(allMovies); // แทนที่ Skeleton ด้วยข้อมูลจริง
        })
        .catch((error) => {
            console.error("Error fetching movie data: ", error);
            movieListContainer.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูลหนัง</p>';
        });
}

// --- (★ อัปเกรด) ฟังก์ชันสำหรับแสดงผลแบบ "แถว" (Rows) ---
function renderMovieRows(movies) {
    movieListContainer.innerHTML = ''; // เคลียร์ของเก่า
    
    if (movies.length === 0) {
        movieListContainer.innerHTML = '<p>ไม่พบซีรี่ส์ที่คุณค้นหา</p>';
        return;
    }
    
    // --- 1. จัดกลุ่มหนังตาม Category (เหมือนเดิม) ---
    const moviesByCategory = movies.reduce((groups, movie) => {
        const category = movie.category || 'อื่นๆ'; 
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(movie);
        return groups;
    }, {});

    // --- 2. จัดลำดับการแสดงผลแบบไดนามิก (เหมือนเดิม) ---
    const preferredOrder = ['หนังไทย', 'ซีรี่ส์ฝรั่ง', 'ซีรี่ส์เกาหลี', 'การ์ตูน']; // ★ สามารถปรับลำดับหมวดหมู่หลักได้ที่นี่
    const otherCategories = Object.keys(moviesByCategory)
        .filter(category => !preferredOrder.includes(category) && category !== 'อื่นๆ')
        .sort(); 
    const finalOrder = [...preferredOrder, ...otherCategories];
    if (moviesByCategory['อื่นๆ']) {
        finalOrder.push('อื่นๆ');
    }
    
    // --- 3. วนลูปด้วยลำดับใหม่นี้เพื่อสร้างแต่ละแถว (เหมือนเดิม) ---
    finalOrder.forEach(category => {
        const moviesInCategory = moviesByCategory[category];
        
        if (moviesInCategory && moviesInCategory.length > 0) {
            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category;
            movieListContainer.appendChild(categoryTitle);

            const movieGrid = document.createElement('div');
            movieGrid.className = 'movie-grid'; 
            
            // --- 4. (★ อัปเกรด) วนลูปสร้างการ์ดหนังในแถวนี้ ---
            moviesInCategory.forEach((movie) => {
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';
                
                // (ใหม่) ดึงข้อมูลมาเตรียมไว้ (ถ้าไม่มีให้เป็นค่าว่าง)
                const isPremium = movie.isPremium || false;
                const isHD = movie.isHD || false;
                const rating = movie.rating || 0;
                const epInfo = movie.episodeInfo || '';
                const desc = movie.description_short || movie.genre || ''; // ถ้าไม่มี desc สั้น ให้ใช้ genre แทน
                const poster = movie.posterUrl || 'https://placehold.co/180x270/EDF2F7/718096?text=No+Image';

                // (ใหม่) สร้าง HTML ด้วย Template Literal
                movieElement.innerHTML = `
                    ${isPremium ? '<div class="badge badge-premium">👑</div>' : ''}
                    ${isHD ? '<div class="badge badge-hd">HD</div>' : ''}
                    ${rating > 0 ? `<div class="badge badge-rating">⭐ ${rating.toFixed(1)}</div>` : ''}

                    <img class="movie-poster" src="${poster}" alt="${movie.title}" loading="lazy" onerror="this.src='https://placehold.co/180x270/EDF2F7/E53E3E?text=Error'">
                    
                    <div class="movie-details-overlay">
                        <h4>${movie.title || 'ไม่มีชื่อเรื่อง'}</h4>
                        <p class="desc">${desc}</p>
                        <div class="overlay-buttons">
                            <button class="btn-overlay btn-overlay-play">▶ เล่น</button>
                            <button class="btn-overlay btn-overlay-info">ⓘ</button>
                        </div>
                        <div class="overlay-ep-info">${epInfo}</div>
                    </div>
                `;
                
                // --- 5. (★ ใหม่) เพิ่ม Event Listeners ให้กับปุ่มใน Overlay ---
                
                // ปุ่ม Info (ⓘ) -> เปิด Modal เพื่อเลือกตอน
                movieElement.querySelector('.btn-overlay-info').addEventListener('click', (e) => {
                    e.stopPropagation(); // ป้องกัน event ซ้อน
                    openModal(movie); 
                });

                // ปุ่ม Play (▶) -> เล่นเลย (ถ้าเป็นซีรีส์จะเล่นตอน 1)
                movieElement.querySelector('.btn-overlay-play').addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    let streamUrlToPlay = null;
                    let contentIdToPlay = null;
                    
                    if (movie.streamUrl) {
                        // 1. ถ้าเป็นหนังเดี่ยว
                        streamUrlToPlay = movie.streamUrl;
                        contentIdToPlay = movie.title;
                    } else if (movie.episodes && movie.episodes.length > 0) {
                        // 2. ถ้าเป็นซีรีส์, เล่นตอนที่ 1
                        streamUrlToPlay = movie.episodes[0].streamUrl;
                        contentIdToPlay = movie.title + " | " + movie.episodes[0].title;
                    }
                    
                    // ตรวจสอบ Premium ก่อนเล่น
                    const isMoviePremium = movie.isPremium || false; 
                    const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false;

                    if (isMoviePremium && !isUserPremium) {
                        alert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!');
                    } else if (streamUrlToPlay) {
                        playMovie(streamUrlToPlay, contentIdToPlay);
                    } else {
                        // ถ้าไม่มี streamUrl และ ไม่มี episodes
                        alert('ไม่พบลิงก์สำหรับเล่น');
                    }
                });

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


// --- ฟังก์ชัน createPlayButton (สำหรับใน Modal) (อัปเดต: ส่ง contentId) (จากครั้งก่อน) ---
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

    // สร้าง ID เฉพาะสำหรับเนื้อหานี้
    const contentId = movie.episodes ? (movie.title + " | " + buttonText) : movie.title;

    playButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        
        if (isMoviePremium && !isUserPremium) {
            alert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!');
        } else {
            if (streamUrl) {
                // ส่ง contentId ไปด้วย
                playMovie(streamUrl, contentId); 
            } else {
                alert('ไม่พบลิงก์สำหรับเล่นหนังเรื่องนี้');
            }
        }
    });
    return playButton;
}

// --- ฟังก์ชัน playMovie (อัปเดต: เพิ่มระบบ "ดูต่อ" และ Error Handling) (จากครั้งก่อน) ---
async function playMovie(videoUrl, contentId) {
    console.log('กำลังเล่น ID:', contentId);
    playerDiv.style.display = 'block';

    let savedPosition = 0; // เวลาที่บันทึกไว้ (ค่าเริ่มต้นคือ 0)
    let docRef = null; // ตัวแปรสำหรับอ้างอิง Firestore

    // --- 1. ตรวจสอบ Firestore ก่อนเล่น ---
    if (auth.currentUser) {
        try {
            // สร้าง reference ไปยังเอกสารประวัติการดู
            docRef = db.collection('users').doc(auth.currentUser.uid)
                       .collection('watchHistory').doc(contentId);
            
            const doc = await docRef.get();
            if (doc.exists) {
                savedPosition = doc.data().position;
                console.log(`พบประวัติการดู: ${savedPosition} วินาที`);
            }
        } catch (e) {
            console.error("Error getting watch history:", e);
        }
    }

    try {
        jwplayer("player-container").setup({
            file: videoUrl,
            type: "hls", 
            width: "100%",
            aspectratio: "16:9",
            autoplay: true,
            // เริ่มเล่นจากเวลาที่บันทึกไว้ (ลบ 5 วิ เผื่อทวนความจำ)
            starttime: savedPosition > 5 ? savedPosition - 5 : 0 
        });

        playerDiv.scrollIntoView({ behavior: 'smooth' });

        // --- 2. บันทึกประวัติการดู (Save) ---
        if (docRef) { // ถ้า user ล็อกอิน และเรามี docRef
            let lastSaveTime = 0;
            const saveInterval = 10000; // บันทึกทุกๆ 10 วินาที (10000ms)

            jwplayer("player-container").on('time', (event) => {
                const now = Date.now();
                // "Throttle" - จำกัดการเขียนลง DB ไม่ให้บ่อยเกินไป
                if (now - lastSaveTime > saveInterval) {
                    const currentPosition = event.position;
                    // ไม่บันทึกถ้าดูใกล้จบมากแล้ว (เช่น เหลือ 30 วิ)
                    if (event.duration > 0 && (event.duration - currentPosition) > 30) {
                        docRef.set({
                            position: currentPosition,
                            lastWatched: new Date(),
                            duration: event.duration
                        }, { merge: true }); // merge: true เพื่อไม่ให้เขียนทับฟิลด์อื่น
                        
                        lastSaveTime = now;
                    }
                }
            });
        }
        
        // --- 3. จัดการ Error ---
        jwplayer("player-container").on('error', (event) => {
            console.error("JW Player Error:", event.message);
            playerDiv.innerHTML = `
                <div class="player-error-message">
                    <h3>เกิดข้อผิดพลาด</h3>
                    <p>ขออภัย ไม่สามารถเล่นไฟล์นี้ได้ในขณะนี้ (ลิงก์อาจหมดอายุหรือถูกลบ)</p>
                </div>`;
        });

    } catch (e) {
        console.error("JW Player error:", e);
        playerDiv.innerHTML = `<p style="color:red; padding:1rem;">เกิดข้อผิดพลาดในการโหลด JW Player</p>`;
    }
}
