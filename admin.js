// ── Session Guard ──────────────────────────────────────────────
window.onload = function() {
    if (localStorage.getItem('adminSessionActive') !== 'true') {
        alert("Unauthorized access! Booting to login screen.");
        window.location.href = "./index.html";
    }
};

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

let globalStudentsCacheList = [];

// ── Syllabus Dataset ───────────────────────────────────────────
const syllabusDataset = {
    "BCA": ["Mathematics", "Computer Fundamentals", "C Programming", "Data Structures", "Database Management Systems", "Web Technology"],
    "BBA": ["Principles of Management", "Business Economics", "Financial Accounting", "Marketing Management", "Human Resource Management"],
    "BBA_HT": ["Hospitality Management", "Tourism Operations", "Front Office Basics", "Food & Beverage Control"],
    "BCOM": ["Corporate Accounting", "Business Law", "Auditing", "Cost Accounting", "Income Tax Rules"],
    "MBA": ["Strategic Management", "Organizational Behavior", "Corporate Finance", "Operations Research"]
};

// ── DOMContentLoaded Init ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
    syncAllStudentsData();
    updateLinkedSubjectsOptions();
    if(document.getElementById('marks-date')) {
        document.getElementById('marks-date').valueAsDate = new Date();
    }

    // Link events to drop-down selection shifts
    if(document.getElementById("marks-dept")) {
        document.getElementById("marks-dept").addEventListener("change", () => {
            updateLinkedSubjectsOptions();
            handleGradingHierarchyCascade();
        });
    }
    if(document.getElementById("marks-semester")) {
        document.getElementById("marks-semester").addEventListener("change", handleGradingHierarchyCascade);
    }
    
    if(document.getElementById("view-dept")) {
        document.getElementById("view-dept").addEventListener("change", handleViewHierarchyCascade);
    }
    if(document.getElementById("view-semester")) {
        document.getElementById("view-semester").addEventListener("change", handleViewHierarchyCascade);
    }
    if(document.getElementById("view-roll")) {
        document.getElementById("view-roll").addEventListener("change", function() {
            renderLiveStudentGrades(this.value);
        });
    }

    // Seed curriculum structure into Firebase
    Object.keys(syllabusDataset).forEach(dept => {
        ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6"].forEach(sem => {
            database.ref(`curriculumStructure/${dept}/${sem}/subjects`).set(syllabusDataset[dept]);
        });
    });

    if(document.getElementById('marksForm')) {
        document.getElementById('marksForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const targetRoll = document.getElementById('marks-roll').value;
            if (!targetRoll) {
                alert("Please select a target student profile.");
                return;
            }

            const chosenDept = document.getElementById('marks-dept').value;
            const chosenSem = document.getElementById('marks-semester').value;
            const scoreNum = parseInt(document.getElementById('marks-score').value, 10);
            
            const profileMatch = globalStudentsCacheList.find(s => (s.roll || s.fbKey) === targetRoll);
            const resolvedName = profileMatch ? (profileMatch.fullName || profileMatch.username) : "Student Profile";

            const gradingPayload = {
                department: chosenDept,
                semester: chosenSem,
                studentName: resolvedName,
                subject: document.getElementById('marks-subject').value,
                marksObtained: scoreNum,
                marksMax: 100,
                percentage: scoreNum.toFixed(1),
                instructor: "Root Admin",
                postedOn: new Date().toLocaleString(),
                examination: document.getElementById('marks-type').value,
                date: document.getElementById('marks-date').value
            };

            // Aligned with Teacher Dashboard Core Node Path
            database.ref(`marks/${targetRoll}`).push(gradingPayload)
            .then(() => {
                alert("Academic evaluation score logged successfully!");
                document.getElementById('marksForm').reset();
                document.getElementById('marks-date').valueAsDate = new Date();
                closeGradingModal();
            })
            .catch(err => alert("Write operations rejected: " + err.message));
        });
    }

    // ── Global Noticeboard Form Submission Dispatcher ──
    const noticeForm = document.getElementById("adminNoticeForm");
    if(noticeForm) {
        noticeForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const payload = {
                targetAudience: document.getElementById("notice-target").value,
                title: document.getElementById("notice-title").value,
                content: document.getElementById("notice-body").value,
                publishedBy: "System Administrator",
                timestamp: new Date().toLocaleString()
            };

            database.ref('globalNoticeboard').push(payload)
            .then(() => {
                alert("Notice published successfully!");
                noticeForm.reset();
            })
            .catch(err => alert("Publish error: " + err.message));
        });
    }
});

