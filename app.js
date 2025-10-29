// --- ▼▼▼ นี่คือ FIREBASE CONFIG ของจริงของคุณ (แก้ไขแล้ว) ▼▼▼ ---
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
const db = firebase.firestore(); // เรียกใช้ Firestore

// --- ดึง ELEMENT ต่างๆ จาก HTML ---
// ส่วนของ Auth
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// ฟอร์มล็อกอิน
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

// ฟอร์มสมัคร
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const btnRegister = document.getElementById('btn-register');
const registerError = document.getElementById('register-error');

// ส่วนของ App (หลังล็อกอิน)
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const movieListContainer = document.getElementById('movie-list-container');
const playerDiv = document.getElementById('player-container'); // ดึง player container มาด้วย

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

// --- ตัวตรวจสอบสถานะล็อกอิน (หัวใจหลัก) ---
auth.onAuthStateChanged((user) => {
    if (user) {
        // --- ผู้ใช้ล็อกอินอยู่ ---
        console.log('ผู้ใช้ล็อกอินอยู่:', user.email);
        authContainer.style.display = 'none'; // ซ่อนฟอร์มล็อกอิน
        appContainer.style.display = 'block';  // แสดงหน้าแอป
        userEmailDisplay.textContent = user.email;

        // **เรียกฟังก์ชันดึงรายชื่อหนัง**
        fetchMovies(); 

    } else {
        // --- ผู้ใช้ออกจากระบบ ---
        console.log('ผู้ใช้ออกจากระบบแล้ว');
        authContainer.style.display = 'block'; // แสดงฟอร์มล็อกอิน
        appContainer.style.display = 'none';  // ซ่อนหน้าแอป
    }
});


// --- ฟังก์ชันดึง "รายชื่อหนัง" จาก FIRESTORE ---
function fetchMovies() {
    movieListContainer.innerHTML = '<p>กำลังโหลดรายชื่อหนัง...</p>';

    // เราจะไปดึงข้อมูลจาก collection ที่ชื่อ 'movies'
    db.collection('movies').get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                movieListContainer.innerHTML = '<p>ยังไม่มีหนังในระบบ (โปรดเพิ่มข้อมูลใน Firestore)</p>';
                return;
            }

            movieListContainer.innerHTML = ''; // เคลียร์ข้อความ "กำลังโหลด..."
            
            querySnapshot.forEach((doc) => {
                const movie = doc.data();
                
                // สร้าง HTML Element
                const movieElement = document.createElement('div');
                movieElement.className = 'movie-item';
                
                // สร้างส่วนข้อมูล (ซ้าย)
                const movieInfo = document.createElement('div');
                movieInfo.className = 'movie-info';
                movieInfo.innerHTML = `
                    <h4>${movie.title || 'ไม่มีชื่อเรื่อง'} (${movie.year || 'N/A'})</h4>
                    <p>ประเภท: ${movie.genre || 'N/A'}</p>
                `;
                
                // สร้างปุ่ม (ขวา)
                const playButton = document.createElement('button');
                playButton.className = 'play-button';
                playButton.textContent = '▶ เล่น';

                // เพิ่ม Event Listener ให้ปุ่ม
                playButton.addEventListener('click', () => {
                    const streamUrl = movie.streamUrl;
                    
                    if (streamUrl) {
                        playMovie(streamUrl); // ส่ง URL ไปให้ฟังก์ชัน playMovie
                    } else {
                        alert('ไม่พบลิงก์สำหรับเล่นหนังเรื่องนี้');
                    }
                });

                // ประกอบร่าง
                movieElement.appendChild(movieInfo);
                movieElement.appendChild(playButton);
                movieListContainer.appendChild(movieElement);
            });

        })
        .catch((error) => {
            console.error("Error getting documents: ", error);
            movieListContainer.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
        });
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
