const SERVER_URL = "http://localhost:8080"; // Change to "http://152.42.192.226:8080" for server testing

let users = [];
let expenses = [];
let budgetRequests = [];
let liquidations = [];
let token = null;
let selectedUserIndex = null;
let userDetailsPopup = null;
let selectedBudgetIndex = null;
let selectedLiquidationIndex = null;
let currentExpenseImages = [];
let currentImageIndex = 0;
let zoomLevel = 1;
let panX = 0, panY = 0;
let isDragging = false;
let startX = 0, startY = 0;
let categoryChart, userChart, monthlySpendingChart;
let currentUser = null;
let currentUserId = null;
let pendingBudgetAction = null;
let pendingLiquidationAction = null;
let currentPopupType = null; // 'expense' or 'liquidation'
let currentExpenseId = null;
let pendingBudgetDeleteId = null;
let pendingExpenseDeleteId = null;
let pendingLiquidationDeleteId = null;
const DEFAULT_USER_SORT = "createdAt-desc";


// Function to sanitize input to prevent XSS
function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/&/g, '&amp;');
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
    if (categoryChart) categoryChart.destroy();
    if (userChart) userChart.destroy();
    if (monthlySpendingChart) monthlySpendingChart.destroy();
    document.getElementById("admin-profile-picture").src = "images/default-profile.png";
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

// Update sidebar username and email when showing profile
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

// =================== USER MODAL ===================
function openUserModal() {
    document.getElementById("userModal").style.display = "flex";
}

function closeUserModal() {
    document.getElementById("userModal").style.display = "none";
    document.getElementById("newUsername").value = "";
    document.getElementById("newEmail").value = "";
    document.getElementById("newPassword").value = "";
    const errorEl = document.getElementById("addUserError");
    errorEl.textContent = "";
    errorEl.style.display = "none";
}

