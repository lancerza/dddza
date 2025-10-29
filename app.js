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

// --- ฟังก์ชันสลับหน้า LGOIN/REGISTER ---
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

// --- ฟังก์ชัน FIREBASE AUTH ---

// 5.1 สมัครสมาชิก
btnRegister.addEventListener('click', (e) => {
    e.preventDefault();
    const email = registerEmail.value;
    const password = registerPassword.value;
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('สมัครสมาชิกสำเร็จ:', userCredential.user);
            registerError.style.display = 'none';
            // (คุณอาจจะอยากเพิ่มโค้ดสร้าง doc ใน 'users' collection ที่นี่
            // db.collection('users').doc(userCredential.user.uid).set({ email: email, isPremium: false });
            //)
        })
        .catch((error) => {
            console.error('สมัครสมาชิกล้มเหลว:', error.message);
            registerError.textContent = error.message;
            registerError.style.display = 'block';
        });
});

// 5.2 ล็อกอิน
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

// 5.3 ออกจากระบบ
btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log('ออกจากระบบสำเร็จ');
        // หยุดและลบ player ถ้ามี
        if (jwplayer("player-container").getState()) {
             jwplayer("player-container").remove();
        }
    });
});


// --- ตัวแปรสำหรับเก็บสถานะ Premium ---
let currentUserProfile = null; 

// --- ตัวตรวจสอบสถานะล็อกอิน (หัวใจหลัก) ---
auth.onAuthStateChanged((user) => {
    if (user) {
        // --- ผู้ใช้ล็อกอินอยู่ ---
        console.log('ผู้ใช้ล็อกอินอยู่:', user.uid);
        
        // ▼▼▼ ดึงข้อมูล User จาก FIRESTORE (เพื่อเช็ค Premium) ▼▼▼
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUserProfile = doc.data(); // เช่น { email: "...", isPremium: true }
                } else {
                    // ถ้ายังไม่มี doc, ให้ถือว่าเป็น User ธรรมดา (และสร้าง doc ใหม่ให้เลย)
                    console.log('สร้างโปรไฟล์ใหม่สำหรับ user นี้');
                    currentUserProfile = { email: user.email, isPremium: false };
                    db.collection('users').doc(user.uid).set(currentUserProfile);
                }
                
                // แสดงผลหน้าแอป
                authContainer.style.display = 'none'; 
                appContainer.style.display = 'block';
                userEmailDisplay.textContent = user.email;
                
                // ★★★ เรียก fetchMovies (ที่ดึงจาก GitHub) ★★★
                fetchMovies(); 
                
            }).catch((error) => {
                // ถ้า Error (เช่น security rules), ให้เป็น User ธรรมดาไปก่อน
                console.log("Error getting user profile:", error);
                currentUserProfile = { email: user.email, isPremium: false };
                fetchMovies();
            });
            
    } else {
        // --- ผู้ใช้ออกจากระบบ ---
        console.log('ผู้ใช้ออกจากระบบแล้ว');
        currentUserProfile = null; // ล้างสถานะ
        authContainer.style.display = 'block'; 
        appContainer.style.display = 'none';
    }
});


