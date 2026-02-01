// Cloud Deployment: Use relative path if served from same origin, or localhost for local dev
const SERVER_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? "http://localhost:8080"
    : ""; // Production: Requests go to same domain (e.g. /api/...)

let token = null;
let currentUser = null;
let currentUserId = null;
let studentCounter = 1;
let driverCounter = 1;
let bulkType = '';
let allDrivers = [];
let currentDashboardView = 'home';

// Pagination State
const paginationState = {
    shuttles: { page: 0, size: 10, totalPages: 0 },
    students: { page: 0, size: 10, totalPages: 0 },
    drivers: { page: 0, size: 10, totalPages: 0 },
    registration: { page: 0, size: 10, totalPages: 0 }
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
    else if (entityType === 'registration') await loadRegistration();
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
    currentDashboardView = tabId;
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
    const statusFilters = document.querySelectorAll('select[id$="statusFilter"]');
    statusFilters.forEach(filter => {
        filter.value = "all";
    });
    // Reset specific registration filter if separate
    if (document.getElementById('statusFilterRegistration')) {
        document.getElementById('statusFilterRegistration').value = 'all';
    }
    // Trigger filter functions to refresh displayed data
    if (tabId === 'shuttles') filterShuttles();
    if (tabId === 'students') filterStudents();
    if (tabId === 'drivers') filterDrivers();
    if (tabId === 'notifications') filterNotifications();
    if (tabId === 'registration') loadRegistration();
    if (tabId === 'checkin') loadCheckInManagement();

    // Fix map size when switching to live-map tab
    if (tabId === 'live-map' && window.dashboardMap) {
        setTimeout(() => {
            window.dashboardMap.resize();
        }, 100);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content");
    sidebar.classList.toggle("active");
    content.classList.toggle("content-shift");
}

// =================== SHUTTLE STUDENTS DETAILS ===================
let currentShuttleStudents = [];
let currentShuttleId = null;

async function showShuttleDetails(shuttleId) {
    if (!token) return;
    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/${shuttleId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch shuttle details');

        const data = await response.json();
        const students = data.assignedStudentLocations || [];
        currentShuttleStudents = students;
        currentShuttleId = shuttleId;

        const driverInfo = data.driver ? ` - Driver ID: ${data.driver.driverId}` : ' - No Driver';
        document.getElementById('modal-shuttle-id-display').textContent = ' - Shuttle #' + shuttleId + driverInfo;

        renderShuttleStudents(students);
        document.getElementById('shuttleStudentsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading shuttle details:', error);
        showToast('Error loading shuttle details');
    }
}

function renderShuttleStudents(students) {
    const tbody = document.getElementById('shuttle-students-tbody');
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No students assigned</td></tr>';
        return;
    }

    students.forEach(student => {
        const tr = document.createElement('tr');
        const lat = student.latitude !== null && student.latitude !== undefined ? student.latitude.toFixed(6) : 'Not Set';
        const lng = student.longitude !== null && student.longitude !== undefined ? student.longitude.toFixed(6) : 'Not Set';
        const pinLocation = (lat === 'Not Set') ? '<span style="color:red">Not Set</span>' : `${lat}, ${lng}`;

        tr.innerHTML = `
            <td>${student.studentId}</td>
            <td>${sanitizeHTML(student.name)}</td>
            <td>${pinLocation}</td>
        `;
        tbody.appendChild(tr);
    });
}
// Retrying implementation to be cleaner
function closeShuttleStudentsModal() {
    document.getElementById('shuttleStudentsModal').style.display = 'none';
}

function filterShuttleStudents() {
    const query = document.getElementById('searchShuttleStudents').value.toLowerCase();
    const filtered = currentShuttleStudents.filter(s =>
        s.name.toLowerCase().includes(query) ||
        String(s.studentId).includes(query)
    );
    // We need the shuttleId for the table. 
    // I need to store the current shuttle ID globally or pass it?
    // Let's just store it in a global variable when opening.
    renderShuttleStudents(filtered);
}
// Wait, I need to solve the `shuttleId` display issue properly.
// I will add `currentShuttleId` global.

