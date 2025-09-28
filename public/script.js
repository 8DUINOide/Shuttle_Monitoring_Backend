const SERVER_URL = "http://localhost:8080"; // Change to "http://152.42.192.226:8080" for server testing

let token = null;
let currentUser = null;
let currentUserId = null;
let studentCounter = 1;
let driverCounter = 1;

// Function to sanitize input to prevent XSS
function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/&amp;/g, '&amp;');
}

// Check for stored token on page load
document.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');
    const storedUserId = localStorage.getItem('currentUserId');

    if (storedToken && storedUser && storedUserId) {
        token = storedToken;
        currentUser = JSON.parse(storedUser);
        currentUserId = storedUserId;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("dashboard").style.display = "flex";
        updateDashboard();
        showProfile();
    }
});

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    // Determine toast color based on message content
    const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("failed");
    toast.style.backgroundColor = isError ? "red" : "green";

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("fadeInOut");
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }, 100);
}

// =================== AUTH ===================
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorElement = document.getElementById("login-error");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const response = await fetch(`${SERVER_URL}/api/auth/sign-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usernameOrEmail: username, password })
        });

        const data = await response.json();
        if (response.ok && data.access_token) {
            if (username.toLowerCase() === "admin") {
                token = data.access_token;
                currentUser = {
                    username,
                    email: data.email || "admin@gmail.com",
                    userId: data.user_id
                };
                currentUserId = data.user_id;
                // Store in localStorage
                localStorage.setItem('authToken', token);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                localStorage.setItem('currentUserId', currentUserId);
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("dashboard").style.display = "flex";
                updateDashboard();
                loadProfilePicture();
            } else {
                errorElement.textContent = "Access denied. Only the admin can log in.";
                errorElement.style.display = "block";
            }
        } else {
            errorElement.textContent = data.error || "Login failed. Please check your credentials.";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Network error: " + error.message;
        errorElement.style.display = "block";
    }
}

function logout() {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserId');
    token = null;
    currentUser = null;
    currentUserId = null;
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
}

function showLogoutConfirmModal() {
    document.getElementById("logoutConfirmModal").style.display = "flex";
}

function confirmLogout() {
    document.getElementById("logoutConfirmModal").style.display = "none";
    logout();
}

function cancelLogout() {
    document.getElementById("logoutConfirmModal").style.display = "none";
}

//=================== UI CONTROL ===================
function showTab(tabId) {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => tab.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    if (tabId === 'profile' && currentUser) {
        showProfile();
        document.getElementById('admin-reset-password-form').reset();
        document.getElementById('admin-reset-error').style.display = 'none';
    }
    if (tabId === 'home') {
        updateDashboard();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content");
    sidebar.classList.toggle("active");
    content.classList.toggle("content-shift");
}

// =================== PROFILE ===================
function showProfile() {
    if (document.getElementById('profile').classList.contains('active') && currentUser) {
        document.getElementById('admin-username').textContent = currentUser.username || 'N/A';
        document.getElementById('admin-email').textContent = currentUser.email || 'N/A';
        document.getElementById('sidebar-username').textContent = currentUser.username || 'N/A';
        document.getElementById('sidebar-email').textContent = currentUser.email || 'N/A';
        loadProfilePicture();
    } else if (currentUser) {
        // Update sidebar even if profile tab is not active
        document.getElementById('sidebar-username').textContent = currentUser.username || 'N/A';
        document.getElementById('sidebar-email').textContent = currentUser.email || 'N/A';
        loadProfilePicture();
    }
}

async function loadProfilePicture() {
    if (!currentUserId || !token) return;

    try {
        const response = await fetch(`${SERVER_URL}/api/users/${currentUserId}/profile-picture`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            // Update both profile tab and sidebar images
            document.getElementById("admin-profile-picture").src = url;
            document.getElementById("sidebar-profile-picture").src = url;
        } else {
            document.getElementById("admin-profile-picture").src = "images/default-profile.png";
            document.getElementById("sidebar-profile-picture").src = "images/default-profile.png";
        }
    } catch (error) {
        console.error("Error loading profile picture:", error);
        document.getElementById("admin-profile-picture").src = "images/default-profile.png";
        document.getElementById("sidebar-profile-picture").src = "images/default-profile.png";
    }
}

async function uploadProfilePicture() {
    const fileInput = document.getElementById("profile-picture-input");
    const errorElement = document.getElementById("profile-picture-error");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    if (!fileInput.files[0]) {
        errorElement.textContent = "Please select an image file";
        errorElement.style.display = "block";
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const response = await fetch(`${SERVER_URL}/api/users/${currentUserId}/profile-picture`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            showToast(data.message || "Profile picture uploaded successfully");
            await loadProfilePicture();
            fileInput.value = "";
        } else {
            errorElement.textContent = data.error || "Failed to upload profile picture";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Network error: " + error.message;
        errorElement.style.display = "block";
    }
}

document.getElementById("admin-reset-password-form").addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('.profile-button');
    const errorElement = document.getElementById('admin-reset-error');
    errorElement.style.display = 'none';
    errorElement.textContent = '';
    submitButton.disabled = true;

    const email = document.getElementById('admin-email').textContent;
    const currentPassword = document.getElementById('admin-current-password').value;
    const newPassword = document.getElementById('admin-new-password').value;
    const confirmPassword = document.getElementById('admin-confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        errorElement.textContent = 'All fields are required';
        errorElement.style.display = 'block';
        submitButton.disabled = false;
        return;
    }

    if (newPassword !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        errorElement.style.display = 'block';
        submitButton.disabled = false;
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/forgotPassword/reset-password?email=${encodeURIComponent(email)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                repeatPassword: confirmPassword
            })
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || 'Password reset successfully');
            e.target.reset();
        } else {
            errorElement.textContent = result.error || 'Failed to reset password';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        errorElement.textContent = 'Network error: ' + error.message;
        errorElement.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});

document.getElementById("profile-picture-input").addEventListener("change", uploadProfilePicture);

// =================== DASHBOARD UPDATE ===================
function relativeTime(timestamp) {
    const date = new Date(timestamp.replace(' ', 'T') + 'Z');
    const now = new Date('2025-09-22T12:24:00-07:00'); // Current time: 12:24 PM PST
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHr < 24) return `${diffHr} hours ago`;
    return `${diffDay} days ago`;
}

async function updateDashboard() {
    if (!token) return;

    // Populate Today's Routes from Shuttles tab
    const shuttleRows = document.querySelectorAll('#shuttles-table tr');
    let activeShuttles = 0;
    let routes = new Set();
    const todaysTbody = document.querySelector('#todays-routes-table tbody');
    todaysTbody.innerHTML = '';
    shuttleRows.forEach(row => {
        const statusText = row.querySelector('td:nth-child(4) span')?.textContent || '';
        const statusClass = row.querySelector('td:nth-child(4) span')?.className || '';
        const route = row.querySelector('td:nth-child(3)')?.textContent || '';
        const shuttle = row.querySelector('td:nth-child(1)')?.textContent || '';
        const driver = row.querySelector('td:nth-child(2)')?.textContent || '';
        const occupancy = row.querySelector('td:nth-child(5)')?.textContent || '';
        const capacity = occupancy.split('/')[1] || '';
        routes.add(route);
        if (statusText === 'On Time' || statusText === 'Delayed') {
            activeShuttles++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${sanitizeHTML(route)}</td>
                <td>${sanitizeHTML(shuttle)}</td>
                <td>${sanitizeHTML(driver)}</td>
                <td>${sanitizeHTML(capacity)}</td>
                <td><span class="${statusClass}">${sanitizeHTML(statusText)}</span></td>
            `;
            todaysTbody.appendChild(tr);
        }
    });
    const activeRoutes = routes.size;

    // Populate Students Checked In from Students tab
    const studentRows = document.querySelectorAll('#students-table tr');
    let checkedInStudents = 0;
    studentRows.forEach(row => {
        const status = row.querySelector('td:nth-child(5) span')?.textContent || '';
        if (status === 'Checked in') checkedInStudents++;
    });

