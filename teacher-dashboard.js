// ── Firebase Config ────────────────────────────────────────────
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

let globalStudentsList = [];
let instructorName = "Faculty Member";

// ── Session Guard ──────────────────────────────────────────────
window.onload = function() {
    if (!localStorage.getItem('currentTeacherId')) {
        alert("Session invalid! Booting to access screen.");
        window.location.href = "index.html";
        return;
    }
    
    instructorName = localStorage.getItem("currentTeacherName") || "Professor";
    document.getElementById("instructorName").innerText = "Prof. " + instructorName;
    document.getElementById("instructorIdDisplay").innerText = "ID: " + localStorage.getItem("currentTeacherId");
    
    if(document.getElementById('marksDate')) {
        document.getElementById('marksDate').valueAsDate = new Date();
    }

    // Pull registered students into cache list to support Name Auto-Completion
    database.ref('students').on('value', snapshot => {
        globalStudentsList = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let val = child.val();
                globalStudentsList.push({
                    rollNumber: child.key,
                    fullName: val.fullName || "",
                    department: val.department || "",
                    year: val.year || ""
                });
            });
        }
    });

    // ── REAL-TIME SOS LISTENER FOR FACULTY STAFF ──
    database.ref('globalNoticeboard').on('child_added', snapshot => {
        const notice = snapshot.val();
        const noticeId = snapshot.key;

        // Teachers intercept every notice universally so they are kept in loop
        if (sessionStorage.getItem(`dismissed_sos_${noticeId}`) !== 'true') {
            document.getElementById("sos-title").innerText = notice.title;
            document.getElementById("sos-body").innerText = notice.content;
            document.getElementById("sos-timestamp").innerText = `Target Audience: ${notice.targetAudience} | Sent: ${notice.timestamp}`;
            
            document.getElementById("sosNoticeModal").dataset.activeNoticeId = noticeId;
            document.getElementById("sosNoticeModal").style.display = "flex";
        }
    });
};

// Dismiss Functionality 
function acknowledgeSosNotice() {
    const modal = document.getElementById("sosNoticeModal");
    const activeId = modal.dataset.activeNoticeId;
    if(activeId) {
        sessionStorage.setItem(`dismissed_sos_${activeId}`, 'true');
    }
    modal.style.display = "none";
}

// ── View Switcher Router ─────────────────────────────────────────
function switchView(viewId, element) {
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.querySelectorAll('.menu-links li').forEach(item => {
        item.classList.remove('active');
    });

    const targetPanel = document.getElementById('view-' + viewId);
    if(targetPanel) {
        targetPanel.classList.add('active');
    }
    if(element) {
        element.classList.add('active');
    }

    closeMobileSidebar();
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById("sidebarNode");
    sidebar.style.transform = sidebar.style.transform === "translateX(0px)" ? "translateX(-280px)" : "translateX(0px)";
}

// ── Dynamic Form Syllabi Filtering ────────────────────────────────
const courseSyllabusDataset = {
    "BCA": ["Mathematics", "Computer Fundamentals", "C Programming", "Data Structures", "Database Management Systems", "Web Technology"],
    "BBA": ["Principles of Management", "Business Economics", "Financial Accounting", "Marketing Management", "Human Resource Management"],
    "BBA HT": ["Hotel Engineering", "Front Office Logistics", "Food Production Systems", "Tourism Economics"],
    "BA": ["English Literature", "Political Science", "Sociology Core Parameters", "History Modules"],
    "BSW": ["Social Work Intro", "Community Analysis Indices", "Psychology Foundation"],
    "BCOM": ["Corporate Accounting", "Business Law Practices", "Auditing Matrices", "Taxation Frameworks"],
    "MBA": ["Strategic Decisions Corporate", "Managerial Economics", "Organizational Behavior Framework"],
    "MCOM": ["Advanced Accounting Logs", "Financial Policy Analytics", "Statistical Modeling"],
    "MSW": ["Advanced Counseling Dynamics", "Field Research Projects", "Social Welfare Policy"],
    "MA": ["Advanced Linguistic Theory", "Philosophical Synthesis", "Historical Historiography"],
    "DOC": ["Research Thesis Methodology", "Quantitative Empirical Analytics", "Academic Publication Codes"]
};

function handleMarksFilterChange() {
    const dept = document.getElementById("marksDept").value;
    const sem = document.getElementById("marksSem").value;
    const subjectSelect = document.getElementById("marksSubject");

    if (dept && sem) {
        subjectSelect.disabled = false;
        subjectSelect.innerHTML = '<option value="">-- Choose Course --</option>';
        
        const courses = courseSyllabusDataset[dept] || ["General Syllabus Parameters"];
        courses.forEach(course => {
            subjectSelect.innerHTML += `<option value="${course}">${course}</option>`;
        });

        document.getElementById("marksExam").disabled = false;
        document.getElementById("marksObtained").disabled = false;
        document.getElementById("marksMax").disabled = false;
        document.getElementById("marksSubmitBtn").disabled = false;
    } else {
        subjectSelect.disabled = true;
        subjectSelect.innerHTML = '<option value="">-- Select Department & Semester First --</option>';
        document.getElementById("marksExam").disabled = true;
        document.getElementById("marksObtained").disabled = true;
        document.getElementById("marksMax").disabled = true;
        document.getElementById("marksSubmitBtn").disabled = true;
    }
}