// =================== DATA LOADING ===================
async function loadAllData() {
    await Promise.all([
        loadStudents(),
        loadDrivers(),
        loadShuttles(), // loads list for table
        fetchMapShuttles() // loads markers for map
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


            const tr = document.createElement('tr');
            tr.dataset.shuttleId = shuttle.shuttleId;
            const driverName = shuttle.driver ? sanitizeHTML(shuttle.driver.user.username) : 'No Driver';
            const statusClass = shuttleStatusClasses[shuttleStatuses.indexOf(shuttle.status)] || 'badge-inactive';

            tr.innerHTML = `
                <td>${sanitizeHTML(shuttle.name || 'Shuttle #' + shuttle.shuttleId)}</td>
                <td>${driverName}</td>
                <td>${sanitizeHTML(shuttle.licensePlate || 'N/A')}</td>
                <td>${sanitizeHTML(shuttle.route || 'Unassigned')}</td>
                <td><span class="status-badge ${statusClass}">${shuttle.status}</span></td>
                <td>${shuttle.assignedStudentsCount || 0} / ${shuttle.maxCapacity}</td>

                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">



                        <button class="action-btn" onclick="showShuttleDetails(${shuttle.shuttleId})" title="Show Details"><i class="fa-solid fa-list"></i></button>
                        <button class="action-btn" onclick="editShuttle(${shuttle.shuttleId})"><i class="fa-solid fa-edit"></i> Edit</button>
                        <button class="action-btn delete-btn" onclick="showDeleteConfirm(${shuttle.shuttleId}, 'shuttle')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination('shuttles', 'shuttles');

    } catch (error) {
        console.error('Error loading shuttles:', error);
        showToast('Error loading shuttles data');
    }
}

// Pagination state needs a new entry for checkin
paginationState.checkin = { page: 0, size: 10, totalPages: 0 };

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
        const students = data.content;
        allStudentsData = students; // For lookups

        // Update pagination
        paginationState.students.totalPages = data.totalPages;
        paginationState.students.page = data.number;

        const tbody = document.getElementById('students-table');
        tbody.innerHTML = '';
        students.forEach(student => {
            const tr = document.createElement('tr');
            tr.dataset.studentId = student.studentId;
            const parentName = student.parent ? sanitizeHTML(student.parent.fullName) : 'N/A';
            const parentContact = student.parent ? sanitizeHTML(student.parent.contactPhone) : 'N/A';
            const parentEmail = student.parent && student.parent.user ? sanitizeHTML(student.parent.user.email) : 'N/A';

            // Static Data Only
            tr.innerHTML = `
                <td>${sanitizeHTML(student.fullName)}<br><small>${sanitizeHTML(student.grade)} - ${sanitizeHTML(student.section)}</small></td>
                <td>${parentName}</td>
                <td><i class="fa-solid fa-phone"></i> ${parentContact}<br><i class="fa-solid fa-envelope"></i> ${parentEmail}</td>
                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">
                        <button class="action-btn" onclick="editStudent(${student.studentId})"><i class="fa-solid fa-edit"></i> Edit</button>
                        <button class="action-btn delete-btn" onclick="showDeleteConfirm(${student.studentId}, 'student')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination('students', 'students');

    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students data');
    }
}

async function loadCheckInManagement() {
    if (!token) return;
    try {
        const { page, size } = paginationState.checkin;
        // Re-use student API for now, as it contains all needed info
        const response = await fetch(`${SERVER_URL}/api/students/all?page=${page}&size=${size}&sortBy=studentId&sortOrder=desc`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) { throw new Error('Failed to fetch check-in data'); }

        const data = await response.json();
        const students = data.content;
        allStudentsData = students; // Sync global data

        paginationState.checkin.totalPages = data.totalPages;
        paginationState.checkin.page = data.number;

        const tbody = document.getElementById('checkin-table');
        tbody.innerHTML = '';

        students.forEach(student => {
            let statusText = student.status || 'Not Boarded';
            let statusClass = 'badge-inactive';

            if (statusText === 'Checked In') statusClass = 'badge-active';
            else if (statusText === 'Checked Out') statusClass = 'badge-maintenance';

            let checkInTime = '-';
            if (student.lastCheckInTime) {
                const checkInDate = new Date(student.lastCheckInTime);
                checkInTime = checkInDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            }

            const assignedShuttle = student.assignedShuttle ? `Shuttle #${student.assignedShuttle.shuttleId}` : 'Not Assigned';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${sanitizeHTML(student.fullName)}<br><small>${sanitizeHTML(student.grade)}</small></td>
                <td>${sanitizeHTML(assignedShuttle)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${checkInTime}</td>
                <td>${sanitizeHTML(student.currentAddress)}</td>
                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">
                        <button class="action-btn track-btn" onclick="showToast('Tracking details for ' + '${sanitizeHTML(student.fullName)}')">Track</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // You might need to add renderPagination support for 'checkin' target
        // For now reusing the existing function if it supports arbitrary targets, 
        // else we assume renderPagination needs update or we add it later.
        // renderPagination('checkin', 'checkin'); 

    } catch (error) {
        console.error('Error loading checkin:', error);
        showToast('Error loading check-in data');
    }
}

async function loadRegistration() {
    if (!token) return;
    try {
        const { page, size } = paginationState.registration;
        const response = await fetch(`${SERVER_URL}/api/students/all?page=${page}&size=${size}&sortBy=studentId&sortOrder=desc`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch registration data');
        const data = await response.json();
        const students = data.content;
        allStudentsData = students;

        paginationState.registration.totalPages = data.totalPages;
        paginationState.registration.page = data.number;

        const tbody = document.getElementById('registration-table');
        if (tbody) {
            tbody.innerHTML = '';
            students.forEach(student => {
                let assignedShuttle = 'Not Assigned';
                if (student.assignedShuttle) {
                    const shuttleName = student.assignedShuttle.name ? student.assignedShuttle.name : `Shuttle #${student.assignedShuttle.shuttleId}`;
                    assignedShuttle = `${shuttleName}(${student.assignedShuttle.route})`;
                }
                const hasRfid = student.rfidTag ? '<i class="fa-solid fa-check-circle" style="color: green;"></i> RFID' : '<i class="fa-solid fa-times-circle" style="color: red;"></i> RFID';
                const hasFingerprint = student.fingerprintHash ? '<i class="fa-solid fa-check-circle" style="color: green;"></i> Fingerprint' : '<i class="fa-solid fa-times-circle" style="color: red;"></i> Fingerprint';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${sanitizeHTML(student.fullName)}</td>
                    <td>${sanitizeHTML(student.grade)} - ${sanitizeHTML(student.section)}</td>
                    <td>
                        ${sanitizeHTML(assignedShuttle)}
                        <button class="action-btn" onclick="showAssignShuttleModal(${student.studentId})" style="margin-left:5px; font-size: 0.8em;"><i class="fa-solid fa-pen"></i></button>
                    </td>
                    <td>${hasRfid} &nbsp; ${hasFingerprint}</td>
                    <td>
                        <button class="action-btn" onclick="showRegisterDeviceModal(${student.studentId})"><i class="fa-solid fa-id-card"></i> Register Device</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            renderPagination('registration', 'registration');
            filterRegistration();
        }
    } catch (error) {
        console.error('Error loading registration:', error);
        showToast('Error loading registration data');
    }
}














// =================== ASSIGN SHUTTLE ===================
function showAssignShuttleModal(studentId) {
    document.getElementById('assign-student-id').value = studentId;
    const select = document.getElementById('assign-shuttle-select');
    select.innerHTML = '<option value="">Select Shuttle</option>';

    // Use the loaded shuttles (or fetch active ones)
    // We can fetch active shuttles specifically or use loadShuttles data if available
    // For simplicity, let's fetch list if we don't have a specific global for dropdown
    // Or just iterate existing paginationState.shuttles data? No, that's paginated.
    // Better to fetch all active shuttles for the dropdown.

    fetch(`${SERVER_URL}/api/shuttles/all?size=100`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            data.content.forEach(shuttle => {
                const opt = document.createElement('option');
                opt.value = shuttle.shuttleId;
                const shuttleName = shuttle.name ? shuttle.name : `Shuttle #${shuttle.shuttleId}`;
                opt.textContent = `${shuttleName}(${shuttle.route}) - ${shuttle.status}`;
                select.appendChild(opt);
            });
            document.getElementById('assignShuttleModal').style.display = 'flex';
        })
        .catch(err => showToast("Error loading shuttles"));
}

function closeAssignShuttleModal() {
    document.getElementById('assignShuttleModal').style.display = 'none';
}

document.getElementById('assignShuttleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('assign-student-id').value;
    const shuttleId = document.getElementById('assign-shuttle-select').value;

    if (!shuttleId) return;

    try {
        const response = await fetch(`${SERVER_URL}/api/students/${studentId}/assigned-shuttle`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ shuttleId: parseInt(shuttleId) })
        });

        if (response.ok) {
            showToast("Shuttle assigned successfully");
            closeAssignShuttleModal();
            loadRegistration(); // Refresh table
        } else {
            showToast("Failed to assign shuttle");
        }
    } catch (err) {
        showToast("Error assigning shuttle");
    }
});

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
                <td>
                    <div style="display: inline-flex; gap: 5px; align-items: center;">

                        <button class="action-btn" onclick="editDriver(${driver.driverId})"><i class="fa-solid fa-edit"></i> Edit</button>
                        <button class="action-btn delete-btn" onclick="showDeleteConfirm(${driver.driverId}, 'driver')"><i class="fa-solid fa-trash"></i> Delete</button>
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

    try {
        const response = await fetch(`${SERVER_URL}/api/admin/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const stats = await response.json();

            // Update Balance Cards with backend data
            const balanceCards = document.querySelectorAll(".balance-card h1");
            balanceCards[0].textContent = stats.activeShuttlesCount;
            balanceCards[1].textContent = stats.checkedInStudentsCount;
            balanceCards[2].textContent = `${stats.onTimePerformance}%`;
            balanceCards[3].textContent = stats.activeRoutesCount;
        }
    } catch (e) {
        console.error("Error fetching dashboard stats:", e);
    }

    // Populate Today's Routes from Shuttles tab (Existing logic for the list)
    const shuttleRows = document.querySelectorAll('#shuttles-table tr');
    const todaysTbody = document.querySelector('#todays-routes-table tbody');
    if (todaysTbody) {
        todaysTbody.innerHTML = '';
        shuttleRows.forEach(row => {
            const statusText = row.querySelector('td:nth-child(5) span')?.textContent || '';
            const statusClass = row.querySelector('td:nth-child(5) span')?.className || '';
            const route = row.querySelector('td:nth-child(4)')?.textContent || '';
            const shuttle = row.querySelector('td:nth-child(1)')?.textContent || '';
            const driver = row.querySelector('td:nth-child(2)')?.textContent || '';
            const occupancy = row.querySelector('td:nth-child(6)')?.textContent || '';
            const capacity = occupancy.split('/')[1] || '';

            if (statusText === 'ACTIVE') {
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
    }

    // Populate Recent Activity from backend Activity Logs
    const activityList = document.getElementById('recent-activity-list');
    if (activityList) {
        try {
            const logResponse = await fetch(`${SERVER_URL}/api/activity-logs/recent`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (logResponse.ok) {
                const logs = await logResponse.json();
                activityList.innerHTML = '';
                logs.forEach(log => {
                    const rel = relativeTime(log.timestamp);
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div>${sanitizeHTML(log.message)}</div>
                        <div class="activity-subtitle">${sanitizeHTML(rel)}</div>
                    `;
                    activityList.appendChild(li);
                });
            }
        } catch (e) {
            console.error("Error fetching activity logs:", e);
        }
    }

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
        const route = row.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || "";
        const status = row.querySelector("td:nth-child(5) span")?.textContent.toLowerCase() || "";

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
    const rows = document.querySelectorAll("#drivers-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const driver = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const operator = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
        const license = row.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || "";

        const matchesSearch = driver.includes(searchValue) || operator.includes(searchValue) || license.includes(searchValue);

        if (matchesSearch) {
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

function filterRegistration() {
    const searchValue = document.getElementById("searchRegistration").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilterRegistration").value.toLowerCase();
    const rows = document.querySelectorAll("#registration-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const student = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const grade = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
        const shuttle = row.querySelector("td:nth-child(3)")?.textContent.toLowerCase() || "";

        const matchesSearch = student.includes(searchValue) || grade.includes(searchValue) || shuttle.includes(searchValue);
        let matchesStatus = true;
        if (statusFilter === 'assigned') {
            matchesStatus = !shuttle.includes('not assigned');
        } else if (statusFilter === 'unassigned') {
            matchesStatus = shuttle.includes('not assigned');
        }

        if (matchesSearch && matchesStatus) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-registration-message").style.display = visibleCount === 0 ? "block" : "none";
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

async function downloadBulkTemplate() {
    if (!bulkType) return;
    const type = bulkType === 'students' ? 'students' : 'drivers';
    const endpoint = `${SERVER_URL}/api/admin/bulk-upload/template?type=${type}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bulk_${type}_template.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            const data = await response.json();
            showToast('Failed to download template: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        showToast('Error downloading template: ' + error.message);
    }
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
            const successCount = result.successfulCount || 0;
            const errorCount = result.errorCount || 0;

            if (errorCount === 0) {
                showToast(`Bulk upload successful: ${successCount} entries added`);
                closeBulkUploadModal();
            } else {
                showToast(`Bulk upload finished: ${successCount} success, ${errorCount} errors`);
                // Don't close modal, show errors inside
                errorElement.innerHTML = `<strong>Processed with ${errorCount} errors:</strong><br>` +
                    result.errors.join('<br>');
                errorElement.style.display = 'block';
                errorElement.style.color = '#ff4d4f';
            }

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
            switch (currentDashboardView) {
                case 'drivers': await loadDrivers(); break;
                case 'checkin': await loadCheckInManagement(); break;
                default: updateDashboard(); break;
            }
        } else {
            const data = await response.json();
            showToast('Failed to delete driver: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        showToast('Error deleting driver: ' + error.message);
    }
}

function showRegisterDeviceModal(studentId) {
    const student = allStudentsData.find(s => s.studentId === studentId); // Ensure allStudentsData is populated
    if (!student) return;

    document.getElementById('register-device-student-id').value = studentId;
    document.getElementById('register-device-student-name').value = student.fullName;
    document.getElementById('rfidInput').value = student.rfidTag || '';
    document.getElementById('fingerprintInput').value = student.fingerprintHash || '';
    document.getElementById('register-device-error').style.display = 'none';

    document.getElementById('registerDeviceModal').style.display = 'flex';
}

function closeRegisterDeviceModal() {
    document.getElementById('registerDeviceModal').style.display = 'none';
    document.getElementById('registerDeviceForm').reset();
}

document.getElementById('registerDeviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('register-device-student-id').value;
    const rfidTag = document.getElementById('rfidInput').value;
    const fingerprintHash = document.getElementById('fingerprintInput').value;
    const submitBtn = e.target.querySelector('.submit-btn');
    const errorEl = document.getElementById('register-device-error');

    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
        const response = await fetch(`${SERVER_URL}/api/check-in/register-device/${studentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rfidTag, fingerprintHash })
        });

        const result = await response.json();
        if (response.ok) {
            showToast('Device registered successfully');
            closeRegisterDeviceModal();
            if (currentDashboardView === 'registration') {
                loadRegistration();
            } else {
                loadStudents();
            }
        } else {
            errorEl.textContent = result.error || 'Failed to register device';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorEl.textContent = 'Error connecting to server';
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
});

// =================== LIVE MAP & SIMULATION ===================

async function fetchMapShuttles() {
    if (!token) return;
    try {
        // Use /map endpoint which includes computed ETAs from Mapbox
        const response = await fetch(`${SERVER_URL}/api/shuttles/map`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        updateMapMarkers(data); // /map returns array directly, not Page object
    } catch (e) {
        console.error("Error fetching map shuttles:", e);
    }
}

// Simulated Routes (Lat/Lng arrays) - In real app, these come from DB
const shuttleRoutes = {
    'Shuttle #1': [
        [120.9842, 14.5995], [120.9850, 14.6000], [120.9880, 14.6020],
        [120.9900, 14.6050], [120.9950, 14.6080], [121.0000, 14.6100]
    ],
    'Shuttle #2': [
        [121.0437, 14.6760], [121.0450, 14.6750], [121.0480, 14.6720],
        [121.0500, 14.6700], [121.0550, 14.6650]
    ],
    'Shuttle #3': [
        [121.0813, 14.5580], [121.0800, 14.5550], [121.0750, 14.5500],
        [121.0700, 14.5450]
    ]
};

function updateMapMarkers(shuttlesData) {
    if (!window.dashboardMap || !window.mapboxgl) return;

    // Clear existing markers
    if (window.mapMarkers) {
        window.mapMarkers.forEach(marker => marker.remove());
    }
    window.mapMarkers = [];

    // Clear existing route layers if any (simple clean up)
    if (window.dashboardMap.getLayer('route-line')) {
        window.dashboardMap.removeLayer('route-line');
        window.dashboardMap.removeSource('route-source');
    }

    const listContainer = document.getElementById('active-shuttles-list');
    if (listContainer) listContainer.innerHTML = '';

    // Store data globally for marker updates
    window.lastShuttleData = shuttlesData;

    shuttlesData.forEach(shuttle => {
        // Only show shuttles with valid location
        if (shuttle.latitude !== null && shuttle.longitude !== null && shuttle.latitude !== undefined && shuttle.longitude !== undefined) {

            // Add to list
            if (listContainer) {
                const item = document.createElement('div');
                item.className = 'shuttle-item';
                // Fix: Handle nested driver.user.username if structure differs
                let driverName = 'No Driver';
                if (shuttle.driver) {
                    if (shuttle.driver.username) driverName = shuttle.driver.username;
                    else if (shuttle.driver.user && shuttle.driver.user.username) driverName = shuttle.driver.user.username;
                }
                item.setAttribute('data-shuttle-id', shuttle.shuttleId);
                item.innerHTML = `
                    <p><strong>${sanitizeHTML(shuttle.name)}</strong> - ${sanitizeHTML(shuttle.status)}<br>
                    Lat: ${shuttle.latitude}, Lng: ${shuttle.longitude}<br>
                    Driver: ${sanitizeHTML(driverName)}<br>
                    Route: ${sanitizeHTML(shuttle.route)}<br>
                    <strong><span id="eta-display-${shuttle.shuttleId}">ETA: ${shuttle.eta || 'Calculating...'}</span></strong></p>
                    <button class="action-btn track-btn" onclick="trackShuttle(${shuttle.shuttleId}, ${shuttle.latitude}, ${shuttle.longitude})">Track</button>
                    <button class="action-btn eta-details-btn" onclick="showStudentETAs(${shuttle.shuttleId})">ETA Details</button>
                `;
                listContainer.appendChild(item);
            }

            // Add Marker
            const markerElement = document.createElement('div');
            markerElement.style.backgroundColor = shuttle.status === 'INACTIVE' ? '#666' : '#003A6C';
            markerElement.style.width = '30px';
            markerElement.style.height = '30px';
            markerElement.style.borderRadius = '50%';
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.justifyContent = 'center';
            markerElement.style.cursor = 'pointer';
            markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            markerElement.innerHTML = '<i class="fa-solid fa-bus" style="color: #F5F5F5; font-size: 18px;"></i>';

            // Hover effects
            markerElement.addEventListener('mouseenter', () => {
                markerElement.style.backgroundColor = shuttle.status === 'INACTIVE' ? '#999' : '#0066CC';
            });
            markerElement.addEventListener('mouseleave', () => {
                markerElement.style.backgroundColor = shuttle.status === 'INACTIVE' ? '#666' : '#003A6C';
            });

            const popup = new mapboxgl.Popup().setHTML(`
                <h3>${sanitizeHTML(shuttle.name)}</h3>
                <p>Status: ${sanitizeHTML(shuttle.status)}</p>
                <p>Driver: ${shuttle.driver ? shuttle.driver.username : 'N/A'}</p>
                <p>Route: ${sanitizeHTML(shuttle.route)}</p>
            `);

            const marker = new mapboxgl.Marker({ element: markerElement })
                .setLngLat([shuttle.longitude, shuttle.latitude])
                .setPopup(popup)
                .addTo(window.dashboardMap);

            window.mapMarkers.push(marker);

            // New: Destination Marker
            if (shuttle.destinationLatitude && shuttle.destinationLongitude) {
                const destEl = document.createElement('div');
                destEl.style.color = '#ff4d4f'; // Red
                destEl.style.fontSize = '24px';
                destEl.innerHTML = '<i class="fa-solid fa-flag-checkered"></i>';

                const destMarker = new mapboxgl.Marker({ element: destEl })
                    .setLngLat([shuttle.destinationLongitude, shuttle.destinationLatitude])
                    .setPopup(new mapboxgl.Popup().setHTML(`<b>${sanitizeHTML(shuttle.name)} Destination</b>`))
                    .addTo(window.dashboardMap);

                destMarker.isDestination = true;
                destMarker.markerShuttleId = shuttle.shuttleId;
                window.mapMarkers.push(destMarker);
            }
        }
    });

    if (listContainer.children.length === 0) {
        listContainer.innerHTML = '<p>No active shuttles with location data.</p>';
    }
}

// New: Auto-restore state on map load/refresh
function restoreTrackingState(shuttles) {
    const lastId = localStorage.getItem('lastTrackedShuttleId');
    if (lastId) {
        const shuttle = shuttles.find(s => s.shuttleId == lastId);
        if (shuttle && shuttle.latitude && shuttle.longitude) {
            console.log("Restoring tracking for Shuttle #" + lastId);
            trackShuttle(shuttle.shuttleId, shuttle.latitude, shuttle.longitude);
        }
    }
}


// Global locations for routing
// Global locations for routing
let lastShuttleLoc = null;
let lastStudentLoc = null;
let currentWaypoints = []; // New: Store waypoints for multi-stop routing
let currentTrackedStudents = []; // New: To sync student popups with route legs
let lastSyncedETA = null; // New: To sync modal with latest Mapbox ETA
let individualStudentETAs = {}; // New: Store individual ETAs for waypoints

// Track Shuttle
async function trackShuttle(id, lat, lng) {
    if (window.dashboardMap) {
        window.dashboardMap.flyTo({ center: [lng, lat], zoom: 14 });

        // Reset sync state for new shuttle
        lastSyncedETA = null;
        currentTrackedStudents = [];
        individualStudentETAs = {};

        // Save state
        localStorage.setItem('lastTrackedShuttleId', id);

        // Save for Directions API
        lastShuttleLoc = [parseFloat(lng), parseFloat(lat)];

        // Fetch latest details to get the Target Student Location
        try {
            const response = await fetch(`${SERVER_URL}/api/shuttles/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();

                // 1. Set global "Target" student (for route line)
                // 1. Set global "Target" student (for route line)
                if (data.destinationLatitude && data.destinationLongitude) {
                    // Prioritize manually set destination
                    lastStudentLoc = [parseFloat(data.destinationLongitude), parseFloat(data.destinationLatitude)];
                } else if (data.targetLatitude && data.targetLongitude) {
                    lastStudentLoc = [parseFloat(data.targetLongitude), parseFloat(data.targetLatitude)];
                }

                // 2. Clear old student markers
                if (window.studentMarkers) {
                    window.studentMarkers.forEach(m => m.remove());
                }
                window.studentMarkers = [];

                // 3. Visualize ALL assigned students
                if (data.assignedStudentLocations && Array.isArray(data.assignedStudentLocations)) {
                    // Fetch student ETAs from the new endpoint
                    let studentETAs = [];
                    try {
                        const etaResponse = await fetch(`${SERVER_URL}/api/eta/shuttle/${id}/students`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (etaResponse.ok) {
                            const etaData = await etaResponse.json();
                            studentETAs = etaData.students || [];
                        }
                    } catch (etaError) {
                        console.error("Error fetching student ETAs:", etaError);
                    }

                    currentTrackedStudents = data.assignedStudentLocations;

                    data.assignedStudentLocations.forEach((stud, index) => {
                        const el = document.createElement('div');
                        el.className = 'student-pin';
                        el.style.backgroundColor = '#4CAF50'; // Green
                        el.style.width = '15px';
                        el.style.height = '15px';
                        el.style.borderRadius = '50%';
                        el.style.border = '2px solid white';

                        // Find ETA for this student
                        const studentETA = studentETAs.find(s => s.studentId === stud.studentId);
                        const etaDisplay = studentETA ? studentETA.eta : 'Calculating...';

                        const marker = new mapboxgl.Marker(el)
                            .setLngLat([stud.longitude, stud.latitude])
                            .setPopup(new mapboxgl.Popup().setHTML(`
                                <b>${stud.name}</b><br>
                                ID: ${stud.studentId}<br>
                                <strong id="student-eta-${stud.studentId}">ETA: ${etaDisplay}</strong>
                            `))
                            .addTo(window.dashboardMap);

                        marker.studentId = stud.studentId;
                        marker.studentIndex = index;
                        window.studentMarkers.push(marker);
                    });
                    showToast(`Showing ${data.assignedStudentLocations.length} student locations with ETAs.`);

                    // 4. Set Waypoints for Routing (Route to all students)
                    // Strategy: Origin=Shuttle -> Waypoints=Students[0..N-1] -> Destination=Students[N]
                    if (data.assignedStudentLocations.length > 0) {
                        currentWaypoints = data.assignedStudentLocations.map(s => [s.longitude, s.latitude]);
                    } else {
                        currentWaypoints = [];
                    }
                }
            }
        } catch (e) {
            console.error("Error fetching shuttle details for tracking", e);
        }

        updateDirectionRoute();

        let shuttleName = `Shuttle #${id}`;
        drawRoute(shuttleName, [lng, lat]);
        showToast(`Tracking Shuttle #${id}`);
    }
}

function updateDirectionRoute() {
    console.log("updateDirectionRoute called. Shuttle:", lastShuttleLoc, "Waypoints:", currentWaypoints.length, "Destination:", lastStudentLoc);
    if (window.mapDirections && lastShuttleLoc) {
        // Ensure origin is number
        const origin = [parseFloat(lastShuttleLoc[0]), parseFloat(lastShuttleLoc[1])];
        window.mapDirections.setOrigin(origin);

        // Clear existing waypoints by removing them (mapbox-gl-directions quirk)
        // The removeWaypoint method needs indices, so we loop backwards
        try {
            const waypointCount = window.mapDirections.getWaypoints().length;
            for (let i = waypointCount - 1; i >= 0; i--) {
                window.mapDirections.removeWaypoint(i);
            }
        } catch (e) {
            console.log("Could not clear waypoints:", e);
        }

        // Set Destination: Driver Destination (lastStudentLoc now holds this)
        if (lastStudentLoc) {
            const dest = [parseFloat(lastStudentLoc[0]), parseFloat(lastStudentLoc[1])];
            window.mapDirections.setDestination(dest);
        }

        // Add ALL students as waypoints (intermediate stops)
        if (currentWaypoints.length > 0) {
            for (let i = 0; i < currentWaypoints.length; i++) {
                window.mapDirections.addWaypoint(i, currentWaypoints[i]);
            }
            showToast(`Route: Shuttle → ${currentWaypoints.length} Students → Destination`);
        } else if (lastStudentLoc) {
            showToast("Route: Shuttle → Destination");
        } else {
            showToast("No destination set. Use Driver Simulation to set one.");
        }
    } else {
        console.log("mapDirections not ready or shuttle location unknown.");
    }
}

// =================== SYNC ETA FROM MAPBOX DIRECTIONS (TEST) ===================
// Listen for route updates from Mapbox Directions and update the Active Shuttles ETA
function setupMapDirectionsSync() {
    if (window.mapDirections) {
        window.mapDirections.on('route', function (e) {
            if (e.route && e.route.length > 0) {
                const route = e.route[0];
                const distanceKm = (route.distance / 1000).toFixed(1);
                const durationMin = Math.round(route.duration / 60);

                let formattedTotalETA;
                if (durationMin >= 60) {
                    const hours = Math.floor(durationMin / 60);
                    const mins = durationMin % 60;
                    formattedTotalETA = `${distanceKm}km ${hours}h ${mins}min`;
                } else {
                    formattedTotalETA = `${distanceKm}km ${durationMin}min`;
                }

                // 1. Calculate individual ETAs for each waypoint (student)
                individualStudentETAs = {};
                if (route.legs && route.legs.length > 1) {
                    let cumulativeDist = 0;
                    let cumulativeDur = 0;

                    // Each leg i leads to waypoint i (Student i)
                    route.legs.forEach((leg, index) => {
                        cumulativeDist += leg.distance;
                        cumulativeDur += leg.duration;

                        if (index < route.legs.length - 1 && currentTrackedStudents[index]) {
                            const student = currentTrackedStudents[index];
                            const dKm = (cumulativeDist / 1000).toFixed(1);
                            const dMin = Math.round(cumulativeDur / 60);

                            let studentETA;
                            if (dMin >= 60) {
                                const h = Math.floor(dMin / 60);
                                const m = dMin % 60;
                                studentETA = `${dKm}km ${h}h ${m}min`;
                            } else {
                                studentETA = `${dKm}km ${dMin}min`;
                            }
                            individualStudentETAs[student.studentId] = studentETA;
                        }
                    });
                }

                // 2. Update the tracked shuttle's status and markers
                const trackedShuttleId = localStorage.getItem('lastTrackedShuttleId');
                if (trackedShuttleId) {
                    lastSyncedETA = formattedTotalETA;
                    updateShuttleETADisplay(trackedShuttleId, formattedTotalETA);

                    // 2. Update ALL markers for this shuttle (Students get specific, Destination gets total)
                    syncAllMarkersWithETA(trackedShuttleId, formattedTotalETA);

                    // 3. Refresh the ETA Details modal if it's open
                    refreshStudentETAModal(trackedShuttleId, formattedTotalETA);
                }

                console.log("Mapbox Directions Sync: All markers updated.");
            }
        });
        console.log("Mapbox Directions sync listener attached.");
    }
}

// Update all markers with individual or total ETAs
function syncAllMarkersWithETA(shuttleId, totalETA) {
    // Update Student Markers with their specific ETAs
    if (window.studentMarkers) {
        window.studentMarkers.forEach(marker => {
            const student = currentTrackedStudents.find(s => s.studentId === marker.studentId);
            if (student) {
                const individualETA = individualStudentETAs[student.studentId];
                const displayETA = individualETA || totalETA;
                const label = individualETA ? "Arrives in:" : "Total Route ETA:";

                marker.getPopup().setHTML(`
                    <b>${sanitizeHTML(student.name)}</b><br>
                    ID: ${student.studentId}<br>
                    <strong style="color: #28a745;">${label} ${displayETA}</strong>
                `);
            }
        });
    }

    // Update Destination Marker
    if (window.mapMarkers) {
        const destMarker = window.mapMarkers.find(m => m.isDestination && m.markerShuttleId == shuttleId);
        if (destMarker) {
            const shuttle = window.lastShuttleData ? window.lastShuttleData.find(s => s.shuttleId == shuttleId) : null;
            const name = shuttle ? shuttle.name : 'Shuttle';
            destMarker.getPopup().setHTML(`
                <b>${sanitizeHTML(name)} Destination</b><br>
                <strong style="color: #28a745;">Total Route ETA: ${totalETA}</strong>
            `);
        }
    }
}

// Update the ETA display for a specific shuttle in the Active Shuttles list
function updateShuttleETADisplay(shuttleId, eta) {
    const etaElement = document.getElementById(`eta-display-${shuttleId}`);
    if (etaElement) {
        etaElement.textContent = `ETA: ${eta}`;
        etaElement.style.color = '#28a745'; // Green to indicate it's synced with Mapbox
    }
}

// Refresh the student ETA modal if it's currently open for the tracked shuttle
function refreshStudentETAModal(shuttleId, totalETA) {
    const modal = document.getElementById('eta-details-modal');
    if (modal && modal.style.display === 'block') {
        const body = document.getElementById('eta-details-body');
        const items = body.querySelectorAll('.student-eta-item');

        items.forEach(item => {
            const studentId = item.dataset.studentId;
            const etaElement = item.querySelector('.eta-value');
            if (etaElement) {
                const individualETA = individualStudentETAs[studentId] || totalETA;
                const label = individualStudentETAs[studentId] ? "Arrives in:" : "Total Route ETA:";
                etaElement.textContent = `${label} ${individualETA}`;
                etaElement.style.color = '#28a745';
                etaElement.style.fontWeight = 'bold';
            }
        });
        console.log("ETA Details modal refreshed with individual ETAs.");
    }
}

// Initialize sync when map is ready (called from index.html after map loads)
if (typeof window !== 'undefined') {
    window.setupMapDirectionsSync = setupMapDirectionsSync;
}

function drawRoute(shuttleName, currentPos) {
    const routeCoords = shuttleRoutes[shuttleName];
    if (!routeCoords) return;

    const map = window.dashboardMap;

    // Remove if exists
    if (map.getLayer('route-line')) {
        map.removeLayer('route-line');
        map.removeSource('route-source');
    }

    // Add Route Source
    map.addSource('route-source', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': routeCoords
            }
        }
    });

    // Add Route Layer
    map.addLayer({
        'id': 'route-line',
        'type': 'line',
        'source': 'route-source',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#003A6C', // Shuttle Blue
            'line-width': 6,
            'line-opacity': 0.8
        }
    });

    // Fit bounds 
    const bounds = new mapboxgl.LngLatBounds();
    routeCoords.forEach(coord => bounds.extend(coord));
    bounds.extend(currentPos);
    map.fitBounds(bounds, { padding: 50 });
}