// Populate Recent Activity from Notifications tab
const notifRows = document.querySelectorAll('#notifications-table tr');
const activityList = document.getElementById('recent-activity-list');
activityList.innerHTML = '';
notifRows.forEach(row => {
    const msg = row.querySelector('td:nth-child(1)')?.textContent || '';
    const ts = row.querySelector('td:nth-child(2)')?.textContent || '';
    const rel = relativeTime(ts);
    const li = document.createElement('li');
    li.innerHTML = `
        <div>${sanitizeHTML(msg)}</div>
        <div class="activity-subtitle">${sanitizeHTML(rel)}</div>
    `;
    activityList.appendChild(li);
});

    // Calculate On Time Performance
    let delayed = 0;
    shuttleRows.forEach(row => {
        const statusText = row.querySelector('td:nth-child(4) span')?.textContent || '';
        if (statusText === 'Delayed') delayed++;
    });
    const onTimePerf = activeRoutes > 0 ? Math.round((activeRoutes - delayed) / activeRoutes * 100) : 0;

    // Update Balance Cards
    const balanceCards = document.querySelectorAll(".balance-card h1");
    balanceCards[0].textContent = activeShuttles;
    balanceCards[1].textContent = checkedInStudents;
    balanceCards[2].textContent = `${onTimePerf}%`;
    balanceCards[3].textContent = activeRoutes;

    showProfile();
}