// ── Search Auto-Completion Suggestion Core Engines ──────────────
function searchStudentByName() {
    const input = document.getElementById("marksStudentSearch").value.toLowerCase().trim();
    const suggestionsBox = document.getElementById("studentSuggestions");
    const dept = document.getElementById("marksDept").value;
    
    suggestionsBox.innerHTML = "";
    if (!input) return;

    let filtered = globalStudentsList.filter(s => 
        s.fullName.toLowerCase().includes(input) && 
        (!dept || s.department === dept)
    );

    filtered.forEach(student => {
        let div = document.createElement("div");
        div.className = "suggestion-item";
        div.innerText = `${student.fullName} (${student.rollNumber}) - ${student.department}`;
        div.onclick = function() {
            document.getElementById("marksStudentSearch").value = student.fullName;
            document.getElementById("marksStudentRoll").value = student.rollNumber;
            document.getElementById("previewName").innerText = student.fullName;
            document.getElementById("previewRoll").innerText = student.rollNumber;
            document.getElementById("studentPreviewCard").style.display = "flex";
            suggestionsBox.innerHTML = "";
            calculatePercentage();
        };
        suggestionsBox.appendChild(div);
    });
}

function searchStudentByNameRemarks() {
    const input = document.getElementById("remarksStudentSearch").value.toLowerCase().trim();
    const suggestionsBox = document.getElementById("studentSuggestionsRemarks");
    const dept = document.getElementById("remarksDept").value;
    
    suggestionsBox.innerHTML = "";
    if (!input) return;

    let filtered = globalStudentsList.filter(s => 
        s.fullName.toLowerCase().includes(input) && 
        (!dept || s.department === dept)
    );

    filtered.forEach(student => {
        let div = document.createElement("div");
        div.className = "suggestion-item";
        div.innerText = `${student.fullName} (${student.rollNumber})`;
        div.onclick = function() {
            document.getElementById("remarksStudentSearch").value = student.fullName;
            document.getElementById("remarksStudentRoll").value = student.rollNumber;
            suggestionsBox.innerHTML = "";
        };
        suggestionsBox.appendChild(div);
    });
}

function calculatePercentage() {
    const obtained = parseFloat(document.getElementById("marksObtained").value);
    const max = parseFloat(document.getElementById("marksMax").value);
    const display = document.getElementById("percentDisplay");

    if (obtained && max && max > 0) {
        let percentage = ((obtained / max) * 100).toFixed(2);
        display.innerText = percentage + "%";
    } else {
        display.innerText = "--";
    }
}

// ── Form Submit Handler Data Pipelines ────────────────────────────
function handleFormSubmission(type) {
    if(event) event.preventDefault();
    const timestamp = new Date().toISOString();
    let submissionPayload = {};
    let nodePath = "";

    if (type === 'marks') {
        const roll = document.getElementById("marksStudentRoll").value;
        if(!roll) { alert("Please click an autocomplete option to select a valid student."); return; }

        submissionPayload = {
            rollNumber: roll,
            department: document.getElementById("marksDept").value,
            semester: document.getElementById("marksSem").value,
            subject: document.getElementById("marksSubject").value,
            examination: document.getElementById("marksExam").value,
            marksObtained: document.getElementById("marksObtained").value,
            marksMax: document.getElementById("marksMax").value,
            instructor: instructorName,
            date: document.getElementById("marksDate").value
        };
        nodePath = 'marks/' + roll;

    } else if (type === 'remarks') {
        const roll = document.getElementById("remarksStudentRoll").value;
        if(!roll) { alert("Please select a student from name matches."); return; }

        submissionPayload = {
            rollNumber: roll,
            title: document.getElementById("remarksTitle").value.trim(),
            content: document.getElementById("remarksContent").value.trim(),
            severity: document.getElementById("remarksSeverity").value,
            instructor: instructorName,
            date: timestamp
        };
        nodePath = 'remarks/' + roll;

    } else if (type === 'homework') {
        submissionPayload = {
            department: document.getElementById("homeworkDept").value,
            semester: document.getElementById("homeworkSem").value,
            subject: document.getElementById("homeworkSubject").value.trim(),
            deadline: document.getElementById("homeworkDeadline").value,
            content: document.getElementById("homeworkText").value.trim(),
            instructor: instructorName,
            date: timestamp
        };
        nodePath = 'homework';

    } else if (type === 'assignments') {
        submissionPayload = {
            department: document.getElementById("assignDept").value,
            semester: document.getElementById("assignSem").value,
            code: document.getElementById("assignCode").value.trim(),
            weightage: document.getElementById("assignWeight").value,
            content: document.getElementById("assignText").value.trim(),
            instructor: instructorName,
            date: timestamp
        };
        nodePath = 'assignments';
    }

    database.ref(nodePath).push(submissionPayload)
    .then(() => {
        alert("Record successfully deployed into database matrices!");
        document.getElementById(type + "Form").reset();
        if (type === 'marks') {
            document.getElementById("studentPreviewCard").style.display = "none";
            document.getElementById("percentDisplay").innerText = "--";
            handleMarksFilterChange();
        }
    })
    .catch(err => alert("Database system write error: " + err.message));
}

function triggerLogout() {
    localStorage.removeItem("currentTeacherId");
    localStorage.removeItem("currentTeacherName");
    window.location.href = "index.html";
}

function closeMobileSidebar() {
    const sidebar = document.getElementById("sidebarNode");
    if(window.innerWidth <= 992 && sidebar) {
        sidebar.style.transform = "translateX(-280px)";
    }
}