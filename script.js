const firebaseConfig = {
  apiKey: "AIzaSyDq3sT7R3QL6oA8NTp7sBkV6uWNESzjmko",
  authDomain: "studentinfo-7b36d.firebaseapp.com",
  databaseURL: "https://studentinfo-7b36d-default-rtdb.firebaseio.com",
  projectId: "studentinfo-7b36d",
  storageBucket: "studentinfo-7b36d.firebasestorage.app",
  messagingSenderId: "10133236572",
  appId: "1:10133236572:web:28714298efdb380d692f99",
  measurementId: "G-PFXBVTTHHV"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const professionalPhrases = [
    "Securing handshake connection...",
    "Lo nghak lawk rawh......",
    "Lo nghak lawk rawh...",
    "Loading dashboard interfaces safely...",
    "Checking authorized ledger data records..."
];

function fireLoader(show) {
    const loader = document.getElementById("sarcasticLoader");
    if(show) {
        document.getElementById("loaderTextPhrase").innerText = professionalPhrases[Math.floor(Math.random() * professionalPhrases.length)];
        loader.style.display = "flex";
    } else {
        setTimeout(() => { loader.style.display = "none"; }, 400);
    }
}

function studentLogin(){
    const roll = document.getElementById("roll").value.trim();
    const password = document.getElementById("password").value.trim();

    if(!roll || !password) return alert("Please fill in both your roll number and password inputs.");

    fireLoader(true);
    
    database.ref('students/' + roll).once('value')
    .then((snapshot) => {
        if(snapshot.exists()) {
            const student = snapshot.val();
            if(student.password === password) {
                return database.ref('loginLogs').push().set({
                    roll: roll,
                    timestamp: new Date().toLocaleString()
                }).then(() => {
                    localStorage.setItem("currentStudentRoll", roll);
                    window.location.href = "./dashboard.html"; 
                });
            } else {
                fireLoader(false);
                alert("Incorrect account password. Please try again.");
            }
        } else {
            fireLoader(false);
            alert("No registered student record matches this Roll Number.");
        }
    })
    .catch(err => {
        fireLoader(false);
        console.error(err);
        alert("Login failed: " + err.message);
    });
}

function teacherLogin(){
    const teacherId = document.getElementById("teacherId").value.trim();
    const password = document.getElementById("teacherPassword").value.trim();

    if(!teacherId || !password) return alert("Please fill in both your Teacher ID and password inputs.");

    fireLoader(true);

    database.ref('teachers/' + teacherId).once('value')
    .then((snapshot) => {
        if(snapshot.exists()) {
            const teacher = snapshot.val();
            if(teacher.password === password) {
                localStorage.setItem("currentTeacherId", teacherId);
                localStorage.setItem("currentTeacherName", teacher.name);
                window.location.href = "./teacher-dashboard.html";
            } else {
                fireLoader(false);
                alert("Incorrect teacher account password.");
            }
        } else {
            fireLoader(false);
            alert("No registered teacher profile matches this ID.");
        }
    })
    .catch(err => {
        fireLoader(false);
        console.error(err);
        alert("Login fault occurred: " + err.message);
    });
}

// Fixed Admin Bypass Authentication Pattern
function adminLogin(){
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;

    if (username === 'admin123' && password === 'destiny') {
        localStorage.setItem('adminSessionActive', 'true');
        window.location.href = "./admin.html";
    } else {
        alert("Invalid administrative login credentials verified.");
    }
}