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

let currentStudentRoll = localStorage.getItem('currentStudentRoll')
    || localStorage.getItem('studentRollNumber')
    || localStorage.getItem('studentRoll')
    || "";
let studentDept = "";
let studentYear = "";

// ── Session Guard & Profile Load ───────────────────────────────
window.onload = function() {
    if (!currentStudentRoll || currentStudentRoll.trim() === "") {
        alert("Session verification failure! Booting to primary portal.");
        window.location.href = "./index.html";
        return;
    }

    currentStudentRoll = currentStudentRoll.trim();

    // Core Profile Sync
    database.ref('students/' + currentStudentRoll).on('value', snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            studentDept = data.department || "";
            studentYear = data.year || "";

            // Dashboard header & cards
            document.getElementById("welcomeMessage").innerText = `Welcome Back, ${data.fullName || 'Student'}`;
            document.getElementById("card-name").innerText = data.fullName || "--";
            document.getElementById("card-roll").innerText = currentStudentRoll;
            document.getElementById("card-dept").innerText = studentDept || "--";
            document.getElementById("card-year").innerText = studentYear || "--";
            document.getElementById("card-cgpa").innerText = data.cgpa || "0.00";

            // Dossier modal
            document.getElementById("dossier-target").innerHTML = `
                <div class="data-item"><h3>Full Identification Name</h3><p>${data.fullName || '--'}</p></div>
                <div class="data-item"><h3>Paternal Care Designation</h3><p>${data.fatherName || '--'}</p></div>
                <div class="data-item"><h3>Registered Profile Age</h3><p>${data.age || '--'} Years Old</p></div>
                <div class="data-item"><h3>Academic Track Department</h3><p>${studentDept || '--'}</p></div>
                <div class="data-item"><h3>Assigned Classification Term</h3><p>${studentYear || '--'}</p></div>
                <div class="data-item"><h3>Calculated Grade CGPA Matrix</h3><p>${data.cgpa || '0.00'}</p></div>
                <div class="data-item"><h3>Mobile Connection Endpoint</h3><p>${data.mobile || '--'}</p></div>
                <div class="data-item"><h3>Gender Identity Structure</h3><p>${data.gender || '--'}</p></div>
                <div class="data-item"><h3>Social Marital Classification</h3><p>${data.maritalStatus || '--'}</p></div>
            `;

            // Pre-fill edit form
            document.getElementById("edit-password").value   = data.password || "";
            document.getElementById("edit-fullName").value   = data.fullName || "";
            document.getElementById("edit-fatherName").value = data.fatherName || "";
            document.getElementById("edit-age").value        = data.age || "";
            document.getElementById("edit-department").value = studentDept;
            document.getElementById("edit-year").value       = studentYear;
            document.getElementById("edit-cgpa").value       = data.cgpa || "";
            document.getElementById("edit-mobile").value     = data.mobile || "";

            fetchAcademicRecords();
        } else {
            alert("Roll reference data not discovered inside active node channels!");
            logout();
        }
    });

    // ── Live SOS Intercept ─────────────────────────────────────
    database.ref('globalNoticeboard').on('child_added', snapshot => {
        const notice   = snapshot.val();
        const noticeId = snapshot.key;

        if (notice.targetAudience === "All" || (studentDept && notice.targetAudience.toUpperCase() === studentDept.toUpperCase())) {
            if (sessionStorage.getItem(`dismissed_sos_${noticeId}`) !== 'true') {
                document.getElementById("sos-title").innerText     = notice.title;
                document.getElementById("sos-body").innerText      = notice.content;
                document.getElementById("sos-timestamp").innerText = `Published: ${notice.timestamp}`;

                const modal = document.getElementById("sosNoticeModal");
                modal.dataset.activeNoticeId = noticeId;
                modal.style.display = "flex";
            }
        }
    });
};

// ── SOS Dismiss ────────────────────────────────────────────────
function acknowledgeSosNotice() {
    const modal    = document.getElementById("sosNoticeModal");
    const activeId = modal.dataset.activeNoticeId;
    if (activeId) sessionStorage.setItem(`dismissed_sos_${activeId}`, 'true');
    modal.style.display = "none";
}