// ── Data Sync ──────────────────────────────────────────────────
function syncAllStudentsData() {
    database.ref('students').on('value', snapshot => {
        globalStudentsCacheList = [];
        if(snapshot.exists()) {
            snapshot.forEach(child => {
                let data = child.val();
                data.fbKey = child.key;
                data.roll = data.roll || child.key;
                globalStudentsCacheList.push(data);
            });
        }
        renderStudentTable(globalStudentsCacheList);
        renderLoginCredentialsTable(globalStudentsCacheList);
        calculateAndRenderDepartmentCounts(globalStudentsCacheList);
        handleGradingHierarchyCascade();
        handleViewHierarchyCascade();
    });
}

// ── Stats ──────────────────────────────────────────────────────
function calculateAndRenderDepartmentCounts(list) {
    const statsContainer = document.getElementById("department-stats-target");
    if(!statsContainer) return;

    if (list.length === 0) {
        statsContainer.innerHTML = '<p style="color:#999; font-style:italic; padding:10px;">Zero students registered.</p>';
        return;
    }

    let countsMap = {};
    list.forEach(student => {
        let dept = student.department || student.Department || "Unassigned Dept";
        let termText = student.semester || student.year || student.enrolledSem || "Unknown Track";
        let uniqueCombinationKey = `${dept} - ${termText}`;
        countsMap[uniqueCombinationKey] = (countsMap[uniqueCombinationKey] || 0) + 1;
    });

    let html = "";
    Object.keys(countsMap).sort().forEach(combinedKey => {
        html += `
            <div class="stats-badge-item">
                <span class="label"><i class="fas fa-graduation-cap" style="color:#20c997; margin-right:6px;"></i> ${combinedKey}</span>
                <span class="count" style="background-color: #0d6efd;">${countsMap[combinedKey]} Student${countsMap[combinedKey] > 1 ? 's' : ''}</span>
            </div>
        `;
    });
    statsContainer.innerHTML = html;
}

// ── Credentials Table ──────────────────────────────────────────
function renderLoginCredentialsTable(list) {
    const target = document.getElementById("login-credentials-target");
    if(!target) return;
    
    if(list.length === 0) {
        target.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">No registered data available.</td></tr>`;
        return;
    }
    
    let html = "";
    list.forEach(student => {
        html += `
            <tr>
                <td><strong>${student.roll || student.fbKey || '---'}</strong></td>
                <td>${student.fullName || '---'}</td>
                <td><span style="background:#e3fbf5; color:#0f766e; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${student.username || '---'}</span></td>
                <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-weight:700; color:#e11d48;">${student.password || '---'}</code></td>
            </tr>
        `;
    });
    target.innerHTML = html;
}

// ── Semester Term Normalizer (Bridge Between 1st Year & Semester 1) ──
function getNormalizedSemString(rawText) {
    if (!rawText) return "";
    let text = rawText.toString().toLowerCase().trim();
    
    if (text.includes("1st year") || text.includes("sem 1") || text.includes("semester 1") || text.includes("sem 2") || text.includes("semester 2")) return "year1";
    if (text.includes("2nd year") || text.includes("sem 3") || text.includes("semester 3") || text.includes("sem 4") || text.includes("semester 4")) return "year2";
    if (text.includes("3rd year") || text.includes("sem 5") || text.includes("semester 5") || text.includes("sem 6") || text.includes("semester 6")) return "year3";
    if (text.includes("4th year") || text.includes("sem 7") || text.includes("semester 7") || text.includes("sem 8") || text.includes("semester 8")) return "year4";
    return text;
}