// --- ฟังก์ชันดึง "รายชื่อหนัง" จาก GITHUB ---
function fetchMovies() {
    movieListContainer.innerHTML = '<p>กำลังโหลดรายชื่อหนัง...</p>';

    // ★★★ นี่คือ URL ของไฟล์ data.json บน GITHUB ★★★
    const dataUrl = 'https://raw.githubusercontent.com/lancerza/dddza/main/data.json';
    
    // เพิ่ม ?cachebust=... เพื่อบังคับโหลดใหม่ทุกครั้ง (กัน GitHub cache)
    const cacheBustUrl = dataUrl + '?cachebust=' + new Date().getTime();

    fetch(cacheBustUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json(); // แปลง response เป็น JSON
        })
        .then(data => { // 'data' คือ array ที่ได้จาก data.json
            if (data.length === 0) {
                movieListContainer.innerHTML = '<p>ยังไม่มีหนังในระบบ (โปรดเพิ่มข้อมูลใน data.json)</p>';
                return;
            }

            movieListContainer.innerHTML = ''; // เคลียร์ข้อความ "กำลังโหลด..."
            
            data.forEach((movie) => {
                // --- 1. สร้างกล่องหลัก ---
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';
                
                // --- 2. สร้างโปสเตอร์ (ซ้าย) ---
                const posterImg = document.createElement('img');
                posterImg.className = 'movie-poster';
                // (เพิ่มรูปสำรอง ถ้าไม่มี posterUrl ใน data.json)
                posterImg.src = movie.posterUrl || 'https://placehold.co/100x150/222/555?text=No+Image';
                posterImg.alt = movie.title;
                posterImg.onerror = () => { // ถ้า link รูปเจ๊ง
                    posterImg.src = 'https://placehold.co/100x150/222/555?text=Error';
                };

                // --- 3. สร้างกล่องข้อมูล (ขวา) ---
                const movieDetails = document.createElement('div');
                movieDetails.className = 'movie-details';

                // --- 4. สร้างข้อมูล (บน-ขวา) ---
                const movieInfo = document.createElement('div');
                movieInfo.className = 'movie-info';
                movieInfo.innerHTML = `
                    <h4>${movie.title || 'ไม่มีชื่อเรื่อง'} (${movie.year || 'N/A'})</h4>
                    <p>ประเภท: ${movie.genre || 'N/A'}</p>
                `;
                
                // --- 5. สร้างกล่องปุ่ม (ล่าง-ขวา) ---
                const movieActions = document.createElement('div');
                movieActions.className = 'movie-actions';

                // --- 6. สร้างปุ่ม (วนลูป) ---
                if (movie.episodes) {
                    // ถ้าเป็นซีรี่ส์ (มี episodes)
                    movie.episodes.forEach(ep => {
                        const epButton = createPlayButton(ep.title, movie, ep.streamUrl);
                        movieActions.appendChild(epButton); // เพิ่มปุ่มในกล่อง actions
                    });
                } else {
                    // ถ้าเป็นหนังเดี่ยว (มี streamUrl)
                    const playButton = createPlayButton('▶ เล่น', movie, movie.streamUrl);
                    movieActions.appendChild(playButton); // เพิ่มปุ่มในกล่อง actions
                }

                // --- 7. ประกอบร่าง ---
                movieElement.appendChild(posterImg);     // เพิ่มโปสเตอร์ (ซ้าย) เข้ากล่องหลัก
                movieDetails.appendChild(movieInfo);     // เพิ่มข้อมูล เข้ากล่อง (ขวา)
                movieDetails.appendChild(movieActions);  // เพิ่มปุ่ม เข้ากล่อง (ขวา)
                movieElement.appendChild(movieDetails);    // เพิ่มกล่อง (ขวา) เข้ากล่องหลัก
                
                movieListContainer.appendChild(movieElement); // เพิ่มกล่องหลัก ลงในลิสต์
            });
        })
        .catch((error) => {
            console.error("Error fetching movie data: ", error);
            movieListContainer.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูลหนังจาก GitHub (อาจต้องรอสักครู่ หรือไฟล์ data.json มีปัญหา)</p>';
        });
}

// --- ฟังก์ชันสร้างปุ่ม (เช็ค PREMIUM) ---
function createPlayButton(buttonText, movie, streamUrl) {
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.textContent = buttonText;
    
    // ตรวจสอบสถานะ Premium ของหนัง
    const isMoviePremium = movie.isPremium || false; 
    
    // ถ้าหนังเป็น Premium, เพิ่มสัญลักษณ์ 👑
    if(isMoviePremium) {
        playButton.textContent = '👑 ' + buttonText;
    }

    playButton.addEventListener('click', () => {
        // (currentUserProfile มาจาก onAuthStateChanged ที่ดึงจาก Firestore)
        const isUserPremium = currentUserProfile ? currentUserProfile.isPremium : false; 

        // ▼▼▼ เงื่อนไข Premium ▼▼▼
        if (isMoviePremium && !isUserPremium) {
            alert('เนื้อหานี้สำหรับสมาชิกพรีเมียมเท่านั้น!');
        } else {
            // ถ้า "หนังฟรี" หรือ "User เป็น Premium"
            if (streamUrl) {
                playMovie(streamUrl); 
            } else {
                alert('ไม่พบลิงก์สำหรับเล่นหนังเรื่องนี้');
            }
        }
    });
    return playButton;
}

// --- ฟังก์ชันสำหรับเล่นวิดีโอด้วย JW PLAYER ---
function playMovie(videoUrl) {
    console.log('กำลังเล่น URL:', videoUrl);
    
    // สั่งให้ JW Player ทำงาน
    jwplayer("player-container").setup({
        file: videoUrl,
        type: "hls", // บอก JW Player ว่านี่คือไฟล์ HLS (m3u8)
        width: "100%",
        aspectratio: "16:9",
        autoplay: true // เล่นอัตโนมัติเมื่อกด
    });

    // เลื่อนจอขึ้นไปดู Player
    playerDiv.scrollIntoView({ behavior: 'smooth' });
}