// ── Semester / Year Matching ───────────────────────────────────
function checkAcademicMatch(savedSemester) {
    if (!savedSemester || !studentYear) return false;
    const semStr = savedSemester.toLowerCase();
    const yrStr  = studentYear.toLowerCase();

    if (yrStr.includes("1st year") && (semStr.includes("1st semester") || semStr.includes("2nd semester") || semStr.includes("semester 1") || semStr.includes("semester 2"))) return true;
    if (yrStr.includes("2nd year") && (semStr.includes("3rd semester") || semStr.includes("4th semester") || semStr.includes("semester 3") || semStr.includes("semester 4"))) return true;
    if (yrStr.includes("3rd year") && (semStr.includes("5th semester") || semStr.includes("6th semester") || semStr.includes("semester 5") || semStr.includes("semester 6"))) return true;

    return semStr.includes(yrStr) || yrStr.includes(semStr);
}

// ── Academic Records Fetcher ───────────────────────────────────
function fetchAcademicRecords() {
    // 1. Marks
    database.ref('students/' + currentStudentRoll + '/academicRecords/marks').on('value', snapshot => {
        const target = document.getElementById("marks-target-container");
        if (snapshot.exists()) {
            let html = "";
            snapshot.forEach(child => {
                const m        = child.val();
                const secured  = m.marksObtained !== undefined ? m.marksObtained : m.obtained;
                const outOf    = m.marksMax      !== undefined ? m.marksMax      : m.max;
                const examLabel = m.examination || m.examType || "Assessment Component";
                const pct      = (parseFloat(secured) / parseFloat(outOf) * 100).toFixed(1);
                html += `
                    <div class="data-item">
                        <h3>${m.subject} — <span style="color:var(--primary-blue);">${examLabel}</span></h3>
                        <p><strong>Score Secured:</strong> ${secured} / ${outOf} (${pct}%)</p>
                        <span class="meta-span"><i class="far fa-user"></i> Evaluator: ${m.instructor || m.evaluatedBy || 'Faculty'} | <i class="far fa-calendar-alt"></i> Date: ${m.date || m.dateTested || '--'}</span>
                    </div>`;
            });
            target.innerHTML = html;
        } else {
            target.innerHTML = `<p style="color:#aaa; font-style:italic; text-align:center; padding:20px;">No evaluation test metrics found.</p>`;
        }
    });

    // 2. Remarks
    database.ref('students/' + currentStudentRoll + '/academicRecords/remarks').on('value', snapshot => {
        const target = document.getElementById("remarks-target-container");
        if (snapshot.exists()) {
            let html = "";
            snapshot.forEach(child => {
                const r     = child.val();
                const color = r.severity === 'Critical' ? '#dc3545' : 'var(--primary-blue)';
                html += `
                    <div class="data-item" style="border-left-color: ${color};">
                        <h3 style="color:${color};"><i class="fas fa-exclamation-circle"></i> ${r.tag || r.title}</h3>
                        <p>${r.comment || r.content}</p>
                        <span class="meta-span"><i class="far fa-user"></i> Logged By: ${r.instructor || 'Faculty Member'}</span>
                    </div>`;
            });
            target.innerHTML = html;
        } else {
            target.innerHTML = `<p style="color:#aaa; font-style:italic; text-align:center; padding:20px;">Your behavioral file is currently completely clear.</p>`;
        }
    });

    // 3. Homework
    database.ref('curriculumStructure').on('value', snapshot => {
        const target = document.getElementById("homework-target-container");
        let html  = "";
        let count = 0;

        if (snapshot.exists()) {
            snapshot.forEach(deptNode => {
                if (deptNode.key.toUpperCase() !== studentDept.toUpperCase()) return;
                deptNode.forEach(semNode => {
                    if (!checkAcademicMatch(semNode.key)) return;
                    const hwNode = semNode.child('homework');
                    hwNode.forEach(child => {
                        const h = child.val();
                        count++;
                        html += `
                            <div class="data-item">
                                <h3>Course Module: ${h.subject || semNode.key}</h3>
                                <p><strong>Challenge Details:</strong> ${h.content}</p>
                                <p style="font-size:13px; margin-top:5px; color:#c0392b;"><strong><i class="far fa-clock"></i> Deadline:</strong> ${h.deadline || 'N/A'}</p>
                                <span class="meta-span"><i class="far fa-user"></i> Instructor: ${h.instructor || 'Instructor'}</span>
                            </div>`;
                    });
                });
            });
        }
        target.innerHTML = count > 0 ? html : `<p style="color:#aaa; font-style:italic; text-align:center; padding:20px;">No active homework tasks listed.</p>`;
    });

    // 4. Assignments
    database.ref('curriculumStructure').on('value', snapshot => {
        const target = document.getElementById("assignments-target-container");
        let html  = "";
        let count = 0;

        if (snapshot.exists()) {
            snapshot.forEach(deptNode => {
                if (deptNode.key.toUpperCase() !== studentDept.toUpperCase()) return;
                deptNode.forEach(semNode => {
                    if (!checkAcademicMatch(semNode.key)) return;
                    const assignNode = semNode.child('assignments');
                    assignNode.forEach(child => {
                        const a = child.val();
                        count++;
                        html += `
                            <div class="data-item">
                                <h3>Project Code: <span style="color:var(--primary-blue);">${child.key || '---'}</span></h3>
                                <p><strong>Deliverables:</strong> ${a.details || a.content}</p>
                                <p style="font-size:13px; margin-top:4px;"><strong>Weightage:</strong> ${a.weightage || '0'} Points</p>
                                <span class="meta-span"><i class="far fa-user"></i> Coordinator: ${a.instructor || 'Academic Office'}</span>
                            </div>`;
                    });
                });
            });
        }
        target.innerHTML = count > 0 ? html : `<p style="color:#aaa; font-style:italic; text-align:center; padding:20px;">No active project modules deployed.</p>`;
    });

    // 5. Leave Applications
    database.ref('leaveApplications').on('value', snapshot => {
        const target = document.getElementById("leave-history-target");
        let html         = "";
        let entriesFound = false;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const app = child.val();
                if (app.studentRoll === currentStudentRoll) {
                    entriesFound = true;
                    let statusColor = "#ef4444";
                    if (app.status === "Pending Approval")  statusColor = "#f59e0b";
                    if (app.status === "Approved / Excused") statusColor = "#10b981";

                    html += `
                        <div class="data-item" style="background:#fff; border-left:4px solid ${statusColor};">
                            <h4 style="margin:0 0 4px 0; font-size:14px;">Reason: ${app.reason}</h4>
                            <p style="margin:2px 0; font-size:12px; color:var(--text-muted);">Duration Vector: <strong>${app.startDate}</strong> to <strong>${app.endDate}</strong></p>
                            <p style="margin:6px 0 0 0; font-size:12px;">Status Guard: <span style="color:${statusColor}; font-weight:700;">${app.status}</span></p>
                        </div>`;
                }
            });
        }
        target.innerHTML = entriesFound
            ? html
            : `<p style="color:#aaa; font-style:italic; text-align:center; padding:15px;">No leave logs submitted during this curriculum track.</p>`;
    });
}