// ── Grading Cascades ───────────────────────────────────────────
function handleGradingHierarchyCascade() {
    const selectedDept = document.getElementById("marks-dept").value;
    const selectedSem = document.getElementById("marks-semester").value;
    const studentMenu = document.getElementById("marks-roll");
    
    if(!studentMenu) return;
    studentMenu.innerHTML = '<option value="">-- Select Name --</option>';
    
    globalStudentsCacheList.forEach(student => {
        let sDept = student.department || student.Department || "";
        const checkDept = !selectedDept || sDept.toUpperCase() === selectedDept.toUpperCase();
        
        let checkSemesterMatch = true;
        if(selectedSem) {
            let sSem = student.semester || student.year || student.enrolledSem || "";
            checkSemesterMatch = getNormalizedSemString(sSem) === getNormalizedSemString(selectedSem);
        }
        
        if (checkDept && checkSemesterMatch) {
            let opt = document.createElement("option");
            opt.value = student.roll || student.fbKey;
            opt.textContent = `${student.fullName || student.username || 'Unnamed'} (${student.roll || student.fbKey})`;
            studentMenu.appendChild(opt);
        }
    });
}

// ── Dynamic Subject Loader ──
function updateLinkedSubjectsOptions() {
    const dept = document.getElementById("marks-dept").value;
    const subjectMenu = document.getElementById("marks-subject");
    if(!subjectMenu) return;
    subjectMenu.innerHTML = '<option value="">-- Select Subject Designation --</option>';
    
    const courses = syllabusDataset[dept] || ["Theory Core Component", "Practical Lab Assignment Track"];
    courses.forEach(sub => {
        let opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        subjectMenu.appendChild(opt);
    });
}

// ── Grade View Cascade ─────────────────────────────────────────
function handleViewHierarchyCascade() {
    const selectedDept = document.getElementById("view-dept").value;
    const selectedSem = document.getElementById("view-semester").value;
    const targetMenu = document.getElementById("view-roll");
    
    if(!targetMenu) return;
    targetMenu.innerHTML = '<option value="">-- Choose Student Name --</option>';
    
    globalStudentsCacheList.forEach(student => {
        let sDept = student.department || student.Department || "";
        const checkDept = !selectedDept || sDept.toUpperCase() === selectedDept.toUpperCase();
        
        let checkYear = true;
        if(selectedSem) {
            let sSem = student.semester || student.year || student.enrolledSem || "";
            checkYear = getNormalizedSemString(sSem) === getNormalizedSemString(selectedSem);
        }
        
        if (checkDept && checkYear) {
            let opt = document.createElement("option");
            opt.value = student.roll || student.fbKey;
            opt.textContent = `${student.fullName || student.username || 'Unnamed'} (${student.roll || student.fbKey})`;
            targetMenu.appendChild(opt);
        }
    });
}

function renderLiveStudentGrades(rollNumber) {
    const targetDiv = document.getElementById("overall-grades-view-target");
    if (!targetDiv) return;
    if (!rollNumber) {
        targetDiv.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">Select parameters to fetch student transcript updates.</p>';
        return;
    }
    
    targetDiv.innerHTML = `<p style="text-align: center; color: #0d6efd;"><i class="fas fa-spinner fa-spin"></i> Loading recorded mark matrices...</p>`;
    
    database.ref(`marks/${rollNumber}`).once('value', snapshot => {
        let itemsHtml = "";
        let entriesFound = false;
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const data = child.val();
                entriesFound = true;
                
                let resolvedSubject = data.subject || data.Subject || "Unknown Course Module";
                let resolvedExamType = data.examination || data.examType || "Assessment Component";
                let scoreSecured = data.marksObtained !== undefined ? data.marksObtained : (data.obtained !== undefined ? data.obtained : "--");
                let scoreMax = data.marksMax || data.max || 100;
                let calculatedPct = data.percentage || (scoreSecured !== "--" ? ((parseFloat(scoreSecured)/parseFloat(scoreMax))*100).toFixed(1) : "0");

                itemsHtml += `
                    <div class="data-item" style="background: #f8f9fa; border-left: 4px solid #198754; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                        <h3 style="margin: 0 0 5px 0; font-size: 15px;">${resolvedSubject} <span style="font-size: 11px; padding: 2px 6px; background:#e2e8f0; color:#475569; border-radius:4px; margin-left: 8px;">${resolvedExamType}</span></h3>
                        <p style="margin: 2px 0; font-size: 13px; color:#555;">Term Level: <strong>${data.semester || 'Unspecified'} (${data.department || 'General'})</strong></p>
                        <p style="margin: 2px 0; font-size: 13px; color:#555;">Evaluation Score: <strong style="color: #198754;">${scoreSecured} / ${scoreMax} (${calculatedPct}%)</strong></p>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: #888; border-top: 1px dashed #ddd; padding-top: 4px;">Logged By: ${data.instructor || data.evaluatedBy || 'Faculty Office'} | Date: ${data.date || data.dateTested || 'N/A'}</p>
                    </div>
                `;
            });
        }
        targetDiv.innerHTML = entriesFound ? itemsHtml : `<p style="text-align: center; color: #dc3545; font-weight: 600; padding: 15px;"><i class="fas fa-exclamation-circle"></i> No academic evaluations found matching this student profile path.</p>`;
    });
}