async function simulateLocationUpdate() {
    const id = document.getElementById('sim-shuttle-id').value;
    const lat = document.getElementById('sim-lat').value;
    const lng = document.getElementById('sim-lng').value;

    if (!id || !lat || !lng) {
        showToast("Please enter Student ID, Latitude, and Longitude");
        return;
    }

    // Ensure student is assigned to a shuttle (so they show up in tracking)
    await checkAndAssignShuttle(id);

    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/${id}/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });

        const data = await response.json();


        if (response.ok) {
            showToast("Location updated! ETA: " + (data.eta || "Calculating..."));

            // Get currently tracked shuttle ID from localStorage
            const trackedShuttleId = localStorage.getItem('lastTrackedShuttleId');

            // Backend-driven Routing: Use target coordinates if provided
            if (data.targetLatitude && data.targetLongitude) {
                lastStudentLoc = [parseFloat(data.targetLongitude), parseFloat(data.targetLatitude)];
                console.log("Backend provided target student location:", lastStudentLoc);
            }

            // Update lastShuttleLoc and refresh route ONLY if this shuttle is being tracked
            if (window.dashboardMap && id == trackedShuttleId) {
                // Convert to numbers just in case
                lastShuttleLoc = [parseFloat(lng), parseFloat(lat)];
                updateDirectionRoute();
            }
            fetchMapShuttles(); // Refresh map (markers, etc.)
        } else {
            showToast("Error: " + (data.error || "Failed"));
        }
    } catch (e) {
        console.error(e);
        showToast("Network Error");
    }
}