// =================== DASHBOARD UPDATE ===================
async function updateDashboard() {
    if (!token) return;

    try {
        // BUDGET REQUESTS
        const sortBudget = document.getElementById("sortBudget")?.value || "date-asc";
        const [budgetSortBy, budgetSortOrder] = sortBudget.split('-');
        const budgetRes = await fetch(`${SERVER_URL}/api/budgets?sortBy=${budgetSortBy}&sortOrder=${budgetSortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const budgetData = await budgetRes.json();
        if (budgetRes.ok) {
            budgetRequests = budgetData.map(b => ({
                budgetId: b.budgetId,
                username: b.username || "Unknown",
                name: b.name || "No Name",
                amount: b.total || 0,
                date: b.date || new Date().toISOString(),
                status: b.status || "PENDING",
                remarks: b.remarks || "",
                expenses: b.expenses || []
            }));
        }

        // EXPENSES
        const sortExpense = document.getElementById("sortExpense")?.value || "date-asc";
        const [expenseSortBy, expenseSortOrder] = sortExpense.split('-');
        const expensesRes = await fetch(`${SERVER_URL}/api/expenses/all?sortBy=${expenseSortBy}&sortOrder=${expenseSortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const expensesData = await expensesRes.json();
        if (expensesRes.ok) expenses = expensesData;

        // LIQUIDATIONS
        const sortLiquidation = document.getElementById("sortLiquidation")?.value || "date-asc";
        const [liquidationSortBy, liquidationSortOrder] = sortLiquidation.split('-');
        const liquidationsRes = await fetch(`${SERVER_URL}/api/liquidation?sortBy=${liquidationSortBy}&sortOrder=${liquidationSortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const liquidationsData = await liquidationsRes.json();
        if (liquidationsRes.ok) {
            liquidations = (liquidationsData.budgets || []).map(l => ({
                liquidationId: l.liquidationId,
                username: l.username || "Unknown",
                dateOfTransaction: l.dateOfTransaction || new Date().toISOString(),
                budgetName: l.budgetName || "No Name",
                amount: l.amount || 0,
                totalSpent: l.totalSpent || 0,
                remainingBalance: l.remainingBalance || 0,
                status: l.status || "PENDING",
                remarks: l.remarks || "",
                expenses: l.expenses || []
            }));
        }

        // USERS
        const sortUsers = document.getElementById("sortUsers")?.value || DEFAULT_USER_SORT;
        const [sortBy, sortOrder] = sortUsers.split('-');
        const usersRes = await fetch(`${SERVER_URL}/api/admin/users?sortBy=${sortBy}&sortOrder=${sortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) users = usersData;

        // UPDATE UI
        const balanceCards = document.querySelectorAll(".balance-card h1");
        balanceCards[0].textContent = users.filter(u => u.username?.toLowerCase() !== "admin").length;
        balanceCards[1].textContent = `₱${(budgetRequests.filter(b => b.status === "RELEASED").reduce((sum, b) => sum + (b.amount || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        balanceCards[2].textContent = `₱${(liquidations.filter(l => l.status === "LIQUIDATED").reduce((sum, l) => sum + (l.totalSpent || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        balanceCards[3].textContent = `₱${(liquidations.filter(l => l.status === "LIQUIDATED").reduce((sum, l) => sum + ((l.amount || 0) - (l.totalSpent || 0)), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        updateCharts();
        updateUserTable();
        updateBudgetTable();
        updateExpenseTable();
        updateLiquidationTable();
        showProfile();
    } catch (error) {
        showToast("Dashboard error: " + error.message);
    }
}

// =================== CHARTS ===================
function updateCharts() {
    // Category Chart
    const categoryTotals = expenses.reduce((acc, exp) => {
        const cat = exp.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
        return acc;
    }, {});
    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const categoryLabels = topCategories.map(([cat]) => cat);
    const categoryData = topCategories.map(([_, amount]) => amount);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById("categoryChart"), {
        type: "bar",
        data: {
            labels: categoryLabels,
            datasets: [{
                label: "Total Expenses",
                data: categoryData,
                backgroundColor: "rgba(229, 115, 115, 0.6)",
                borderColor: "rgba(229, 115, 115, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'logarithmic', // Use logarithmic scale
                    beginAtZero: false, // Logarithmic scales can't start at zero
                    min: 1, // Minimum value for logarithmic scale
                    title: { display: true, text: "Amount (₱)" },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // User Chart
    const userTotals = expenses.reduce((acc, exp) => {
        const user = exp.username || "Unknown";
        acc[user] = (acc[user] || 0) + (exp.amount || 0);
        return acc;
    }, {});
    const topUsers = Object.entries(userTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const userLabels = topUsers.map(([user]) => user);
    const userData = topUsers.map(([_, amount]) => amount);

    if (userChart) userChart.destroy();
    userChart = new Chart(document.getElementById("userChart"), {
        type: "bar",
        data: {
            labels: userLabels,
            datasets: [{
                label: "Total Expenses",
                data: userData,
                backgroundColor: "rgba(255, 153, 153, 0.6)",
                borderColor: "rgba(255, 153, 153, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'logarithmic', // Use logarithmic scale
                    beginAtZero: false,
                    min: 1,
                    title: { display: true, text: "Amount (₱)" },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Monthly Spending Trend Chart
    const monthlyTotals = expenses.reduce((acc, exp) => {
        const date = new Date(exp.dateOfTransaction);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        acc[monthYear] = (acc[monthYear] || 0) + (exp.amount || 0);
        return acc;
    }, {});
    const today = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        months.push(monthYear);
    }
    const monthlyLabels = months.map(my => {
        const [year, month] = my.split('-');
        return new Date(year, month - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    });
    const monthlyData = months.map(my => monthlyTotals[my] || 0);

    if (monthlySpendingChart) monthlySpendingChart.destroy();
    monthlySpendingChart = new Chart(document.getElementById("monthlySpendingChart"), {
        type: "line",
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: "Monthly Expenses",
                data: monthlyData,
                borderColor: "rgba(229, 115, 115, 1)",
                backgroundColor: "rgba(229, 115, 115, 0.2)",
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'logarithmic', // Use logarithmic scale
                    beginAtZero: false,
                    min: 1,
                    title: { display: true, text: "Amount (₱)" },
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                    }
                },
                x: { title: { display: true, text: "Month" } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// =================== USER FUNCTIONS ===================
async function createUser() {
    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("newEmail").value.trim();
    const password = document.getElementById("newPassword").value;
    const errorEl = document.getElementById("addUserError");
    errorEl.style.display = "none";
    errorEl.textContent = "";

    if (!username || !email || !password) {
        errorEl.textContent = "Please fill all fields.";
        errorEl.style.display = "block";
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/admin/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            closeUserModal();
            updateDashboard();
            showToast("User created successfully");
        } else {
            errorEl.textContent = data.error || "Failed to create user";
            errorEl.style.display = "block";
        }
    } catch (error) {
        errorEl.textContent = "Network error: " + error.message;
        errorEl.style.display = "block";
    }
}

async function deleteUser(index) {
    try {
        const user = users[index];
        const response = await fetch(`${SERVER_URL}/api/admin/users/${user.userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
            users.splice(index, 1);
            updateUserTable();
            updateDashboard();
            showToast("User deleted successfully");
        } else {
            showToast("Delete failed");
        }
    } catch {
        showToast("Delete error");
    }
}

async function resetUserPassword(user, popup) {
    const newPassword = document.getElementById('user-new-password').value;
    const confirmPassword = document.getElementById('user-confirm-password').value;
    const errorElement = document.getElementById('user-reset-error');
    errorElement.style.display = 'none';
    errorElement.textContent = '';

    if (!newPassword || !confirmPassword) {
        errorElement.textContent = 'All fields are required';
        errorElement.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        errorElement.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/forgotPassword/reset-password?email=${encodeURIComponent(user.email)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                newPassword,
                repeatPassword: confirmPassword
            })
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || 'Password reset successfully');
            popup.remove();
            userDetailsPopup = null;
            selectedUserIndex = null;
        } else {
            errorElement.textContent = result.error || 'Failed to reset password';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        errorElement.textContent = 'Network error: ' + error.message;
        errorElement.style.display = 'block';
    }
}

async function loadUserProfilePicture(userId) {
    try {
        const response = await fetch(`${SERVER_URL}/api/users/${userId}/profile-picture`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
        return "images/default-profile.png";
    } catch (error) {
        console.error("Error loading user profile picture:", error);
        return "images/default-profile.png";
    }
}

function showConfirmDeleteUserModal(userId) {
    selectedUserIndex = users.findIndex(u => u.userId === userId);
    const confirmPopup = document.getElementById("confirmModal");
    confirmPopup.style.display = "flex";
}

function showConfirmDeleteUser(index) {
    selectedUserIndex = index;
    const confirmPopup = document.getElementById("confirmModal");
    confirmPopup.style.display = "flex";
}

async function updateUserTable() {
    const tbody = document.getElementById("users-table");
    tbody.innerHTML = "";
    const searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const sortUsers = document.getElementById("sortUsers")?.value || DEFAULT_USER_SORT;
    const [sortBy, sortOrder] = sortUsers.split('-');

    try {
        const usersRes = await fetch(`${SERVER_URL}/api/admin/users?sortBy=${sortBy}&sortOrder=${sortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) {
            users = usersData;
            let filteredUsers = users.filter(u => u.username?.toLowerCase() !== "admin");
            if (searchValue) {
                filteredUsers = filteredUsers.filter(u =>
                    (u.username?.toLowerCase().includes(searchValue) || '') ||
                    (u.email?.toLowerCase().includes(searchValue) || '')
                );
            }

            for (let index = 0; index < filteredUsers.length; index++) {
                const user = filteredUsers[index];
                const profilePicSrc = await loadUserProfilePicture(user.userId);
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><img src="${sanitizeHTML(profilePicSrc)}" class="user-profile-pic" alt="${sanitizeHTML(user.username)}'s Profile Picture">${sanitizeHTML(user.username)}</td>
                    <td>${sanitizeHTML(user.email)}</td>
                    <td>
                        <button onclick="showUserDetails(${index})">View</button>
                        <button class="delete-icon-btn" onclick="showConfirmDeleteUser(${index})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }

            document.getElementById("no-users-message").style.display = filteredUsers.length === 0 ? "block" : "none";
        } else {
            showToast("Failed to fetch users: " + usersData.error);
        }
    } catch (error) {
        showToast("Error fetching users: " + error.message);
    }
}

// Add filterUsers()
function filterUsers() {
    updateUserTable();
}

function showUserDetails(index) {
    selectedUserIndex = index;
    const user = users.filter(u => u.username?.toLowerCase() !== "admin")[index];

    userDetailsPopup = document.createElement("div");
    userDetailsPopup.className = "user-popup";
    userDetailsPopup.innerHTML = `
        <div class="modal-content popup-card">
            <span class="close-btn" onclick="closePopup()" style="float: right; font-size: 1.5rem; cursor: pointer; color: #333;">×</span>
            <h3>User Details</h3>
            <p><strong>ID:</strong> ${sanitizeHTML(user.userId)}</p>
            <p><strong>Username:</strong> ${sanitizeHTML(user.username)}</p>
            <p><strong>Email:</strong> ${sanitizeHTML(user.email)}</p>
            <h4>Reset Password</h4>
            <form id="user-reset-password-form" class="profile-form">
                <div class="form-group password-wrapper">
                    <label for="user-new-password">New Password</label>
                    <input type="password" id="user-new-password" required>
                    <span class="toggle-password" onclick="togglePassword('user-new-password', this)" aria-label="Toggle password visibility">
                        <i class="fa-solid fa-eye-slash"></i>
                    </span>
                </div>
                <div class="form-group password-wrapper">
                    <label for="user-confirm-password">Confirm New Password</label>
                    <input type="password" id="user-confirm-password" required>
                    <span class="toggle-password" onclick="togglePassword('user-confirm-password', this)" aria-label="Toggle password visibility">
                        <i class="fa-solid fa-eye-slash"></i>
                    </span>
                </div>
                <p id="user-reset-error" class="error-text" style="display: none;"></p>
                <button type="button" onclick="resetUserPassword(users.filter(u => u.username?.toLowerCase() !== 'admin')[${index}], this.closest('.user-popup'))" style="background: linear-gradient(135deg, #5cb85c, #4cae4c); color: white;">Reset Password</button>
            </form>
        </div>
    `;
    document.body.appendChild(userDetailsPopup);
}

function confirmDeleteUser() {
    const confirmPopup = document.getElementById("confirmModal");
    if (selectedUserIndex !== null) {
        deleteUser(selectedUserIndex);
    }
    confirmPopup.style.display = "none";
    if (userDetailsPopup) {
        userDetailsPopup.remove();
        userDetailsPopup = null;
    }
}

function cancelDeleteUser() {
    const confirmPopup = document.getElementById("confirmModal");
    confirmPopup.style.display = "none";
    if (userDetailsPopup) {
        userDetailsPopup.remove();
        userDetailsPopup = null;
    }
}

function confirmDeleteUser() {
    const confirmPopup = document.getElementById("confirmModal");
    if (selectedUserIndex !== null) {
        const filtered = users.filter(u => u.username?.toLowerCase() !== "admin");
        const actualIndex = users.findIndex(u => u.userId === filtered[selectedUserIndex].userId);
        deleteUser(actualIndex);
    }
    confirmPopup.style.display = "none";
    if (userDetailsPopup) {
        userDetailsPopup.remove();
        userDetailsPopup = null;
    }
}

function closePopup(popupElement = null) {
    if (popupElement) {
        popupElement.remove();
    } else {
        document.querySelectorAll(".user-popup").forEach(el => el.remove());
        const expensePopup = document.getElementById("expenseImagePopup");
        const liquidationPopup = document.getElementById("liquidationExpenseImagePopup");
        const img = currentPopupType === 'liquidation' ?
            document.getElementById("popup-liquidation-expense-img") :
            document.getElementById("popup-expense-img");

        if (currentPopupType === 'expense' && expensePopup) {
            expensePopup.style.display = "none";
        } else if (currentPopupType === 'liquidation' && liquidationPopup) {
            liquidationPopup.style.display = "none";
            document.getElementById("liquidationPopup").style.display = "none";
            selectedLiquidationIndex = null;
        }

        if (img && img.src) {
            img.removeEventListener('mousedown', startDragging);
            img.removeEventListener('mousemove', drag);
            img.removeEventListener('mouseup', stopDragging);
            img.removeEventListener('mouseleave', stopDragging);
            URL.revokeObjectURL(img.src);
            img.src = '';
        }
        document.removeEventListener('keydown', handleKeyZoom);
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        currentPopupType = null;
        currentExpenseId = null;
    }
    userDetailsPopup = null;
    selectedUserIndex = null;
}


function closeLiquidationImagePopup() {
    const popup = document.getElementById("liquidationExpenseImagePopup");
    const img = document.getElementById("popup-liquidation-expense-img");
    popup.style.display = "none";
    if (img && img.src) {
        img.removeEventListener('mousedown', startDragging);
        img.removeEventListener('mousemove', drag);
        img.removeEventListener('mouseup', stopDragging);
        img.removeEventListener('mouseleave', stopDragging);
        URL.revokeObjectURL(img.src);
        img.src = '';
    }
    document.removeEventListener('keydown', handleKeyZoom);
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    currentPopupType = null;
    currentExpenseId = null;
    document.getElementById("liquidationPopup").style.display = "none";
    selectedLiquidationIndex = null;
}

// =================== BUDGET FUNCTIONS ===================
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

async function updateBudgetTable() {
    const tbody = document.getElementById("budget-table");
    tbody.innerHTML = "";

    const searchValue = document.getElementById("searchBudget")?.value.toLowerCase() || "";
    const sortBudget = document.getElementById("sortBudget")?.value || "date-asc";
    const [sortBy, sortOrder] = sortBudget.split('-');

    try {
        const budgetRes = await fetch(`${SERVER_URL}/api/budgets?sortBy=${sortBy}&sortOrder=${sortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const budgetData = await budgetRes.json();
        if (budgetRes.ok) {
            budgetRequests = budgetData.map(b => ({
                budgetId: b.budgetId,
                username: b.username || "Unknown",
                name: b.name || "No Name",
                amount: b.total || 0,
                date: b.date || new Date().toISOString(),
                status: b.status || "PENDING",
                remarks: b.remarks || "",
                expenses: b.expenses || []
            }));

            let filteredBudgets = budgetRequests;
            if (searchValue) {
                filteredBudgets = budgetRequests.filter(req =>
                    (req.username?.toLowerCase().includes(searchValue) || '') ||
                    (req.name?.toLowerCase().includes(searchValue) || '') ||
                    (req.amount?.toString().includes(searchValue) || '') ||
                    (formatDate(req.date).toLowerCase().includes(searchValue) || '') ||
                    (req.status?.toLowerCase().includes(searchValue) || '') ||
                    (req.remarks?.toLowerCase().includes(searchValue) || '')
                );
            }

            filteredBudgets.forEach((req, index) => {
                const row = document.createElement("tr");
                const statusClass = req.status === "PENDING" ? "badge-pending" :
                                  req.status === "RELEASED" ? "badge-released" :
                                  "badge-denied";
row.innerHTML = `
    <td>${sanitizeHTML(formatDate(req.date))}</td>
    <td>${sanitizeHTML(req.username)}</td>
    <td>${sanitizeHTML(req.name)}</td>
    <td>₱${sanitizeHTML((req.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    <td><span class="status-badge ${statusClass}">${sanitizeHTML(req.status)}</span></td>
    <td>${sanitizeHTML(req.remarks || '')}</td>
    <td>
        <button onclick="showBudgetDetails(${index})">View</button>
        <button class="delete-icon-btn" onclick="showBudgetDeleteModal(${req.budgetId})">
            <i class="fas fa-trash-alt"></i>
        </button>
    </td>
`;
                tbody.appendChild(row);
            });

            document.getElementById("no-budgets-message").style.display = filteredBudgets.length === 0 ? "block" : "none";
        } else {
            showToast("Failed to fetch budgets: " + budgetData.error);
        }
    } catch (error) {
        showToast("Error fetching budgets: " + error.message);
    }
}

function filterBudgets() {
    updateBudgetTable();
}

function showBudgetDetails(index) {
    if (index === null || index < 0 || index >= budgetRequests.length) return;
    selectedBudgetIndex = index;
    const budget = budgetRequests[index];
    const expenseTotal = budget.expenses.reduce((sum, exp) => sum + (exp.quantity * exp.amountPerUnit || 0), 0);
    const detailsDiv = document.getElementById("budgetDetails");
    const actionsDiv = document.getElementById("budgetActions");
    const isPending = budget.status === "PENDING";

detailsDiv.innerHTML = `
    <div>
        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Budget Date:</span> <span style="word-break: break-word;">${sanitizeHTML(formatDate(budget.date))}</span>
    </div>
    <div>
        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Username:</span> <span style="word-break: break-word;">${sanitizeHTML(budget.username || 'Unknown')}</span>
    </div>
    <div>
        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Request Name:</span> <span style="word-break: break-word;">${sanitizeHTML(budget.name || 'No Name')}</span>
    </div>
    <div>
        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Total Amount:</span> <span style="word-break: break-word;">₱${sanitizeHTML((budget.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} ${expenseTotal !== (budget.amount || 0) && budget.expenses.length > 0 ? `(Calculated from items: ₱${sanitizeHTML(expenseTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))})` : ''}</span>
    </div>
    <div>
        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Status:</span> <span class="status-badge ${budget.status === "PENDING" ? "badge-pending" : budget.status === "RELEASED" ? "badge-released" : "badge-denied"}" style="word-break: break-word;">${sanitizeHTML(budget.status || 'PENDING')}</span>
    </div>
    <div>
        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Remarks:</span> <span style="word-break: break-word;">${sanitizeHTML(budget.remarks || 'None')}</span>
    </div>
    <h4 style="margin: 1rem 0;">Associated Expense Items:</h4>
    ${budget.expenses && budget.expenses.length > 0 ? `
        <ul style="padding-left: 20px; margin: 0;">
            ${budget.expenses.map(exp => `
                <li style="margin-bottom: 1rem;">
                    <div>
                        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Category:</span> <span style="word-break: break-word;">${sanitizeHTML(exp.category || 'N/A')}</span>
                    </div>
                    <div>
                        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Quantity:</span> <span style="word-break: break-word;">${sanitizeHTML((exp.quantity || 0).toString())}</span>
                    </div>
                    <div>
                        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Amount per Unit:</span> <span style="word-break: break-word;">₱${sanitizeHTML((exp.amountPerUnit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
                    </div>
                    <div>
                        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Subtotal:</span> <span style="word-break: break-word;">₱${sanitizeHTML((exp.quantity * (exp.amountPerUnit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
                    </div>
                    <div>
                        <span style="font-weight: bold; min-width: 120px; display: inline-block;">Remarks:</span> <span style="word-break: break-word;">${sanitizeHTML(exp.remarks || 'None')}</span>
                    </div>
                </li>
            `).join('')}
        </ul>
    ` : '<p style="margin: 1rem 0;">No expense items associated with this budget request yet.</p>'}
`;

    actionsDiv.innerHTML = isPending ? `
        <button onclick="showBudgetActionModal('RELEASED')" style="background: linear-gradient(135deg, #5cb85c, #4cae4c); color: white;">Release</button>
        <button onclick="showBudgetActionModal('DENIED')" style="background: linear-gradient(135deg, #d9534f, #c9302c); color: white;">Deny</button>
    ` : ``;

    document.getElementById("budgetPopup").style.display = "flex";
}

function showBudgetActionModal(action) {
    if (selectedBudgetIndex === null) return;
    pendingBudgetAction = action;
    const modal = document.getElementById("budgetActionModal");
    const title = document.getElementById("budgetActionTitle");
    const message = document.getElementById("budgetActionMessage");
    const confirmButton = document.getElementById("budgetConfirmAction");
    const errorElement = document.getElementById("budgetActionError");

    title.textContent = `Confirm ${action.charAt(0) + action.slice(1).toLowerCase()} Budget`;
    message.textContent = `Are you sure you want to ${action.toLowerCase()} this budget request?`;
    confirmButton.textContent = action.charAt(0) + action.slice(1).toLowerCase();
    confirmButton.className = `confirm-action ${action === 'DENIED' ? 'deny-action' : ''}`;
    errorElement.style.display = "none";
    errorElement.textContent = "";
    document.getElementById("budgetActionRemarks").value = "";

    confirmButton.onclick = () => confirmBudgetAction();
    modal.style.display = "flex";
}

function closeBudgetActionModal() {
    document.getElementById("budgetActionModal").style.display = "none";
    pendingBudgetAction = null;
}

async function confirmBudgetAction() {
    if (selectedBudgetIndex === null || !pendingBudgetAction) return;
    const remarks = document.getElementById("budgetActionRemarks").value.trim();
    const errorElement = document.getElementById("budgetActionError");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const budget = budgetRequests[selectedBudgetIndex];
        const response = await fetch(`${SERVER_URL}/api/budgets/${budget.budgetId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: pendingBudgetAction, remarks })
        });
        const data = await response.json();
        if (response.ok) {
            budgetRequests[selectedBudgetIndex].status = pendingBudgetAction;
            budgetRequests[selectedBudgetIndex].remarks = remarks || budgetRequests[selectedBudgetIndex].remarks;
            updateBudgetTable();
            closeBudgetPopup();
            closeBudgetActionModal();
            showToast(`Budget ${pendingBudgetAction.toLowerCase()} successfully`);
        } else {
            errorElement.textContent = data.error || "Status update failed";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Status update error: " + error.message;
        errorElement.style.display = "block";
    }
}

function closeBudgetPopup() {
    document.getElementById("budgetPopup").style.display = "none";
    selectedBudgetIndex = null;
}

// =================== EXPENSE FUNCTIONS ===================
async function updateExpenseTable() {
    const tbody = document.getElementById("expenses-table");
    tbody.innerHTML = "";

    const searchValue = document.getElementById("searchExpense")?.value.toLowerCase() || "";
    const sortExpense = document.getElementById("sortExpense")?.value || "date-asc";
    const [sortBy, sortOrder] = sortExpense.split('-');

    try {
        const expensesRes = await fetch(`${SERVER_URL}/api/expenses/all?sortBy=${sortBy}&sortOrder=${sortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const expensesData = await expensesRes.json();
        if (expensesRes.ok) {
            expenses = expensesData;
            let filteredExpenses = expenses;
            if (searchValue) {
                filteredExpenses = expenses.filter(exp =>
                    (exp.username?.toLowerCase().includes(searchValue) || '') ||
                    (exp.category?.toLowerCase().includes(searchValue) || '') ||
                    (exp.amount?.toString().includes(searchValue) || '') ||
                    (exp.dateOfTransaction ? formatDate(exp.dateOfTransaction).toLowerCase().includes(searchValue) : '') ||
                    (exp.remarks?.toLowerCase().includes(searchValue) || '')
                );
            }

            filteredExpenses.forEach(exp => {
                const row = document.createElement("tr");
row.innerHTML = `
    <td>${sanitizeHTML(exp.dateOfTransaction ? formatDate(exp.dateOfTransaction) : '')}</td>
    <td>${sanitizeHTML(exp.username || 'Unknown')}</td>
    <td>${sanitizeHTML(exp.category || '')}</td>
    <td>₱${sanitizeHTML((exp.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    <td>${sanitizeHTML(exp.remarks || '')}</td>
    <td>
        <button onclick="showExpenseImage(${exp.expenseId}, null, 0)">View</button>
        <button class="delete-icon-btn" onclick="showExpenseDeleteModal(${exp.expenseId})">
            <i class="fas fa-trash-alt"></i>
        </button>
    </td>
`;
                tbody.appendChild(row);
            });

            document.getElementById("no-expenses-message").style.display = filteredExpenses.length === 0 ? "block" : "none";
        } else {
            showToast("Failed to fetch expenses: " + expensesData.error);
        }
    } catch (error) {
        showToast("Error fetching expenses: " + error.message);
    }
}

function filterExpenses() {
    updateExpenseTable();
}

// =================== EXPENSE IMAGE HANDLING ===================
async function showExpenseImage(expenseId, liquidationId = null) {
    const isLiquidation = !!liquidationId;
    const popup = document.getElementById(isLiquidation ? "liquidationExpenseImagePopup" : "expenseImagePopup");
    const img = document.getElementById(isLiquidation ? "popup-liquidation-expense-img" : "popup-expense-img");
    currentPopupType = isLiquidation ? 'liquidation' : 'expense';

    // Reset zoom and pan
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    img.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.src = ''; // Clear previous image

    // Remove existing event listeners to prevent duplicates
    img.removeEventListener('mousedown', startDragging);
    img.removeEventListener('mousemove', drag);
    img.removeEventListener('mouseup', stopDragging);
    img.removeEventListener('mouseleave', stopDragging);
    document.removeEventListener('keydown', handleKeyZoom);

    // Update image controls (remove Previous/Next buttons)
    const imageControls = popup.querySelector('div[style*="margin-top: 10px"]');
    imageControls.innerHTML = `
        <button onclick="zoomImage('in')" style="margin-right: 10px; padding: 5px 10px; border: none; border-radius: 5px; background: linear-gradient(135deg, #5cb85c, #4cae4c); color: white; cursor: pointer;">
            <i class="fas fa-search-plus"></i> Zoom In
        </button>
        <button onclick="zoomImage('out')" style="margin-right: 10px; padding: 5px 10px; border: none; border-radius: 5px; background: linear-gradient(135deg, #d9534f, #c9302c); color: white; cursor: pointer;">
            <i class="fas fa-search-minus"></i> Zoom Out
        </button>
        <button onclick="downloadImage()" style="padding: 5px 10px; border: none; border-radius: 5px; background: linear-gradient(135deg, #333, #555); color: white; cursor: pointer;">
            <i class="fas fa-download"></i> Download
        </button>
    `;

    currentExpenseId = expenseId;

    try {
        let endpoint;
        if (isLiquidation) {
            // Fetch the first image for the liquidation expense
            endpoint = `${SERVER_URL}/api/liquidation/${liquidationId}/images/${expenseId}/0`;
            const imageResponse = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!imageResponse.ok) {
                const errorData = await imageResponse.json();
                throw new Error(errorData.error || `Failed to fetch image: ${imageResponse.status}`);
            }
            const blob = await imageResponse.blob();
            img.src = URL.createObjectURL(blob);
        } else {
            // Fetch expense image (for Expenses tab)
            endpoint = `${SERVER_URL}/api/expenses/${expenseId}/images?index=0`;
            const imageResponse = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!imageResponse.ok) {
                const errorData = await imageResponse.json();
                throw new Error(errorData.error || `Failed to fetch image: ${imageResponse.status}`);
            }
            const blob = await imageResponse.blob();
            img.src = URL.createObjectURL(blob);
        }

        popup.style.display = "flex";
        document.addEventListener('keydown', handleKeyZoom);
        img.addEventListener('mousedown', startDragging);
        img.addEventListener('mousemove', drag);
        img.addEventListener('mouseup', stopDragging);
        img.addEventListener('mouseleave', stopDragging);
    } catch (error) {
        console.error("Error loading image:", error);
        showToast(`Failed to load image: ${error.message}`);
        img.src = "images/placeholder.png"; // Fallback image
        popup.style.display = "flex";
    }
}

function zoomImage(direction) {
    const img = document.getElementById(currentPopupType === 'liquidation' ? "popup-liquidation-expense-img" : "popup-expense-img");
    if (!img) return;

    if (direction === 'in' && zoomLevel < 3) {
        zoomLevel += 0.1;
    } else if (direction === 'out' && zoomLevel > 0.5) {
        zoomLevel -= 0.1;
    }

    img.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
}

function handleKeyZoom(event) {
    if (event.key === '+' || event.key === '=') {
        zoomImage('in');
    } else if (event.key === '-') {
        zoomImage('out');
    }
}

function startDragging(event) {
    if (zoomLevel <= 1) return;
    isDragging = true;
    startX = event.clientX - panX;
    startY = event.clientY - panY;
    event.target.style.cursor = 'grabbing';
}

function drag(event) {
    if (!isDragging) return;
    event.preventDefault();
    const img = event.target;
    panX = event.clientX - startX;
    panY = event.clientY - startY;
    img.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
}

function stopDragging(event) {
    isDragging = false;
    event.target.style.cursor = 'grab';
}

function showPreviousImage() {
    // ... existing code ...
}

function showNextImage() {
    // ... existing code ...
}

function downloadImage() {
    const img = document.getElementById(currentPopupType === 'liquidation' ? "popup-liquidation-expense-img" : "popup-expense-img");
    if (!img.src) return;

    const link = document.createElement('a');
    link.href = img.src;
    link.download = `expense-image-${currentPopupType}-${currentExpenseId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =================== LIQUIDATION FUNCTIONS ===================
// =================== DELETE FUNCTIONS ===================
function showBudgetDeleteModal(budgetId) {
    pendingBudgetDeleteId = budgetId;
    const modal = document.getElementById("budgetDeleteModal");
    const message = document.getElementById("budgetDeleteMessage");
    const errorElement = document.getElementById("budgetDeleteError");

    message.textContent = `Are you sure you want to delete this budget request?`;
    errorElement.style.display = "none";
    errorElement.textContent = "";

    document.getElementById("budgetConfirmDelete").onclick = () => confirmBudgetDelete();
    modal.style.display = "flex";
}

function closeBudgetDeleteModal() {
    document.getElementById("budgetDeleteModal").style.display = "none";
    pendingBudgetDeleteId = null;
}

async function confirmBudgetDelete() {
    if (!pendingBudgetDeleteId) return;
    const errorElement = document.getElementById("budgetDeleteError");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const response = await fetch(`${SERVER_URL}/api/budgets/${pendingBudgetDeleteId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            budgetRequests = budgetRequests.filter(b => b.budgetId !== pendingBudgetDeleteId);
            updateBudgetTable();
            closeBudgetDeleteModal();
            showToast(data.message || "Budget deleted successfully");
        } else {
            errorElement.textContent = data.error || "Failed to delete budget";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Error deleting budget: " + error.message;
        errorElement.style.display = "block";
    }
}

function showExpenseDeleteModal(expenseId) {
    pendingExpenseDeleteId = expenseId;
    const modal = document.getElementById("expenseDeleteModal");
    const message = document.getElementById("expenseDeleteMessage");
    const errorElement = document.getElementById("expenseDeleteError");

    message.textContent = `Are you sure you want to delete this expense?`;
    errorElement.style.display = "none";
    errorElement.textContent = "";

    document.getElementById("expenseConfirmDelete").onclick = () => confirmExpenseDelete();
    modal.style.display = "flex";
}

function closeExpenseDeleteModal() {
    document.getElementById("expenseDeleteModal").style.display = "none";
    pendingExpenseDeleteId = null;
}

async function confirmExpenseDelete() {
    if (!pendingExpenseDeleteId) return;
    const errorElement = document.getElementById("expenseDeleteError");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const response = await fetch(`${SERVER_URL}/api/expenses/${pendingExpenseDeleteId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            expenses = expenses.filter(e => e.expenseId !== pendingExpenseDeleteId);
            updateExpenseTable();
            closeExpenseDeleteModal();
            showToast(data.message || "Expense deleted successfully");
        } else {
            errorElement.textContent = data.error || "Failed to delete expense";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Error deleting expense: " + error.message;
        errorElement.style.display = "block";
    }
}

function showLiquidationDeleteModal(liquidationId) {
    pendingLiquidationDeleteId = liquidationId;
    const modal = document.getElementById("liquidationDeleteModal");
    const message = document.getElementById("liquidationDeleteMessage");
    const errorElement = document.getElementById("liquidationDeleteError");

    message.textContent = `Are you sure you want to delete this liquidation?`;
    errorElement.style.display = "none";
    errorElement.textContent = "";

    document.getElementById("liquidationConfirmDelete").onclick = () => confirmLiquidationDelete();
    modal.style.display = "flex";
}

function closeLiquidationDeleteModal() {
    document.getElementById("liquidationDeleteModal").style.display = "none";
    pendingLiquidationDeleteId = null;
}

async function confirmLiquidationDelete() {
    if (!pendingLiquidationDeleteId) return;
    const errorElement = document.getElementById("liquidationDeleteError");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const response = await fetch(`${SERVER_URL}/api/liquidation/${pendingLiquidationDeleteId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            liquidations = liquidations.filter(l => l.liquidationId !== pendingLiquidationDeleteId);
            updateLiquidationTable();
            closeLiquidationDeleteModal();
            showToast(data.message || "Liquidation deleted successfully");
        } else {
            errorElement.textContent = data.error || "Failed to delete liquidation";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Error deleting liquidation: " + error.message;
        errorElement.style.display = "block";
    }
}

async function updateLiquidationTable() {
    const tbody = document.getElementById("liquidation-table");
    tbody.innerHTML = "";

    const searchValue = document.getElementById("searchLiquidation")?.value.toLowerCase() || "";
    const sortLiquidation = document.getElementById("sortLiquidation")?.value || "date-asc";
    const [sortBy, sortOrder] = sortLiquidation.split('-');

    try {
        const liquidationsRes = await fetch(`${SERVER_URL}/api/liquidation?sortBy=${sortBy}&sortOrder=${sortOrder}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const liquidationsData = await liquidationsRes.json();
        if (liquidationsRes.ok) {
            liquidations = (liquidationsData.budgets || []).map(l => ({
                liquidationId: l.liquidationId,
                username: l.username || "Unknown",
                dateOfTransaction: l.dateOfTransaction || new Date().toISOString(),
                budgetName: l.budgetName || "No Name",
                amount: l.amount || 0,
                totalSpent: l.totalSpent || 0,
                remainingBalance: l.remainingBalance || 0,
                status: l.status || "PENDING",
                remarks: l.remarks || "",
                expenses: l.expenses || []
            }));

            let filteredLiquidations = liquidations;
            if (searchValue) {
                filteredLiquidations = liquidations.filter(l =>
                    (l.username?.toLowerCase().includes(searchValue) || '') ||
                    (l.budgetName?.toLowerCase().includes(searchValue) || '') ||
                    (l.amount?.toString().includes(searchValue) || '') ||
                    (l.totalSpent?.toString().includes(searchValue) || '') ||
                    (l.remainingBalance?.toString().includes(searchValue) || '') ||
                    (l.dateOfTransaction ? formatDate(l.dateOfTransaction).toLowerCase().includes(searchValue) : '') ||
                    (l.status?.toLowerCase().includes(searchValue) || '') ||
                    (l.remarks?.toLowerCase().includes(searchValue) || '')
                );
            }

            filteredLiquidations.forEach((l, index) => {
                const row = document.createElement("tr");
                const statusClass = l.status === "PENDING" ? "badge-pending" :
                                  l.status === "LIQUIDATED" ? "badge-liquidated" :
                                  "badge-denied";
row.innerHTML = `
    <td>${sanitizeHTML(formatDate(l.dateOfTransaction))}</td>
    <td>${sanitizeHTML(l.username)}</td>
    <td>${sanitizeHTML(l.budgetName)}</td>
    <td>₱${sanitizeHTML((l.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    <td>₱${sanitizeHTML((l.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    <td>₱${sanitizeHTML((l.remainingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
    <td><span class="status-badge ${statusClass}">${sanitizeHTML(l.status)}</span></td>
    <td>${sanitizeHTML(l.remarks || '')}</td>
    <td>
        <button onclick="showLiquidationDetails(${index})">View</button>
        <button class="delete-icon-btn" onclick="showLiquidationDeleteModal(${l.liquidationId})">
            <i class="fas fa-trash-alt"></i>
        </button>
    </td>
`;
                tbody.appendChild(row);
            });

            document.getElementById("no-liquidations-message").style.display = filteredLiquidations.length === 0 ? "block" : "none";
        } else {
            showToast("Failed to fetch liquidations: " + liquidationsData.error);
        }
    } catch (error) {
        showToast("Error fetching liquidations: " + error.message);
    }
}

function filterLiquidations() {
    updateLiquidationTable();
}

function showLiquidationDetails(index) {
    if (index === null || index < 0 || index >= liquidations.length) return;
    selectedLiquidationIndex = index;
    const liquidation = liquidations[index];
    const detailsDiv = document.getElementById("liquidationDetails");
    const actionsDiv = document.getElementById("liquidationActions");
    const isPending = liquidation.status === "PENDING";

 detailsDiv.innerHTML = `
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Date:</span> <span style="word-break: break-word;">${sanitizeHTML(formatDate(liquidation.dateOfTransaction))}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Username:</span> <span style="word-break: break-word;">${sanitizeHTML(liquidation.username || 'Unknown')}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Budget Name:</span> <span style="word-break: break-word;">${sanitizeHTML(liquidation.budgetName || 'No Name')}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Amount:</span> <span style="word-break: break-word;">₱${sanitizeHTML((liquidation.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Total Spent:</span> <span style="word-break: break-word;">₱${sanitizeHTML((liquidation.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Remaining Balance:</span> <span style="word-break: break-word;">₱${sanitizeHTML((liquidation.remainingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Status:</span> <span class="status-badge ${liquidation.status === "PENDING" ? "badge-pending" : liquidation.status === "LIQUIDATED" ? "badge-liquidated" : "badge-denied"}" style="word-break: break-word;">${sanitizeHTML(liquidation.status || 'PENDING')}</span>
     </div>
     <div>
         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Remarks:</span> <span style="word-break: break-word;">${sanitizeHTML(liquidation.remarks || 'None')}</span>
     </div>
     <h4 style="margin: 1rem 0;">Associated Expenses:</h4>
     ${liquidation.expenses && liquidation.expenses.length > 0 ? `
         <ul style="padding-left: 20px; margin: 0;">
             ${liquidation.expenses.map(exp => `
                 <li style="margin-bottom: 1rem;">
                     <div>
                         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Category:</span> <span style="word-break: break-word;">${sanitizeHTML(exp.category || 'N/A')}</span>
                     </div>
                     <div>
                         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Amount:</span> <span style="word-break: break-word;">₱${sanitizeHTML((exp.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
                     </div>
                     <div>
                         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Remarks:</span> <span style="word-break: break-word;">${sanitizeHTML(exp.remarks || 'None')}</span>
                     </div>
                     <div>
                         <span style="font-weight: bold; min-width: 120px; display: inline-block;">Receipt:</span> <button onclick="showExpenseImage(${exp.liquidationExpenseId}, ${liquidation.liquidationId}, 0)">View</button>
                     </div>
                 </li>
             `).join('')}
         </ul>
     ` : '<p style="margin: 1rem 0;">No expenses associated with this liquidation yet.</p>'}
 `;

    actionsDiv.innerHTML = isPending ? `
        <button onclick="showLiquidationActionModal('LIQUIDATED')" style="background: linear-gradient(135deg, #5cb85c, #4cae4c); color: white;">Liquidate</button>
        <button onclick="showLiquidationActionModal('DENIED')" style="background: linear-gradient(135deg, #d9534f, #c9302c); color: white;">Deny</button>
    ` : ``;

    document.getElementById("liquidationPopup").style.display = "flex";
}

function showLiquidationActionModal(action) {
    if (selectedLiquidationIndex === null) return;
    pendingLiquidationAction = action;
    const modal = document.getElementById("liquidationActionModal");
    const title = document.getElementById("liquidationActionTitle");
    const message = document.getElementById("liquidationActionMessage");
    const confirmButton = document.getElementById("liquidationConfirmAction");
    const errorElement = document.getElementById("liquidationActionError");

    title.textContent = `Confirm ${action.charAt(0) + action.slice(1).toLowerCase()} Liquidation`;
    message.textContent = `Are you sure you want to ${action.toLowerCase()} this liquidation?`;
    confirmButton.textContent = action.charAt(0) + action.slice(1).toLowerCase();
    confirmButton.className = `confirm-action ${action === 'DENIED' ? 'deny-action' : ''}`;
    errorElement.style.display = "none";
    errorElement.textContent = "";
    document.getElementById("liquidationActionRemarks").value = "";

    confirmButton.onclick = () => confirmLiquidationAction();
    modal.style.display = "flex";
}

function closeLiquidationActionModal() {
    document.getElementById("liquidationActionModal").style.display = "none";
    pendingLiquidationAction = null;
}

async function confirmLiquidationAction() {
    if (selectedLiquidationIndex === null || !pendingLiquidationAction) return;
    const remarks = document.getElementById("liquidationActionRemarks").value.trim();
    const errorElement = document.getElementById("liquidationActionError");
    errorElement.style.display = "none";
    errorElement.textContent = "";

    try {
        const liquidation = liquidations[selectedLiquidationIndex];
        const response = await fetch(`${SERVER_URL}/api/liquidation/${liquidation.liquidationId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: pendingLiquidationAction, remarks })
        });
        const data = await response.json();
        if (response.ok) {
            liquidations[selectedLiquidationIndex].status = pendingLiquidationAction;
            liquidations[selectedLiquidationIndex].remarks = remarks || liquidations[selectedLiquidationIndex].remarks;
            updateLiquidationTable();
            closeLiquidationPopup();
            closeLiquidationActionModal();
            showToast(`Liquidation ${pendingLiquidationAction.toLowerCase()} successfully`);
        } else {
            errorElement.textContent = data.error || "Status update failed";
            errorElement.style.display = "block";
        }
    } catch (error) {
        errorElement.textContent = "Status update error: " + error.message;
        errorElement.style.display = "block";
    }
}

function closeLiquidationPopup() {
    document.getElementById("liquidationPopup").style.display = "none";
    selectedLiquidationIndex = null;
}