// ── Student Table ──────────────────────────────────────────────
function renderStudentTable(list) {
    const target = document.getElementById("student-records-target");
    if(!target) return;
    if(list.length === 0) {
        target.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#333;">No records found matching current search definitions.</td></tr>`;
        return;
    }

    let html = "";
    list.forEach(s => {
        let currentDept = s.department || s.Department || '---';
        let currentSem = s.semester || s.year || s.enrolledSem || '---';
        let studentRollKey = s.roll || s.fbKey;
        
        // Fee Tracking Config Badges
        let isPaid = s.semesterFeePaid === true || s.semesterFeePaid === "Paid";
        let feeBadgeText = isPaid ? "Paid" : "Unpaid";
        let feeBadgeBg = isPaid ? "#10b981" : "#dc3545";

        html += `
            <tr>
                <td><strong>${studentRollKey}</strong></td>
                <td>${s.fullName || '---'}</td>
                <td><span style="background:#e7f1ff; color:#0d6efd; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${currentDept}</span></td>
                <td>${currentSem}</td>
                <td><strong>${s.cgpa || '0.00'}</strong></td>
                <td>
                    <button onclick="toggleSemesterFeeStatus('${studentRollKey}', ${isPaid})" style="background:${feeBadgeBg}; color:white; border:none; padding:4px 10px; border-radius:4px; font-weight:700; font-size:11px; cursor:pointer;">
                         ${feeBadgeText}
                    </button>
                </td>
                <td>
                    <button class="action-btn" style="background-color: #198754; color: white; border: none; padding: 6px 12px; border-radius: 4px; margin-right: 5px; cursor: pointer; font-weight: 600;" onclick="shortcutViewStudentMarks('${studentRollKey}', '${currentDept}', '${currentSem}')">
                        <i class="fas fa-eye"></i> Marks
                    </button>
                    <button class="action-btn" onclick="eraseStudent('${s.fbKey}')"><i class="fas fa-trash"></i> Drop</button>
                </td>
            </tr>
        `;
    });
    target.innerHTML = html;
}

// ── Semester Fee Status Toggle Switch ──
function toggleSemesterFeeStatus(rollNumber, currentStatus) {
    const nextStatusSetting = !currentStatus;
    database.ref(`students/${rollNumber}`).update({
        semesterFeePaid: nextStatusSetting
    })
    .catch(err => alert("Error updating fee status: " + err.message));
}

// ── Absence Leave Application Desk Pipeline Sync ──
function syncLeaveApplicationsDesk() {
    database.ref('leaveApplications').on('value', snapshot => {
        const target = document.getElementById("admin-leave-queue-target");
        if(!target) return;
        let html = "";
        let entriesFound = false;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const key = child.key;
                const app = child.val();
                entriesFound = true;

                let isPending = app.status === "Pending Approval";
                let actionControls = isPending ? `
                    <div style="margin-top:10px; display:flex; gap:8px;">
                        <button onclick="resolveLeaveRequest('${key}', 'Approved / Excused')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:600; font-size:12px; cursor:pointer;">Accept</button>
                        <button onclick="resolveLeaveRequest('${key}', 'Rejected / Denied')" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:600; font-size:12px; cursor:pointer;">Reject</button>
                    </div>
                ` : `<p style="margin-top:8px; font-size:12px; color:#64748b;">Resolution Status: <strong>${app.status}</strong></p>`;

                html += `
                    <div class="data-item" style="background:#f8fafc; border-left:4px solid #fd7e14; padding:15px; margin-bottom:12px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="margin:0; font-size:15px;">${app.studentName} (${app.studentRoll})</h3>
                        <p style="margin:5px 0; font-size:13px; color:#334155;"><strong>Reason:</strong> ${app.reason}</p>
                        <p style="margin:2px 0; font-size:12px; color:#64748b;">Window Vectors: ${app.startDate} to ${app.endDate}</p>
                        ${actionControls}
                    </div>
                `;
            });
        }
        target.innerHTML = entriesFound ? html : `<p style="color:#94a3b8; font-style:italic; text-align:center; padding:20px;">No leave requests currently active inside this queue stack.</p>`;
    });
}

