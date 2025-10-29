// --- ▼▼▼ FIREBASE CONFIG (config จริงของคุณ) ▼▼▼ ---
// นี่คือ Config ที่ถูกต้องที่คุณเคยส่งมา
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
const db = firebase.firestore(); // ยังต้องใช้ db สำหรับ 'users' collection (เช็ค Premium)

// --- ดึง ELEMENT ต่างๆ จาก HTML ---
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

// (ใหม่) ดึง Element ของ Search และ Modal
const searchBar = document.getElementById('search-bar');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');

// (ใหม่) ตัวแปรสำหรับเก็บข้อมูลทั้งหมด
let allMovies = []; // เก็บหนังทั้งหมดจาก data.json
let currentUserProfile = null; // เก็บสถานะ Premium

// --- ฟังก์ชันสลับหน้า LGOIN/REGISTER (เหมือนเดิม) ---
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
});

// --- ฟังก์ชัน FIREBASE AUTH (เหมือนเดิม) ---
btnRegister.addEventListener('click', (e) => {
    e.preventDefault();
    const email = registerEmail.value;
    const password = registerPassword.value;
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('สมัครสมาชิกสำเร็จ:', userCredential.user);
            registerError.style.display = 'none';
            // (แก้) สร้างโปรไฟล์ใน Firestore ทันที
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
        // (แก้) หยุดและซ่อน Player
        if (jwplayer("player-container").getState()) {
             jwplayer("player-container").remove();
        }
        playerDiv.style.display = 'none'; 
    });
});

// --- (ใหม่) Event Listener สำหรับ Search Bar ---
searchBar.addEventListener('keyup', (e) => {
    const query = e.target.value.toLowerCase();
    
    // กรองข้อมูลจาก allMovies
    const filteredMovies = allMovies.filter(movie => {
        return movie.name.toLowerCase().includes(query);
    });
    
    // แสดงผลเฉพาะที่ค้นหาเจอ
    renderMovies(filteredMovies); 
});

// --- (ใหม่) Event Listener สำหรับ Modal ---
modalCloseBtn.addEventListener('click', () => {
    modalBackdrop.style.display = 'none';
    modalBody.innerHTML = ''; // เคลียร์เนื้อหา
});
modalBackdrop.addEventListener('click', (e) => {
    // ถ้าคลิกที่พื้นหลังสีดำ ให้ปิด Modal
    if (e.target === modalBackdrop) {
        modalBackdrop.style.display = 'none';
        modalBody.innerHTML = ''; // เคลียร์เนื้อหา
    }
});


// --- ตัวตรวจสอบสถานะล็อกอิน (หัวใจหลัก) ---
auth.onAuthStateChanged((user) => {
    if (user) {
        // --- ผู้ใช้ล็อกอินอยู่ ---
        console.log('ผู้ใช้ล็อกอินอยู่:', user.uid);
        
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserProfile = doc.data(); 
                } else {
                    // (แก้) กรณี user ล็อกอิน (เช่น ด้วย Google) แต่ยังไม่มีโปรไฟล์
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
                
                // (แก้) เรียก fetchMovies แค่ครั้งเดียว
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
        // --- ผู้ใช้ออกจากระบบ ---
        console.log('ผู้ใช้ออกจากระบบแล้ว');
        currentUserProfile = null; 
        allMovies = []; // (ใหม่) เคลียร์ข้อมูลหนัง
        authContainer.style.display = 'block'; 
        appContainer.style.display = 'none';
        premiumBadge.style.display = 'none'; 
    }
});