async function checkAndAssignShuttle(studentId) {
    // Helper to ensure student is assigned to a shuttle so they appear on map
    try {
        const response = await fetch(`${SERVER_URL}/api/students/${studentId}/assigned-shuttle`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            if (!data.assignedShuttleId) {
                // Auto-assign to Shuttle #1 for simulation purposes
                // Ideally we'd ask the user, but for this simulation we want it to "just work"
                // Assuming Shuttle #1 exists or active shuttles exist
                if (window.shuttles && window.shuttles.length > 0) {
                    const targetShuttleId = window.shuttles[0].shuttleId;
                    await fetch(`${SERVER_URL}/api/students/${studentId}/assigned-shuttle`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ shuttleId: targetShuttleId })
                    });
                    console.log(`Auto-assigned Student ${studentId} to Shuttle ${targetShuttleId}`);
                    showToast(`Student assigned to Shuttle #${targetShuttleId}`);
                }
            }
        }
    } catch (e) {
        console.error("Auto-assign check failed", e);
    }
}

// Global hook for refreshMap in index.html to call
window.refreshMap = function () {
    if (window.dashboardMap) window.dashboardMap.resize();
    fetchMapShuttles();
    showToast('Map refreshed & Data synced');
};

async function simulateStudentLocation() {
    const id = document.getElementById('sim-stud-id').value;
    const lat = document.getElementById('sim-stud-lat').value;
    const lng = document.getElementById('sim-stud-lng').value;

    if (!id || !lat || !lng) {
        showToast("Please enter Student ID, Latitude, and Longitude");
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/students/${id}/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Student Pin Set!");

            // Visual feedback: Add a temporary marker for the student
            if (window.dashboardMap) {
                const el = document.createElement('div');
                el.className = 'student-pin';
                el.style.backgroundColor = '#4CAF50';
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';

                new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .setPopup(new mapboxgl.Popup().setHTML('<b>Student #' + id + '</b><br>Location Pinned'))
                    .addTo(window.dashboardMap);
            }

            // Sync with Directions API ONLY if student is assigned to currently tracked shuttle
            const trackedShuttleId = localStorage.getItem('lastTrackedShuttleId');

            if (data.assignedShuttleId == trackedShuttleId) {
                const numLat = parseFloat(lat);
                const numLng = parseFloat(lng);
                lastStudentLoc = [numLng, numLat];
                console.log("Student Pin: update route (matching shuttle " + trackedShuttleId + ")");
                updateDirectionRoute();
            } else {
                console.log("Student Pin: skip route update (student assigned to " + data.assignedShuttleId + ", tracking " + trackedShuttleId + ")");
            }

        } else {
            showToast("Error: " + (data.error || "Failed"));
        }
    } catch (e) {
        console.error(e);
        showToast("Network Error");
    }
}