function resolveLeaveRequest(fbKey, decisionString) {
    database.ref(`leaveApplications/${fbKey}`).update({
        status: decisionString
    })
    .catch(err => alert("Operation rejected: " + err.message));
}

// ── Shortcut Interceptor Link ───────────────────────────────────
function shortcutViewStudentMarks(roll, dept, sem) {
    openOverallGradeModal();
    if(document.getElementById("view-dept")) {
        document.getElementById("view-dept").value = dept;
        handleViewHierarchyCascade();
    }
    
    const targetMenu = document.getElementById("view-roll");
    if(targetMenu) {
        targetMenu.value = roll;
    }
    
    renderLiveStudentGrades(roll);
}

function filterStudentTable() {
    let queryRoll = document.getElementById("search-roll").value.trim().toLowerCase();
    let queryDept = document.getElementById("search-dept").value;
    let queryYear = document.getElementById("search-year").value.toLowerCase().replace("semester", "").trim();

    let filtered = globalStudentsCacheList.filter(student => {
        let currentRoll = (student.roll || student.fbKey || "").toLowerCase();
        let currentDept = student.department || student.Department || "";
        let currentYear = (student.year || student.semester || student.enrolledSem || "").toLowerCase();

        let matchRoll = queryRoll === "" || currentRoll.includes(queryRoll);
        let matchDept = queryDept === "" || currentDept === queryDept;
        let matchYear = queryYear === "" || currentYear.includes(queryYear);

        return matchRoll && matchDept && matchYear;
    });
    renderStudentTable(filtered);
}

function resetSearchFilters() {
    document.getElementById("search-roll").value = "";
    document.getElementById("search-dept").value = "";
    document.getElementById("search-year").value = "";
    renderStudentTable(globalStudentsCacheList);
}

function eraseStudent(roll) {
    if(confirm(`Are you certain you want to purge student roll identifier [ ${roll} ] completely from the root tracking architecture?`)) {
        database.ref('students/' + roll).remove()
        .then(() => alert("Student profile unlinked successfully."))
        .catch(err => alert("Error unlinking record: " + err.message));
    }
}

// ── Modal Controls ─────────────────────────────────────────────
function openGradingModal() { document.getElementById("gradingModal").style.display = "flex"; }
function closeGradingModal() { document.getElementById("gradingModal").style.display = "none"; }

function openOverallGradeModal() { document.getElementById("overallGradeModal").style.display = "flex"; }
function closeOverallGradeModal() { document.getElementById("overallGradeModal").style.display = "none"; }

function openLoginInfoModal() { document.getElementById("loginInfoModal").style.display = "flex"; }
function closeLoginInfoModal() { document.getElementById("loginInfoModal").style.display = "none"; }

function openMatrixModal(dept) {
    document.getElementById("matrixModalTitle").innerText = `${dept} Academic Syllabus Modules`;
    const container = document.getElementById("matrixModalBody");
    container.innerHTML = "";
    
    const courses = syllabusDataset[dept] || ["General Syllabus Parameters Not Formally Mapped"];
    courses.forEach(course => {
        const span = document.createElement("span");
        span.className = "subject-pill";
        span.innerText = course;
        container.appendChild(span);
    });
    document.getElementById("matrixModal").style.display = "flex";
}
function closeMatrixModal() { document.getElementById("matrixModal").style.display = "none"; }

function closeModalOnOverlay(event, element) {
    if (event.target === element) {
        element.style.display = "none";
    }
}

// ── Logout ─────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('adminSessionActive');
    window.location.href = "./index.html";
}