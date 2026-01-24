const SERVER_URL = "http://localhost:8080"; // Change to "http://34.126.105.77:8080" for server testing

let token = null;
let currentUser = null;
let currentUserId = null;
let studentCounter = 1;
let driverCounter = 1;
let bulkType = '';
let allDrivers = [];

// Pagination State
const paginationState = {
    shuttles: { page: 0, size: 10, totalPages: 0 },
    students: { page: 0, size: 10, totalPages: 0 },
    drivers: { page: 0, size: 10, totalPages: 0 }
};

// =================== PAGINATION CONTROLS ===================
function renderPagination(entityType, containerId) {
    const state = paginationState[entityType];
    const container = document.getElementById(containerId);
    if (!container) return; // Should allow dynamic creation if missing later

    let html = `
        <div class="pagination-controls" style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 10px;">
            <button class="action-btn" ${state.page === 0 ? 'disabled' : ''} onclick="changePage('${entityType}', ${state.page - 1})">Previous</button>
            <span>Page ${state.page + 1} of ${state.totalPages}</span>
            <button class="action-btn" ${state.page >= state.totalPages - 1 ? 'disabled' : ''} onclick="changePage('${entityType}', ${state.page + 1})">Next</button>
        </div>
    `;

    // Check if pagination container exists within the tab, if not append it
    let pagDiv = container.querySelector('.pagination-controls');
    if (pagDiv) {
        pagDiv.outerHTML = html;
    } else {
        container.insertAdjacentHTML('beforeend', html);
    }
}

async function changePage(entityType, newPage) {
    if (newPage < 0 || newPage >= paginationState[entityType].totalPages) return;
    paginationState[entityType].page = newPage;

    if (entityType === 'shuttles') await loadShuttles();
    else if (entityType === 'students') await loadStudents();
    else if (entityType === 'drivers') await loadDrivers();
}

const studentStatuses = ['Checked in', 'Checked out', 'Not boarded'];
const studentStatusClasses = ['badge-checked-in', 'badge-checked-out', 'badge-not-boarded'];
const shuttleStatuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
const shuttleStatusClasses = ['badge-active', 'badge-inactive', 'badge-maintenance'];

// Function to sanitize input to prevent XSS
function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/&amp;/g, '&amp;');
}