// ── Edit Profile Form ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("editForm").addEventListener("submit", e => {
        e.preventDefault();
        const updatedFields = {
            password:   document.getElementById("edit-password").value,
            fullName:   document.getElementById("edit-fullName").value,
            fatherName: document.getElementById("edit-fatherName").value,
            age:        document.getElementById("edit-age").value,
            mobile:     document.getElementById("edit-mobile").value
        };

        database.ref('students/' + currentStudentRoll).update(updatedFields)
        .then(() => {
            alert("Account settings records successfully synchronized!");
            closeModal('modal-info-changes');
        })
        .catch(err => alert("Cloud transactional save fault: " + err.message));
    });

    // ── Leave Request Form ─────────────────────────────────────
    document.getElementById("leaveApplicationForm").addEventListener("submit", function(e) {
        e.preventDefault();
        if (!currentStudentRoll) return;

        const payload = {
            studentRoll: currentStudentRoll,
            studentName: document.getElementById("card-name").innerText,
            department:  document.getElementById("card-dept").innerText,
            reason:      document.getElementById("leave-reason").value.trim(),
            startDate:   document.getElementById("leave-start").value,
            endDate:     document.getElementById("leave-end").value,
            status:      "Pending Approval",
            submittedOn: new Date().toLocaleString()
        };

        database.ref('leaveApplications').push(payload)
        .then(() => {
            alert("Absence request submitted successfully to the Admin Portal review desk!");
            document.getElementById("leaveApplicationForm").reset();
        })
        .catch(err => alert("Transmission failed: " + err.message));
    });
});

// ── Modal Helpers ──────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
function closeModalOnOverlay(e, element) { if (e.target === element) element.style.display = "none"; }

// ── Logout ─────────────────────────────────────────────────────
function logout() {
    localStorage.clear();
    window.location.href = "./index.html";
}