async function simulateDriverDestination() {
    const id = document.getElementById('sim-dest-shuttle-id').value;
    const lat = document.getElementById('sim-dest-lat').value;
    const lng = document.getElementById('sim-dest-lng').value;

    if (!id || !lat || !lng) {
        showToast("Please enter Shuttle ID, Latitude, and Longitude");
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/${id}/destination`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Destination Set!");
            fetchMapShuttles();
        } else {
            showToast("Error: " + (data.error || "Failed"));
        }
    } catch (e) {
        console.error(e);
        showToast("Network Error");
    }
}

// New: Fetch and display ALL student locations (Persistent View)
async function fetchStudentLocations() {
    try {
        const response = await fetch(`${SERVER_URL}/api/students/locations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const locations = await response.json();
            console.log(`Fetched ${locations.length} student locations.`);

            // Clear existing global markers if any (optional, depending on behavior)
            // For now, we just add them to ensuring they are visible

            locations.forEach(stud => {
                const el = document.createElement('div');
                el.className = 'student-pin-persistent'; // Class for easier identifying
                el.style.backgroundColor = '#4CAF50'; // Green
                el.style.width = '15px';
                el.style.height = '15px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';
                el.style.cursor = 'pointer';

                new mapboxgl.Marker(el)
                    .setLngLat([stud.longitude, stud.latitude])
                    .setPopup(new mapboxgl.Popup().setHTML(`<b>${stud.name}</b><br>ID: ${stud.studentId}<br>Assigned Shuttle: ${stud.assignedShuttleId || 'None'}`))
                    .addTo(window.dashboardMap);
            });
        }
    } catch (e) {
        console.error("Error fetching student locations:", e);
    }
}