// =================== FILTER FUNCTIONS (CLIENT-SIDE FOR STATIC DATA) ===================
function filterShuttles() {
    const searchValue = document.getElementById("searchShuttles").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value.toLowerCase();
    const rows = document.querySelectorAll("#shuttles-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const shuttle = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const driver = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
        const route = row.querySelector("td:nth-child(3)")?.textContent.toLowerCase() || "";
        const status = row.querySelector("td:nth-child(4) span")?.textContent.toLowerCase() || "";

        const matchesSearch = shuttle.includes(searchValue) || driver.includes(searchValue) || route.includes(searchValue);
        const matchesStatus = statusFilter === "all" || status === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-shuttles-message").style.display = visibleCount === 0 ? "block" : "none";
}

function filterStudents() {
    const searchValue = document.getElementById("searchStudents").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value.toLowerCase();
    const rows = document.querySelectorAll("#students-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const student = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const parent = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
        const shuttle = row.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || "";
        const status = row.querySelector("td:nth-child(5) span")?.textContent.toLowerCase() || "";

        const matchesSearch = student.includes(searchValue) || parent.includes(searchValue) || shuttle.includes(searchValue);
        const matchesStatus = statusFilter === "all" || status === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-students-message").style.display = visibleCount === 0 ? "block" : "none";
}

function filterNotifications() {
    const searchValue = document.getElementById("searchNotifications").value.toLowerCase();
    const statusFilter = document.getElementById("notificationStatusFilter").value.toLowerCase();
    const rows = document.querySelectorAll("#notifications-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const message = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const status = row.querySelector("td:nth-child(3) span")?.textContent.toLowerCase() || "";

        const matchesSearch = message.includes(searchValue);
        const matchesStatus = statusFilter === "all" || status === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-notifications-message").style.display = visibleCount === 0 ? "block" : "none";
}

function markAllAsRead() {
    const statuses = document.querySelectorAll("#notifications-table .status-badge");
    statuses.forEach(status => {
        status.textContent = "Read";
        status.classList.remove("badge-unread");
        status.classList.add("badge-read");
    });
    showToast("All notifications marked as read");
    updateDashboard(); // Update recent activity after change
}

function clearAllNotifications() {
    const tbody = document.getElementById("notifications-table");
    tbody.innerHTML = "";
    document.getElementById("no-notifications-message").style.display = "block";
    showToast("All notifications cleared");
    updateDashboard(); // Update recent activity after change
}

// =================== ADD PARENT & STUDENTS MODAL ===================
function showAddParentModal() {
    document.getElementById('addParentModal').style.display = 'flex';
    resetParentForm();
}

function closeAddParentModal() {
    document.getElementById('addParentModal').style.display = 'none';
    resetParentForm();
}

function resetParentForm() {
    document.getElementById('addParentForm').reset();
    document.getElementById('add-parent-error').style.display = 'none';

    // Reset students container to show only one student
    const container = document.getElementById('students-container');
    container.innerHTML = `
        <div class="student-form" data-student="1">
            <div class="student-header">
                <h5>Student 1</h5>
                <button type="button" class="remove-student-btn" onclick="removeStudentForm(1)" style="display: none;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="student-1-username">Username *</label>
                    <input type="text" id="student-1-username" required>
                </div>
                <div class="form-group">
                    <label for="student-1-email">Email *</label>
                    <input type="email" id="student-1-email" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group password-wrapper">
                    <label for="student-1-password">Password *</label>
                    <input type="password" id="student-1-password" required>
                    <span class="toggle-password" onclick="togglePassword('student-1-password', this)">
                        <i class="fa-solid fa-eye-slash"></i>
                    </span>
                </div>
                <div class="form-group">
                    <label for="student-1-fullname">Full Name *</label>
                    <input type="text" id="student-1-fullname" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="student-1-address">Current Address *</label>
                    <input type="text" id="student-1-address" required>
                </div>
                <div class="form-group">
                    <label for="student-1-grade">Grade *</label>
                    <select id="student-1-grade" required>
                        <option value="">Select Grade</option>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="student-1-section">Section *</label>
                    <input type="text" id="student-1-section" placeholder="e.g., Section A" required>
                </div>
            </div>
        </div>
    `;
    studentCounter = 1;
}

function addStudentForm() {
    studentCounter++;
    const container = document.getElementById('students-container');
    const studentForm = document.createElement('div');
    studentForm.className = 'student-form';
    studentForm.setAttribute('data-student', studentCounter);

    studentForm.innerHTML = `
        <div class="student-header">
            <h5>Student ${studentCounter}</h5>
            <button type="button" class="remove-student-btn" onclick="removeStudentForm(${studentCounter})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="student-${studentCounter}-username">Username *</label>
                <input type="text" id="student-${studentCounter}-username" required>
            </div>
            <div class="form-group">
                <label for="student-${studentCounter}-email">Email *</label>
                <input type="email" id="student-${studentCounter}-email" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group password-wrapper">
                <label for="student-${studentCounter}-password">Password *</label>
                <input type="password" id="student-${studentCounter}-password" required>
                <span class="toggle-password" onclick="togglePassword('student-${studentCounter}-password', this)">
                    <i class="fa-solid fa-eye-slash"></i>
                </span>
            </div>
            <div class="form-group">
                <label for="student-${studentCounter}-fullname">Full Name *</label>
                <input type="text" id="student-${studentCounter}-fullname" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="student-${studentCounter}-address">Current Address *</label>
                <input type="text" id="student-${studentCounter}-address" required>
            </div>
            <div class="form-group">
                <label for="student-${studentCounter}-grade">Grade *</label>
                <select id="student-${studentCounter}-grade" required>
                    <option value="">Select Grade</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="student-${studentCounter}-section">Section *</label>
                <input type="text" id="student-${studentCounter}-section" placeholder="e.g., Section A" required>
            </div>
        </div>
    `;

    container.appendChild(studentForm);

    // Show remove buttons for all students except the first one
    updateStudentRemoveButtons();
}

function removeStudentForm(studentId) {
    const studentForm = document.querySelector(`[data-student="${studentId}"]`);
    if (studentForm) {
        studentForm.remove();
        updateStudentRemoveButtons();
    }
}

function updateStudentRemoveButtons() {
    const studentForms = document.querySelectorAll('.student-form');
    studentForms.forEach((form, index) => {
        const removeBtn = form.querySelector('.remove-student-btn');
        if (index === 0 && studentForms.length === 1) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.style.display = 'block';
        }
    });
}

// Handle parent form submission
document.getElementById('addParentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorElement = document.getElementById('add-parent-error');
    const submitButton = e.target.querySelector('.submit-btn');

    errorElement.style.display = 'none';
    submitButton.disabled = true;

    try {
        // Collect parent data
        const parentData = {
            username: document.getElementById('parent-username').value,
            email: document.getElementById('parent-email').value,
            password: document.getElementById('parent-password').value,
            role: "PARENT",
            currentAddress: document.getElementById('parent-address').value,
            fullName: document.getElementById('parent-fullname').value,
            contactPhone: document.getElementById('parent-phone').value
        };

        // Collect students data
        const studentsData = [];
        const studentForms = document.querySelectorAll('.student-form');

        studentForms.forEach(form => {
            const studentId = form.getAttribute('data-student');
            const studentData = {
                username: document.getElementById(`student-${studentId}-username`).value,
                email: document.getElementById(`student-${studentId}-email`).value,
                password: document.getElementById(`student-${studentId}-password`).value,
                role: "STUDENT",
                currentAddress: document.getElementById(`student-${studentId}-address`).value,
                fullName: document.getElementById(`student-${studentId}-fullname`).value,
                grade: document.getElementById(`student-${studentId}-grade`).value,
                section: document.getElementById(`student-${studentId}-section`).value
            };
            studentsData.push(studentData);
        });

        const requestBody = {
            parent: parentData,
            students: studentsData
        };

        const response = await fetch(`${SERVER_URL}/api/auth/sign-up/parents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Parent and students registered successfully!');
            closeAddParentModal();
            // Optionally refresh the students table here
        } else {
            errorElement.textContent = result.error || 'Failed to register parent and students';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        errorElement.textContent = 'Network error: ' + error.message;
        errorElement.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});

// =================== ADD OPERATOR & DRIVERS MODAL ===================
function showAddOperatorModal() {
    document.getElementById('addOperatorModal').style.display = 'flex';
    resetOperatorForm();
}

function closeAddOperatorModal() {
    document.getElementById('addOperatorModal').style.display = 'none';
    resetOperatorForm();
}

function resetOperatorForm() {
    document.getElementById('addOperatorForm').reset();
    document.getElementById('add-operator-error').style.display = 'none';

    // Reset drivers container to show only one driver
    const container = document.getElementById('drivers-container');
    container.innerHTML = `
        <div class="driver-form" data-driver="1">
            <div class="driver-header">
                <h5>Driver 1</h5>
                <button type="button" class="remove-driver-btn" onclick="removeDriverForm(1)" style="display: none;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="driver-1-username">Username *</label>
                    <input type="text" id="driver-1-username" required>
                </div>
                <div class="form-group">
                    <label for="driver-1-email">Email *</label>
                    <input type="email" id="driver-1-email" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group password-wrapper">
                    <label for="driver-1-password">Password *</label>
                    <input type="password" id="driver-1-password" required>
                    <span class="toggle-password" onclick="togglePassword('driver-1-password', this)">
                        <i class="fa-solid fa-eye-slash"></i>
                    </span>
                </div>
                <div class="form-group">
                    <label for="driver-1-license">License Number *</label>
                    <input type="text" id="driver-1-license" placeholder="e.g., DRV-12345" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="driver-1-phone">Contact Phone *</label>
                    <input type="tel" id="driver-1-phone" placeholder="+63-912-345-6789" required>
                </div>
                <div class="form-group">
                    <label for="driver-1-emergency">Emergency Contact *</label>
                    <input type="tel" id="driver-1-emergency" placeholder="+63-912-345-6789" required>
                </div>
            </div>
        </div>
    `;
    driverCounter = 1;
}

function addDriverForm() {
    driverCounter++;
    const container = document.getElementById('drivers-container');
    const driverForm = document.createElement('div');
    driverForm.className = 'driver-form';
    driverForm.setAttribute('data-driver', driverCounter);

    driverForm.innerHTML = `
        <div class="driver-header">
            <h5>Driver ${driverCounter}</h5>
            <button type="button" class="remove-driver-btn" onclick="removeDriverForm(${driverCounter})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="driver-${driverCounter}-username">Username *</label>
                <input type="text" id="driver-${driverCounter}-username" required>
            </div>
            <div class="form-group">
                <label for="driver-${driverCounter}-email">Email *</label>
                <input type="email" id="driver-${driverCounter}-email" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group password-wrapper">
                <label for="driver-${driverCounter}-password">Password *</label>
                <input type="password" id="driver-${driverCounter}-password" required>
                <span class="toggle-password" onclick="togglePassword('driver-${driverCounter}-password', this)">
                    <i class="fa-solid fa-eye-slash"></i>
                </span>
            </div>
            <div class="form-group">
                <label for="driver-${driverCounter}-license">License Number *</label>
                <input type="text" id="driver-${driverCounter}-license" placeholder="e.g., DRV-12345" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="driver-${driverCounter}-phone">Contact Phone *</label>
                <input type="tel" id="driver-${driverCounter}-phone" placeholder="+63-912-345-6789" required>
            </div>
            <div class="form-group">
                <label for="driver-${driverCounter}-emergency">Emergency Contact *</label>
                <input type="tel" id="driver-${driverCounter}-emergency" placeholder="+63-912-345-6789" required>
            </div>
        </div>
    `;

    container.appendChild(driverForm);

    // Show remove buttons for all drivers except the first one
    updateDriverRemoveButtons();
}

function removeDriverForm(driverId) {
    const driverForm = document.querySelector(`[data-driver="${driverId}"]`);
    if (driverForm) {
        driverForm.remove();
        updateDriverRemoveButtons();
    }
}

function updateDriverRemoveButtons() {
    const driverForms = document.querySelectorAll('.driver-form');
    driverForms.forEach((form, index) => {
        const removeBtn = form.querySelector('.remove-driver-btn');
        if (index === 0 && driverForms.length === 1) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.style.display = 'block';
        }
    });
}

// Handle operator form submission
document.getElementById('addOperatorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorElement = document.getElementById('add-operator-error');
    const submitButton = e.target.querySelector('.submit-btn');

    errorElement.style.display = 'none';
    submitButton.disabled = true;

    try {
        // Collect operator data
        const operatorData = {
            username: document.getElementById('operator-username').value,
            email: document.getElementById('operator-email').value,
            password: document.getElementById('operator-password').value,
            role: "OPERATOR",
            fullName: document.getElementById('operator-fullname').value,
            contactPhone: document.getElementById('operator-phone').value
        };

        // Collect drivers data
        const driversData = [];
        const driverForms = document.querySelectorAll('.driver-form');

        driverForms.forEach(form => {
            const driverId = form.getAttribute('data-driver');
            const driverData = {
                username: document.getElementById(`driver-${driverId}-username`).value,
                email: document.getElementById(`driver-${driverId}-email`).value,
                password: document.getElementById(`driver-${driverId}-password`).value,
                role: "DRIVER",
                licenseNumber: document.getElementById(`driver-${driverId}-license`).value,
                contactPhone: document.getElementById(`driver-${driverId}-phone`).value,
                emergencyContact: document.getElementById(`driver-${driverId}-emergency`).value
            };
            driversData.push(driverData);
        });

        const requestBody = {
            operator: operatorData,
            drivers: driversData
        };

        const response = await fetch(`${SERVER_URL}/api/auth/sign-up/operators`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Operator and drivers registered successfully!');
            closeAddOperatorModal();
            // Optionally refresh the shuttles table here
        } else {
            errorElement.textContent = result.error || 'Failed to register operator and drivers';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        errorElement.textContent = 'Network error: ' + error.message;
        errorElement.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});