// --- ฟังก์ชันดึง "รายชื่อหนัง" จาก GITHUB ---
function fetchMovies() {
    movieListContainer.innerHTML = '<p>กำลังโหลดรายชื่อหนัง...</p>';
    // (แก้) ใช้ URL จาก repo ของคุณ และเพิ่ม cache-bust
    // (***สำคัญ***: ตรวจสอบให้แน่ใจว่า path นี้ถูกต้อง 'lancerza/dddza/main/data.json')
    const dataUrl = 'https.://raw.githubusercontent.com/lancerza/dddza/main/data.json'; 
    const cacheBustUrl = dataUrl + '?cachebust=' + new Date().getTime();

    fetch(cacheBustUrl)
        .then(response => {
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => { 
            
            // (แก้) ตรวจสอบโครงสร้าง data.json ของคุณ (ที่มี .groups)
            if (!data.groups || data.groups.length === 0) {
                movieListContainer.innerHTML = '<p>ยังไม่มีหนังในระบบ (ตรวจสอบไฟล์ data.json)</p>';
                return;
            }

            // (ใหม่) เก็บข้อมูลทั้งหมดไว้ในตัวแปรหลัก
            allMovies = data.groups;
            // (ใหม่) เรียกฟังก์ชัน render เพื่อแสดงผล
            renderMovies(allMovies);
        })
        .catch((error) => {
            console.error("Error fetching movie data: ", error);
            movieListContainer.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูลหนัง (อาจหาไฟล์ data.json ไม่เจอ หรือไฟล์มีปัญหา)</p>';
        });
}

// --- (ใหม่) ฟังก์ชันสำหรับแสดงผล Grid Layout ---
function renderMovies(movies) {
    movieListContainer.innerHTML = ''; // เคลียร์ของเก่าก่อน
    
    if (movies.length === 0) {
        movieListContainer.innerHTML = '<p>ไม่พบซีรี่ส์ที่คุณค้นหา</p>';
        return;
    }
            
    movies.forEach((group) => {
        // --- สร้างการ์ด (Grid Item) ---
        const movieElement = document.createElement('div');
        movieElement.className = 'movie-item';
        
        // (ใหม่) เพิ่ม Event Listener ให้การ์ด เพื่อเปิด Modal
        movieElement.addEventListener('click', () => {
            openModal(group);
        });
        
        // --- สร้างโปสเตอร์ ---
        const posterImg = document.createElement('img');
        posterImg.className = 'movie-poster';
        // (แก้) ใช้ placeholder ที่ดีขึ้น
        posterImg.src = group.image || 'https://placehold.co/180x270/EDF2F7/718096?text=No+Image';
        posterImg.alt = group.name;
        posterImg.loading = 'lazy'; // (ใหม่) Lazy Loading
        posterImg.onerror = () => { // (ใหม่) กันรูปเจ๊ง
            posterImg.src = 'https://placehold.co/180x270/EDF2F7/E53E3E?text=Error';
        };

        // --- สร้างกล่องข้อมูล ---
        const movieDetails = document.createElement('div');
        movieDetails.className = 'movie-details';

        const movieInfo = document.createElement('div');
        movieInfo.className = 'movie-info';
        movieInfo.innerHTML = `
            <h4>${group.name || 'ไม่มีชื่อเรื่อง'}</h4>
            <p>${group.info || 'N/A'}</p>
        `;
        
        // --- ประกอบร่าง (การ์ด) ---
        movieElement.appendChild(posterImg);     
        movieElement.appendChild(movieDetails);    
        movieDetails.appendChild(movieInfo);     
        
        movieListContainer.appendChild(movieElement); 
    });
}

// --- (ใหม่) ฟังก์ชันสำหรับเปิดและสร้างเนื้อหาใน Modal ---
function openModal(movie) {
    // สร้างเนื้อหาใน Modal
    modalBody.innerHTML = `
        <div class="modal-body-content">
            <img src="${movie.image || 'https://placehold.co/150x225/EDF2F7/718096?text=No+Image'}" alt="${movie.name}" class="modal-poster" onerror="this.src='https://placehold.co/150x225/EDF2F7/E53E3E?text=Error'">
            <div class="modal-info">
                <h2>${movie.name || 'ไม่มีชื่อเรื่อง'}</h2>
                <p>${movie.info || 'N/A'}</p>
                <h3 class="modal-episodes-title">ตอนทั้งหมด</h3>
                <div class="modal-episodes-list" id="modal-episodes">
                    <!-- ปุ่มตอนจะถูกเพิ่มที่นี่ -->
                </div>
            </div>
        </div>
    `;

    // วนลูปสร้างปุ่มตอน
    const episodesList = document.getElementById('modal-episodes');
    if (movie.stations && movie.stations.length > 0) {
        movie.stations.forEach(station => {
            // (ใหม่) ส่งสถานะ Premium ของ 'movie' (group) ไปด้วย
            const epButton = createPlayButton(station.name, movie, station.url);
            episodesList.appendChild(epButton);
        });
    } else {
        episodesList.innerHTML = '<p>ยังไม่มีตอนสำหรับเรื่องนี้</p>';
    }

    // แสดง Modal
    modalBackdrop.style.display = 'flex';
}


// --- ฟังก์ชันสร้างปุ่ม (เช็ค PREMIUM) (แก้) ---
function createPlayButton(buttonText, movie, streamUrl) {
    const playButton = document.createElement('button');
    playButton.className = 'play-button'; 
    
    // (แก้) ตรวจสอบ currentUserProfile ก่อนใช้งาน
    const isMoviePremium = movie.isPremium || false; 
    const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false; 
    
    if(isMoviePremium) {
        playButton.textContent = '👑 ' + buttonText;
    } else {
        playButton.textContent = '▶ ' + buttonText; // (แก้) เพิ่มเว้นวรรค
    }

    if (isMoviePremium) {
        if (isUserPremium) {
            playButton.classList.add('premium-unlocked');
        } else {
            playButton.classList.add('premium-locked');
        }
    }

    playButton.addEventListener('click', (e) => {
        // (ใหม่) ป้องกันไม่ให้ Event การคลิกปุ่ม ไปเด้งปิด Modal
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

// --- ฟังก์ชันสำหรับเล่นวิดีโอ (แก้) ---
function playMovie(videoUrl) {
    console.log('กำลังเล่น URL:', videoUrl);
    
    playerDiv.style.display = 'block';

    // (แก้) ตรวจสอบว่ามี JW Player หรือไม่
    try {
        jwplayer("player-container").setup({
            file: videoUrl,
            type: "hls", // บอก JW Player ว่านี่คือไฟล์ HLS (m3u8)
            width: "100%",
            aspectratio: "16:9",
            autoplay: true 
        });

        // เลื่อนจอขึ้นไปดู Player
        playerDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error("JW Player error:", e);
        playerDiv.innerHTML = `<p style="color:red; padding:1rem;">เกิดข้อผิดพลาดในการโหลด JW Player (อาจบล็อคโดย AdBlocker)</p>`;
    }
}