// Check for stored token on page load
document.addEventListener('DOMContentLoaded', async () => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');
    const storedUserId = localStorage.getItem('currentUserId');

    if (storedToken && storedUser && storedUserId) {
        token = storedToken;
        currentUser = JSON.parse(storedUser);
        currentUserId = storedUserId;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("dashboard").style.display = "flex";
        await loadAllData();
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
                await loadAllData();
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

// =================== DELETE CONFIRMATION ===================
function showDeleteConfirm(id, type) {
    document.getElementById('deleteItemId').value = id;
    document.getElementById('deleteItemType').value = type;
    let message = 'Are you sure you want to delete this item? This action cannot be undone.';
    if (type === 'student') {
        message = 'Are you sure you want to delete this student? This will also delete their user account.';
    } else if (type === 'driver') {
        message = 'Are you sure you want to delete this driver? This will also delete their user account.';
    } else if (type === 'shuttle') {
        message = 'Are you sure you want to delete this shuttle? This will remove the shuttle assignment.';
    }
    document.getElementById('deleteConfirmMessage').textContent = message;
    document.getElementById("deleteConfirmModal").style.display = "flex";
}

async function confirmDelete() {
    const id = document.getElementById('deleteItemId').value;
    const type = document.getElementById('deleteItemType').value;
    document.getElementById("deleteConfirmModal").style.display = "none";
    if (type === 'student') {
        await deleteStudent(id);
    } else if (type === 'driver') {
        await deleteDriver(id);
    } else if (type === 'shuttle') {
        await deleteShuttle(id);
    }
}

function cancelDelete() {
    document.getElementById("deleteConfirmModal").style.display = "none";
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
    // Reset status filters to "All Status" when switching tabs
    const statusFilters = document.querySelectorAll('select[id$="statusFilter"], select[id$="statusFilterDrivers"]');
    statusFilters.forEach(filter => {
        filter.value = "all";
    });
    // Trigger filter functions to refresh displayed data
    if (tabId === 'shuttles') filterShuttles();
    if (tabId === 'students') filterStudents();
    if (tabId === 'drivers') filterDrivers();
    if (tabId === 'notifications') filterNotifications();
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content");
    sidebar.classList.toggle("active");
    content.classList.toggle("content-shift");
}

// =================== DATA LOADING ===================
async function loadAllData() {
    await Promise.all([
        loadStudents(),
        loadDrivers(),
        loadShuttles()
    ]);
}

async function loadShuttles() {
    if (!token) return;
    try {
        const { page, size } = paginationState.shuttles;
        // Default sort by shuttleId desc as per controller default or preference
        const response = await fetch(`${SERVER_URL}/api/shuttles/all?page=${page}&size=${size}&sortBy=shuttleId&sortOrder=desc`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch shuttles');
        }
        const data = await response.json();
        const shuttles = data.content; // Access content from Page object

        // Update pagination state
        paginationState.shuttles.totalPages = data.totalPages;
        paginationState.shuttles.page = data.number;

        const tbody = document.getElementById('shuttles-table');
        tbody.innerHTML = '';
        shuttles.forEach((shuttle) => {
            const statusText = shuttle.status;
            const statusClass = shuttleStatusClasses[shuttleStatuses.indexOf(statusText)] || 'badge-active';
            const maxCapacity = shuttle.maxCapacity || 50;
            const currentOccupancy = Math.floor(Math.random() * (maxCapacity + 1));
            const occupancy = `${currentOccupancy}/${maxCapacity}`;
            const lat = (14.5 + Math.random() * 0.2).toFixed(4);
            const lng = (121.0 + Math.random() * 0.2).toFixed(4);
            const nextStop = `Stop ${Math.floor(Math.random() * 5) + 1}`;
            const eta = `${Math.floor(Math.random() * 25) + 5} min`;
            const tr = document.createElement('tr');
            tr.dataset.shuttleId = shuttle.shuttleId;
            tr.innerHTML = `
                <td>${sanitizeHTML(shuttle.name)}</td>
                <td>${sanitizeHTML(shuttle.driver.user.username)}</td>
                <td>${sanitizeHTML(shuttle.licensePlate)}</td>
                <td>${sanitizeHTML(shuttle.route)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${occupancy}</td>
                <td>Lat: ${lat}, Lng: ${lng}</td>
                <td>${nextStop}</td>
                <td>${eta}</td>
                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">
                        <button class="action-btn track-btn" onclick="showToast('Tracking shuttle details')">Track Details</button>
                        <div class="actions-dropdown">
                            <button class="ellipsis-btn" onclick="toggleDropdown(this)"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            <div class="dropdown-menu" style="display: none;">
                                <button class="dropdown-item" onclick="editShuttle(${shuttle.shuttleId}); toggleDropdown(this.parentElement.previousElementSibling)"><i class="fa-solid fa-edit"></i> Edit</button>
                                <button class="dropdown-item delete" onclick="showDeleteConfirm(${shuttle.shuttleId}, 'shuttle'); toggleDropdown(this.parentElement.previousElementSibling)"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination('shuttles', 'shuttles'); // Add controls to 'shuttles' tab container

    } catch (error) {
        console.error('Error loading shuttles:', error);
        showToast('Error loading shuttles data');
    }
}

async function loadStudents() {
    if (!token) return;
    try {
        const { page, size } = paginationState.students;
        const response = await fetch(`${SERVER_URL}/api/students/all?page=${page}&size=${size}&sortBy=studentId&sortOrder=desc`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch students');
        }
        const data = await response.json();
        const students = data.content; // Access content list

        // Update pagination state
        paginationState.students.totalPages = data.totalPages;
        paginationState.students.page = data.number;

        const tbody = document.getElementById('students-table');
        tbody.innerHTML = '';
        students.forEach(student => {
            const statusIndex = Math.floor(Math.random() * studentStatuses.length);
            const statusText = studentStatuses[statusIndex];
            const statusClass = studentStatusClasses[statusIndex];
            let checkInTime = '-';
            if (statusIndex !== 2) {
                const hoursAgo = Math.floor(Math.random() * 8) + 1;
                const checkInDate = new Date(Date.now() - hoursAgo * 3600000);
                checkInTime = checkInDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            }
            const assignedShuttle = student.assignedShuttle ? `Shuttle #${student.assignedShuttle.shuttleId}` : 'Not Assigned';
            // Fallback since API student object might not populate assigned shuttle details similarly if backend changed to lazy or different serialized form, but let's assume it's there or handle gently.

            const tr = document.createElement('tr');
            tr.dataset.studentId = student.studentId;
            // Handle null parent just in case
            const parentName = student.parent ? sanitizeHTML(student.parent.fullName) : 'N/A';
            const parentContact = student.parent ? sanitizeHTML(student.parent.contactPhone) : 'N/A';
            const parentEmail = student.parent && student.parent.user ? sanitizeHTML(student.parent.user.email) : 'N/A';

            tr.innerHTML = `
                <td>${sanitizeHTML(student.fullName)}<br><small>${sanitizeHTML(student.grade)} - ${sanitizeHTML(student.section)}</small></td>
                <td>${parentName}</td>
                <td><i class="fa-solid fa-phone"></i> ${parentContact}<br><i class="fa-solid fa-envelope"></i> ${parentEmail}</td>
                <td>${sanitizeHTML(assignedShuttle)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${checkInTime}</td>
                <td>${sanitizeHTML(student.currentAddress)}</td>
                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">
                        <button class="action-btn track-btn" onclick="showToast('Tracking student details')">Track Details</button>
                        <div class="actions-dropdown">
                            <button class="ellipsis-btn" onclick="toggleDropdown(this)"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            <div class="dropdown-menu" style="display: none;">
                                <button class="dropdown-item" onclick="editStudent(${student.studentId}); toggleDropdown(this.parentElement.previousElementSibling)"><i class="fa-solid fa-edit"></i> Edit</button>
                                <button class="dropdown-item delete" onclick="showDeleteConfirm(${student.studentId}, 'student'); toggleDropdown(this.parentElement.previousElementSibling)"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination('students', 'students'); // Add controls to 'students' tab container

    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students data');
    }
}

async function loadDrivers() {
    if (!token) return;
    try {
        const { page, size } = paginationState.drivers;
        const response = await fetch(`${SERVER_URL}/api/drivers/all?page=${page}&size=${size}&sortBy=driverId&sortOrder=desc`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch drivers');
        }
        const data = await response.json();
        allDrivers = data.content; // Access content list

        // Update pagination state
        paginationState.drivers.totalPages = data.totalPages;
        paginationState.drivers.page = data.number;

        const tbody = document.getElementById('drivers-table');
        tbody.innerHTML = '';
        allDrivers.forEach(driver => {
            const tr = document.createElement('tr');
            tr.dataset.driverId = driver.driverId;
            tr.innerHTML = `
                <td>${sanitizeHTML(driver.user.username)}</td>
                <td>${sanitizeHTML(driver.operator.fullName)}<br><small><i class="fa-solid fa-envelope"></i> ${sanitizeHTML(driver.operator.user.email)}</small></td>
                <td><i class="fa-solid fa-phone"></i> ${sanitizeHTML(driver.contactPhone)}<br><i class="fa-solid fa-envelope"></i> ${sanitizeHTML(driver.user.email)}</td>
                <td><i class="fa-solid fa-phone"></i> ${sanitizeHTML(driver.emergencyContact)}</td>
                <td><span class="status-badge badge-active">Active</span></td>
                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">
                        <button class="action-btn track-btn" onclick="showToast('Tracking driver details')">Track Details</button>
                        <div class="actions-dropdown">
                            <button class="ellipsis-btn" onclick="toggleDropdown(this)"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            <div class="dropdown-menu" style="display: none;">
                                <button class="dropdown-item" onclick="editDriver(${driver.driverId}); toggleDropdown(this.parentElement.previousElementSibling)"><i class="fa-solid fa-edit"></i> Edit</button>
                                <button class="dropdown-item delete" onclick="showDeleteConfirm(${driver.driverId}, 'driver'); toggleDropdown(this.parentElement.previousElementSibling)"><i class="fa-solid fa-trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination('drivers', 'drivers'); // Add controls to 'drivers' tab container

    } catch (error) {
        console.error('Error loading drivers:', error);
        showToast('Error loading drivers data');
    }
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
        const statusText = row.querySelector('td:nth-child(5) span')?.textContent || '';
        const statusClass = row.querySelector('td:nth-child(5) span')?.className || '';
        const route = row.querySelector('td:nth-child(4)')?.textContent || '';
        const shuttle = row.querySelector('td:nth-child(1)')?.textContent || '';
        const driver = row.querySelector('td:nth-child(2)')?.textContent || '';
        const occupancy = row.querySelector('td:nth-child(6)')?.textContent || '';
        const capacity = occupancy.split('/')[1] || '';
        routes.add(route);
        if (statusText === 'ACTIVE') {
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
        if (statusText !== 'ACTIVE') delayed++;
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
        const normalizedStatus = status.replace(/\s+/g, '-');
        const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-students-message").style.display = visibleCount === 0 ? "block" : "none";
}

function filterDrivers() {
    const searchValue = document.getElementById("searchDrivers").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilterDrivers").value.toLowerCase();
    const rows = document.querySelectorAll("#drivers-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const driver = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const operator = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
        const license = row.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || "";
        const status = row.querySelector("td:nth-child(6) span")?.textContent.toLowerCase() || "";

        const matchesSearch = driver.includes(searchValue) || operator.includes(searchValue) || license.includes(searchValue);
        const matchesStatus = statusFilter === "all" || status === statusFilter;

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-drivers-message").style.display = visibleCount === 0 ? "block" : "none";
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

// =================== SHUTTLE MODAL FUNCTIONS ===================
function loadDriversForOperator(opIdElem, driverIdElem) {
    const opValue = document.getElementById(opIdElem).value;
    const dSelect = document.getElementById(driverIdElem);
    dSelect.innerHTML = '<option value="">Select Driver</option>';
    if (opValue && allDrivers.length) {
        const filtered = allDrivers.filter(d => d.operator.operatorId.toString() === opValue);
        filtered.sort((a, b) => a.user.username.localeCompare(b.user.username)).forEach(d => {
            const opt = new Option(d.user.username, d.driverId);
            dSelect.add(opt);
        });
    }
}

async function showAddShuttleModal() {
    document.getElementById('addShuttleModal').style.display = 'flex';
    document.getElementById('addShuttleForm').reset();
    document.getElementById('addShuttleForm').querySelector('#maxCapacityInput').value = 50;
    document.getElementById('add-shuttle-error').style.display = 'none';
    if (!allDrivers.length) {
        await loadDrivers();
    }
    const uniqueOps = {};
    allDrivers.forEach(d => {
        if (!uniqueOps[d.operator.operatorId]) {
            uniqueOps[d.operator.operatorId] = d.operator;
        }
    });
    const opSelect = document.getElementById('operatorSelect');
    opSelect.innerHTML = '<option value="">Select Operator</option>';
    Object.values(uniqueOps).sort((a, b) => a.fullName.localeCompare(b.fullName)).forEach(op => {
        const opt = new Option(op.fullName, op.operatorId);
        opSelect.add(opt);
    });
    document.getElementById('driverSelect').innerHTML = '<option value="">Select Driver</option>';
}

function closeAddShuttleModal() {
    document.getElementById('addShuttleModal').style.display = 'none';
    document.getElementById('addShuttleForm').reset();
    document.getElementById('addShuttleForm').querySelector('#maxCapacityInput').value = 50;
    document.getElementById('add-shuttle-error').style.display = 'none';
}

async function editShuttle(id) {
    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch shuttle');
        const shuttle = await response.json();
        document.getElementById('edit-shuttle-id').value = shuttle.shuttleId;
        document.getElementById('edit-name-input').value = shuttle.name || '';
        document.getElementById('edit-license-plate-input').value = shuttle.licensePlate || ''; // New
        document.getElementById('edit-status-select').value = shuttle.status;
        document.getElementById('edit-route-input').value = shuttle.route || '';
        document.getElementById('edit-max-capacity-input').value = shuttle.maxCapacity || 50;
        if (!allDrivers.length) await loadDrivers();
        const uniqueOps = {};
        allDrivers.forEach(d => {
            if (!uniqueOps[d.operator.operatorId]) {
                uniqueOps[d.operator.operatorId] = d.operator;
            }
        });
        const opSelect = document.getElementById('edit-operator-select');
        opSelect.innerHTML = '<option value="">Select Operator</option>';
        Object.values(uniqueOps).sort((a, b) => a.fullName.localeCompare(b.fullName)).forEach(op => {
            const opt = new Option(op.fullName, op.operatorId);
            opSelect.add(opt);
        });
        opSelect.value = shuttle.operator.operatorId;
        loadDriversForOperator('edit-operator-select', 'edit-driver-select');
        document.getElementById('edit-driver-select').value = shuttle.driver.driverId;
        document.getElementById('editShuttleModal').style.display = 'flex';
        document.getElementById('edit-shuttle-error').style.display = 'none';
    } catch (error) {
        showToast('Error loading shuttle data: ' + error.message);
    }
}

function closeEditShuttleModal() {
    document.getElementById('editShuttleModal').style.display = 'none';
    document.getElementById('editShuttleForm').reset();
    document.getElementById('editShuttleForm').querySelector('#edit-max-capacity-input').value = 50;
    document.getElementById('edit-shuttle-error').style.display = 'none';
}

document.getElementById('addShuttleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('add-shuttle-error');
    const submitBtn = e.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    const name = document.getElementById('nameInput').value.trim();
    const licensePlate = document.getElementById('licensePlateInput').value.trim(); // New
    const opId = document.getElementById('operatorSelect').value;
    const driverId = document.getElementById('driverSelect').value;
    const route = document.getElementById('routeInput').value.trim();
    const maxCapacity = parseInt(document.getElementById('maxCapacityInput').value);

    if (!opId || !driverId || !route || !maxCapacity || !licensePlate) { // Check licensePlate
        errorEl.textContent = 'All required fields must be filled';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        return;
    }

    try {
        const body = JSON.stringify({
            name: name || undefined,
            licensePlate, // New
            operatorId: parseInt(opId),
            driverId: parseInt(driverId),
            route,
            maxCapacity
        });
        const res = await fetch(`${SERVER_URL}/api/shuttles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Shuttle added successfully');
            closeAddShuttleModal();
            await loadShuttles();
            updateDashboard();
        } else {
            errorEl.textContent = data.error || 'Failed to add shuttle';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Network error: ' + err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
});

document.getElementById('editShuttleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('edit-shuttle-error');
    const submitBtn = e.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    errorEl.style.display = 'none';
    const id = document.getElementById('edit-shuttle-id').value;
    const name = document.getElementById('edit-name-input').value.trim();
    const licensePlate = document.getElementById('edit-license-plate-input').value.trim(); // New
    const status = document.getElementById('edit-status-select').value;
    const opId = document.getElementById('edit-operator-select').value;
    const driverId = document.getElementById('edit-driver-select').value;
    const route = document.getElementById('edit-route-input').value.trim();
    const maxCapacity = parseInt(document.getElementById('edit-max-capacity-input').value);
    if (!status || !opId || !driverId || !route || !maxCapacity || !licensePlate) {
        errorEl.textContent = 'All required fields must be filled';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        return;
    }
    try {
        const body = JSON.stringify({
            name: name || undefined,
            licensePlate, // New
            status,
            operatorId: parseInt(opId),
            driverId: parseInt(driverId),
            route,
            maxCapacity
        });
        const res = await fetch(`${SERVER_URL}/api/shuttles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Shuttle updated successfully');
            closeEditShuttleModal();
            await loadShuttles();
            updateDashboard();
        } else {
            errorEl.textContent = data.error || 'Failed to update shuttle';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Network error: ' + err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
});

async function deleteShuttle(id) {
    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast('Shuttle deleted successfully');
            await loadShuttles();
            updateDashboard();
        } else {
            const data = await response.json();
            showToast('Failed to delete shuttle: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        showToast('Error deleting shuttle: ' + error.message);
    }
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
            await loadStudents(); // Refresh students table
            updateDashboard();
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
            await loadDrivers(); // Refresh shuttles table
            updateDashboard();
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

// =================== BULK UPLOAD MODAL ===================
function showBulkUploadModal(type) {
    bulkType = type;
    const title = type === 'students' ? 'Parents & Students' : 'Operators & Drivers';
    document.getElementById('bulk-title').innerHTML = `<i class="fa-solid fa-upload"></i> Bulk Upload ${title}`;
    document.getElementById('bulkUploadModal').style.display = 'flex';
    document.getElementById('bulkUploadForm').reset();
    document.getElementById('bulk-error').style.display = 'none';
}

function closeBulkUploadModal() {
    document.getElementById('bulkUploadModal').style.display = 'none';
    bulkType = '';
}

// Handle bulk upload form submission
document.getElementById('bulkUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('bulk-file');
    const errorElement = document.getElementById('bulk-error');
    const submitButton = e.target.querySelector('.submit-btn');

    if (!fileInput.files[0]) {
        errorElement.textContent = 'Please select a file';
        errorElement.style.display = 'block';
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    submitButton.disabled = true;
    errorElement.style.display = 'none';

    try {
        // Determine the endpoint based on bulkType
        const endpoint = bulkType === 'students'
            ? `${SERVER_URL}/api/admin/bulk-upload/parents-students`
            : `${SERVER_URL}/api/admin/bulk-upload/operators-drivers`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`Bulk upload successful: ${result.successful || 'Multiple'} users added`);
            closeBulkUploadModal();
            if (bulkType === 'students') {
                await loadStudents();
            } else {
                await loadDrivers();
            }
            updateDashboard();
        } else {
            errorElement.textContent = result.error || 'Failed to upload file';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        errorElement.textContent = 'Network error: ' + error.message;
        errorElement.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});

// =================== ELLIPSIS DROPDOWN ===================
function toggleDropdown(btn) {
    // Get the dropdown menu associated with the clicked button
    const menu = btn.parentElement.querySelector('.dropdown-menu');

    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
        if (otherMenu !== menu) {
            otherMenu.style.display = 'none';
        }
    });

    // Toggle the current dropdown
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    // Check if the click is outside any dropdown menu or ellipsis button
    if (!e.target.closest('.actions-dropdown') && !e.target.closest('.ellipsis-btn')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// =================== STUDENT ACTIONS ===================
async function editStudent(id) {
    try {
        const response = await fetch(`${SERVER_URL}/api/students/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch student');
        const student = await response.json();
        document.getElementById('edit-student-id').value = id;
        document.getElementById('edit-student-fullname').value = student.fullName || '';
        document.getElementById('edit-student-grade').value = student.grade || '';
        document.getElementById('edit-student-section').value = student.section || '';
        document.getElementById('edit-student-address').value = student.currentAddress || '';
        // Parent fields
        document.getElementById('edit-parent-id').value = student.parent.parentId;
        document.getElementById('edit-parent-fullname').value = student.parent.fullName || '';
        document.getElementById('edit-parent-phone').value = student.parent.contactPhone || '';
        document.getElementById('edit-parent-address').value = student.parent.currentAddress || '';
        document.getElementById('editStudentModal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading student data: ' + error.message);
    }
}

function closeEditStudentModal() {
    document.getElementById('editStudentModal').style.display = 'none';
    document.getElementById('editStudentForm').reset();
    document.getElementById('edit-student-error').style.display = 'none';
}

document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-student-id').value;
    const parentId = document.getElementById('edit-parent-id').value;
    const updatedStudent = {
        fullName: document.getElementById('edit-student-fullname').value,
        grade: document.getElementById('edit-student-grade').value,
        section: document.getElementById('edit-student-section').value,
        currentAddress: document.getElementById('edit-student-address').value
    };
    const updatedParent = {
        fullName: document.getElementById('edit-parent-fullname').value,
        contactPhone: document.getElementById('edit-parent-phone').value,
        currentAddress: document.getElementById('edit-parent-address').value
    };
    const errorElement = document.getElementById('edit-student-error');
    const submitButton = e.target.querySelector('.submit-btn');
    submitButton.disabled = true;
    errorElement.style.display = 'none';

    try {
        // Update student
        const studentResponse = await fetch(`${SERVER_URL}/api/students/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedStudent)
        });
        if (!studentResponse.ok) throw new Error('Failed to update student');

        // Update parent
        const parentResponse = await fetch(`${SERVER_URL}/api/parents/${parentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedParent)
        });
        if (!parentResponse.ok) throw new Error('Failed to update parent');

        showToast('Student and parent updated successfully');
        closeEditStudentModal();
        await loadStudents();
        updateDashboard();
    } catch (error) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});

async function deleteStudent(id) {
    try {
        const response = await fetch(`${SERVER_URL}/api/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast('Student deleted successfully');
            await loadStudents();
            updateDashboard();
        } else {
            const data = await response.json();
            showToast('Failed to delete student: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        showToast('Error deleting student: ' + error.message);
    }
}

// =================== DRIVER ACTIONS ===================
async function editDriver(id) {
    try {
        const response = await fetch(`${SERVER_URL}/api/drivers/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch driver');
        const driver = await response.json();
        document.getElementById('edit-driver-id').value = id;
        document.getElementById('edit-driver-contact').value = driver.contactPhone || '';
        document.getElementById('edit-driver-emergency').value = driver.emergencyContact || '';
        // Operator fields
        document.getElementById('edit-operator-id').value = driver.operator.operatorId;
        document.getElementById('edit-operator-fullname').value = driver.operator.fullName || '';
        document.getElementById('edit-operator-phone').value = driver.operator.contactPhone || '';
        document.getElementById('editDriverModal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading driver data: ' + error.message);
    }
}

function closeEditDriverModal() {
    document.getElementById('editDriverModal').style.display = 'none';
    document.getElementById('editDriverForm').reset();
    document.getElementById('edit-driver-error').style.display = 'none';
}

document.getElementById('editDriverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-driver-id').value;
    const operatorId = document.getElementById('edit-operator-id').value;
    const updatedDriver = {
        contactPhone: document.getElementById('edit-driver-contact').value,
        emergencyContact: document.getElementById('edit-driver-emergency').value
    };
    const updatedOperator = {
        fullName: document.getElementById('edit-operator-fullname').value,
        contactPhone: document.getElementById('edit-operator-phone').value
    };
    const errorElement = document.getElementById('edit-driver-error');
    const submitButton = e.target.querySelector('.submit-btn');
    submitButton.disabled = true;
    errorElement.style.display = 'none';

    try {
        // Update driver
        const driverResponse = await fetch(`${SERVER_URL}/api/drivers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedDriver)
        });
        if (!driverResponse.ok) throw new Error('Failed to update driver');

        // Update operator
        const operatorResponse = await fetch(`${SERVER_URL}/api/operators/${operatorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedOperator)
        });
        if (!operatorResponse.ok) throw new Error('Failed to update operator');

        showToast('Driver and operator updated successfully');
        closeEditDriverModal();
        await loadDrivers();
        updateDashboard();
    } catch (error) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});

async function deleteDriver(id) {
    try {
        const response = await fetch(`${SERVER_URL}/api/drivers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast('Driver deleted successfully');
            await loadDrivers();
            updateDashboard();
        } else {
            const data = await response.json();
            showToast('Failed to delete driver: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        showToast('Error deleting driver: ' + error.message);
    }
}