// Initialization Logic
// Ensure map is loaded before restoring state
if (window.dashboardMap) {
    window.dashboardMap.on('load', () => {
        console.log("Map loaded. Fetching shuttles and students...");
        fetchMapShuttles();
        fetchStudentLocations(); // Load student pins immediately
        // Restore state check is inside fetchMapShuttles -> restoreTrackingState
    });
} else {
    // Fallback if map isn't ready immediately (though index.html sets it)
    setTimeout(() => {
        if (window.dashboardMap) {
            console.log("Map check (delayed). Fetching shuttles and students...");
            fetchMapShuttles();
            fetchStudentLocations(); // Load student pins immediately
        }

    }, 1000);
}

// =================== ETA DETAILS MODAL ===================

/**
 * Show a modal with student ETA details for a specific shuttle.
 * Fetches ETAs from /api/eta/shuttle/{id}/students
 */
async function showStudentETAs(shuttleId) {
    // Create or get existing modal
    let modal = document.getElementById('eta-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'eta-details-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content eta-modal-content">
                <div class="modal-header">
                    <h2>ETA Details</h2>
                    <button class="close-btn eta-close-btn" onclick="closeEtaDetailsModal()">&times;</button>
                </div>
                <div class="modal-body" id="eta-details-body">
                    <p>Loading student ETAs...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Show modal
    modal.style.display = 'block';
    const body = document.getElementById('eta-details-body');
    body.innerHTML = '<p>Loading student ETAs...</p>';

    try {
        const response = await fetch(`${SERVER_URL}/api/eta/shuttle/${shuttleId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            body.innerHTML = '<p class="error">Failed to load ETA details.</p>';
            return;
        }

        const data = await response.json();

        if (data.students && data.students.length > 0) {
            let html = `<h3>${data.shuttleName || 'Shuttle'} - Student ETAs</h3>`;
            html += '<div class="student-eta-list">';

            const trackedShuttleId = localStorage.getItem('lastTrackedShuttleId');
            const isSynced = (trackedShuttleId == shuttleId && lastSyncedETA);

            data.students.forEach(student => {
                const individualETA = isSynced ? (individualStudentETAs[student.studentId] || lastSyncedETA) : (student.eta || 'Unknown');
                const etaStyle = isSynced ? 'style="color: #28a745; font-weight: bold;"' : '';
                const label = isSynced ? (individualStudentETAs[student.studentId] ? 'Arrives in:' : 'Total Route ETA:') : 'ETA:';

                html += `
                    <div class="student-eta-item" data-student-id="${student.studentId}">
                        <strong>${sanitizeHTML(student.name)}</strong><br>
                        <span>ID: ${student.studentId}</span><br>
                        <span class="eta-value" ${etaStyle}>${label} ${individualETA}</span>
                    </div>
                `;
            });

            html += '</div>';
            html += `<p class="eta-updated">Updated: ${new Date(data.updatedAt).toLocaleTimeString()}</p>`;
            body.innerHTML = html;
        } else {
            body.innerHTML = '<p>No students assigned to this shuttle.</p>';
        }
    } catch (error) {
        console.error('Error fetching student ETAs:', error);
        body.innerHTML = '<p class="error">Error loading ETA details.</p>';
    }
}

function closeEtaDetailsModal() {
    const modal = document.getElementById('eta-details-modal');
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('eta-details-modal');
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
});

// =================== ETA POLLING (Mapbox API) ===================
let etaPollInterval = null;
const ETA_POLL_INTERVAL_MS = 300000; // 5 minutes

/**
 * Fetch real-time ETA for a specific shuttle using Mapbox API.
 * Updates the ETA display in the Active Shuttles list.
 */
async function fetchShuttleETA(shuttleId) {
    try {
        const response = await fetch(`${SERVER_URL}/api/eta/shuttle/${shuttleId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            console.log(`ETA for Shuttle #${shuttleId}: ${data.eta}`);
            return data.eta;
        }
    } catch (e) {
        console.error(`Error fetching ETA for shuttle ${shuttleId}:`, e);
    }
    return null;
}

/**
 * Fetch ETAs for all assigned students of a shuttle.
 * Returns an array of {studentId, name, eta, distance, duration}.
 */
async function fetchStudentETAs(shuttleId) {
    try {
        const response = await fetch(`${SERVER_URL}/api/eta/shuttle/${shuttleId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            console.log(`Student ETAs for Shuttle #${shuttleId}:`, data.students);
            return data.students || [];
        }
    } catch (e) {
        console.error(`Error fetching student ETAs for shuttle ${shuttleId}:`, e);
    }
    return [];
}

/**
 * Start polling for ETA updates.
 * Polls every 5 minutes for the currently tracked shuttle.
 */
function startEtaPolling() {
    if (etaPollInterval) return;

    etaPollInterval = setInterval(async () => {
        const trackedShuttleId = localStorage.getItem('lastTrackedShuttleId');
        if (trackedShuttleId) {
            console.log(`ETA Poll: Refreshing ETA for Shuttle #${trackedShuttleId}`);
            fetchMapShuttles(); // Refresh all shuttle data including ETAs
        }
    }, ETA_POLL_INTERVAL_MS);

    console.log(`ETA polling started (interval: ${ETA_POLL_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop ETA polling.
 */
function stopEtaPolling() {
    if (etaPollInterval) {
        clearInterval(etaPollInterval);
        etaPollInterval = null;
        console.log("ETA polling stopped");
    }
}

// Start ETA polling when map is ready
if (window.dashboardMap) {
    startEtaPolling();
} else {
    setTimeout(() => {
        if (window.dashboardMap) {
            startEtaPolling();
        }
    }, 2000);
}

// =================== HARDWARE AUTO-SAVE ===================
let hardwarePollInterval = null;

function startHardwarePolling() {
    if (hardwarePollInterval) return;
    hardwarePollInterval = setInterval(pollHardwareInput, 1500);
    console.log("Hardware polling started");
}

function stopHardwarePolling() {
    if (hardwarePollInterval) {
        clearInterval(hardwarePollInterval);
        hardwarePollInterval = null;
        console.log("Hardware polling stopped");
    }
}

async function pollHardwareInput() {
    try {
        const res = await fetch(`${SERVER_URL}/api/hardware/latest`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const rfidInput = document.getElementById('rfidInput');
            const fingerprintInput = document.getElementById('fingerprintInput');

            let updated = false;

            // Handle RFID
            if (data.rfid && rfidInput) {
                rfidInput.value = data.rfid;
                rfidInput.style.backgroundColor = '#e8f0fe';
                updated = true;
            }

            // Handle Fingerprint
            if (data.fingerprint && fingerprintInput) {
                fingerprintInput.value = data.fingerprint;
                fingerprintInput.style.backgroundColor = '#e8f0fe';
                updated = true;
            }

            // Auto-submit if we have incoming data and both fields are valid
            if (updated && rfidInput && fingerprintInput && rfidInput.value && fingerprintInput.value) {
                const btn = document.querySelector('#registerDeviceForm .submit-btn');
                if (btn && !btn.disabled) {
                    console.log("Auto-submitting hardware registration...");
                    btn.click();
                    showToast("Device registered automatically from hardware scan");
                }
            }
        }
    } catch (e) {
        console.error("Hardware polling error", e);
    }
}

// Observer to auto-start polling when Register Device modal opens
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('registerDeviceModal');
    if (modal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const display = window.getComputedStyle(modal).display;
                    if (display !== 'none') {
                        startHardwarePolling();
                    } else {
                        stopHardwarePolling();
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true });
    }
});

async function simulateHardwareScan(type) {
    const value = type === 'rfid' ? 'RFID-' + Math.floor(Math.random() * 1000000) : 'FP-' + Math.floor(Math.random() * 1000000);
    try {
        const res = await fetch(`${SERVER_URL}/api/hardware/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, value })
        });
        if (res.ok) {
            showToast(`Simulated ${type.toUpperCase()} scan sent`);
        } else {
            showToast("Simulation failed");
        }
    } catch (e) {
        console.error(e);
        showToast("Simulation network error");
    }
}


// CheckIn Management Logic
async function loadCheckInManagement() {
    console.log("Loading Check-In Management...");
    const tableBody = document.getElementById("checkin-table");
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    try {
        const response = await fetch(`${SERVER_URL}/api/check-in/all`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch check-ins");
        const checkIns = await response.json();

        // Filter based on input
        const searchInput = document.getElementById("searchCheckIn");
        const statusFilterInput = document.getElementById("statusFilterCheckIn");
        const searchValue = searchInput ? searchInput.value.toLowerCase() : "";
        const statusFilter = statusFilterInput ? statusFilterInput.value : "all"; // Values: all, Checked In, Checked Out

        tableBody.innerHTML = '';
        let visibleCount = 0;

        checkIns.forEach(record => {
            const studentName = record.student.user.fullName || record.student.user.username;
            const shuttleName = record.shuttle.name;
            const status = record.status;
            const type = record.type;

            let displayStatus = "Unknown";
            if (status === 'success') {
                displayStatus = type === 'in' ? 'Checked In' : 'Checked Out';
            } else {
                displayStatus = 'Failed';
            }

            const time = new Date(record.timestamp).toLocaleString();
            // Location from shuttle
            const lat = record.shuttle.latitude !== null ? record.shuttle.latitude.toFixed(6) : "?";
            const lng = record.shuttle.longitude !== null ? record.shuttle.longitude.toFixed(6) : "?";
            const locationStr = "Lat: " + lat + ", Lng: " + lng;

            // Logic to handle filter
            // Option values are "Checked In", "Checked Out". "Not Boarded" (not applicable here yet)
            // Case sensitive match with option value
            if (statusFilter !== 'all' && displayStatus !== statusFilter) return;
            if (!studentName.toLowerCase().includes(searchValue)) return;

            visibleCount++;
            const tr = document.createElement('tr');

            let badgeClass = 'badge-not-boarded';
            if (displayStatus === 'Checked In') badgeClass = 'badge-checked-in';
            if (displayStatus === 'Checked Out') badgeClass = 'badge-checked-out';
            if (displayStatus === 'Failed') badgeClass = 'badge-maintenance';

            // REMOVED Actions Column TD
            tr.innerHTML = `
                 <td>${sanitizeHTML(studentName)}</td>
                 <td>${sanitizeHTML(shuttleName)}</td>
                 <td><span class="status-badge ${badgeClass}">${displayStatus}</span></td>
                 <td>
                    <div style="display:flex; flex-direction:column;">
                        <span>${time}</span>
                        <span style="font-size: 0.8em; color: gray;"><i class="fa-solid fa-map-marker-alt"></i> ${locationStr}</span>
                    </div>
                 </td>
             `;
            tableBody.appendChild(tr);
        });

        const noMsg = document.getElementById("no-checkin-message");
        if (noMsg) noMsg.style.display = visibleCount === 0 ? "block" : "none";

        loadShuttlesForSimulation();

    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
}

function filterCheckIn() {
    loadCheckInManagement();
}

// Fixed filterStudents to NOT use non-existent statusFilter
function filterStudents() {
    const searchValue = document.getElementById("searchStudents").value.toLowerCase();

    const rows = document.querySelectorAll("#students-table tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const student = row.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
        const parent = row.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
        const shuttle = row.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || ""; // Shuttle col might be different index if Contact is 3rd.
        // Table Header: Student, Parent/Guardian, Contact, Actions. (4 cols)
        // Wait, where is Shuttle info in Students table?
        // JS line 942 said "td:nth-child(4)".
        // If row has: 1=Student, 2=Parent, 3=Contact. 4=Actions.
        // Then line 942 reads 'Actions' as 'shuttle'??
        // And line 943 reads 'status' from child 5 (non-existent).
        // It seems filterStudents was ALREADY broken or I misread the table structure.
        // Let's assume for now we just filter by Search Value on text content.

        // Robust search: Just check row text
        const rowText = row.textContent.toLowerCase();

        if (rowText.includes(searchValue)) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById("no-students-message").style.display = visibleCount === 0 ? "block" : "none";
}

async function loadShuttlesForSimulation() {
    const select = document.getElementById('sim-shuttle-select');
    if (!select) return;
    if (select.options.length > 1) return;

    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/all?page=0&size=100`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            data.content.forEach(shuttle => {
                const opt = document.createElement('option');
                opt.value = shuttle.shuttleId;
                opt.textContent = `${shuttle.name} (${shuttle.licensePlate || 'No Plate'})`;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error("Error loading simulator shuttles", e); }
}

let pendingVerification = null; // Store pending check-in context

async function simulateCheckInScan(type) {
    const shuttleId = document.getElementById('sim-shuttle-select').value;
    if (!shuttleId) {
        showToast("Please select a shuttle context first!");
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/shuttles/${shuttleId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        const students = data.assignedStudentLocations || [];

        if (students.length === 0) {
            showToast("No students assigned to this shuttle to simulate!");
            return;
        }

        // 2FA Simulation Logic
        if (type === 'rfid') {
            const student = students[Math.floor(Math.random() * students.length)];
            const studRes = await fetch(`${SERVER_URL}/api/students/${student.studentId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const fullStudent = await studRes.json();

            if (!fullStudent.rfidTag) {
                showToast(`Student ${student.name} has no RFID tag!`);
                return;
            }

            pendingVerification = {
                studentId: student.studentId,
                name: student.name,
                rfid: fullStudent.rfidTag,
                fingerprint: fullStudent.fingerprintHash,
                shuttleId: shuttleId
            };

            showToast(`RFID Scanned: ${student.name}. Please scan Fingerprint.`);

            const simHeader = document.querySelector('#checkin-hardware-simulator h4');
            if (simHeader) simHeader.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Waiting for Fingerprint...';

        } else if (type === 'fingerprint') {
            if (!pendingVerification) {
                showToast("Please Scan RFID first!");
                return;
            }

            if (!pendingVerification.fingerprint) {
                showToast(`Student ${pendingVerification.name} has no Fingerprint registered!`);
                pendingVerification = null;
                resetSimHeader();
                return;
            }

            showToast(`Scanning Fingerprint for ${pendingVerification.name}...`);

            const scanRes = await fetch(`${SERVER_URL}/api/check-in/secure-scan`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    rfid: pendingVerification.rfid,
                    fingerprint: pendingVerification.fingerprint, // Matching
                    shuttleId: pendingVerification.shuttleId
                })
            });

            const scanResult = await scanRes.json();
            if (scanRes.ok) {
                showToast(scanResult.message);
                loadCheckInManagement();
                pendingVerification = null;
                resetSimHeader();
            } else {
                showToast("Scan Failed: " + (scanResult.error || "Unknown"));
                pendingVerification = null;
                resetSimHeader();
            }
        }

    } catch (e) {
        showToast("Simulation Error: " + e.message);
        pendingVerification = null;
        resetSimHeader();
    }
}

function resetSimHeader() {
    const simHeader = document.querySelector('#checkin-hardware-simulator h4');
    if (simHeader) simHeader.innerHTML = '<i class="fa-solid fa-microchip"></i> Hardware Simulator';
}
