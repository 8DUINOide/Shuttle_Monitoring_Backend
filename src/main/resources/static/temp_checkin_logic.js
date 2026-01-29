}

// CheckIn Management Logic
async function loadCheckInManagement() {
    console.log("Loading Check-In Management...");
    const tableBody = document.getElementById("checkin-table");
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const response = await fetch(`${SERVER_URL}/api/check-in/all`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch check-ins");
        const checkIns = await response.json();

        // Filter based on search input
        const searchInput = document.getElementById("searchCheckIn");
        const statusFilterInput = document.getElementById("statusFilterCheckIn");
        const searchValue = searchInput ? searchInput.value.toLowerCase() : "";
        const statusFilter = statusFilterInput ? statusFilterInput.value : "all";

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

            if (statusFilter !== 'all' && displayStatus !== statusFilter) return;
            if (!studentName.toLowerCase().includes(searchValue)) return;

            visibleCount++;
            const tr = document.createElement('tr');

            let badgeClass = 'badge-not-boarded';
            if (displayStatus === 'Checked In') badgeClass = 'badge-checked-in';
            if (displayStatus === 'Checked Out') badgeClass = 'badge-checked-out';
            if (displayStatus === 'Failed') badgeClass = 'badge-maintenance';

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
                 <td>
                    <!-- Actions placeholder -->
                 </td>
             `;
            tableBody.appendChild(tr);
        });

        const noMsg = document.getElementById("no-checkin-message");
        if (noMsg) noMsg.style.display = visibleCount === 0 ? "block" : "none";

        loadShuttlesForSimulation();

    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error: ${e.message}</td></tr>`;
    }
}

function filterCheckIn() {
    loadCheckInManagement();
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

        // Pick random student assigned to this shuttle
        const student = students[Math.floor(Math.random() * students.length)];

        const studRes = await fetch(`${SERVER_URL}/api/students/${student.studentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const fullStudent = await studRes.json();

        let value = type === 'rfid' ? fullStudent.rfidTag : fullStudent.fingerprintHash;

        if (!value) {
            showToast(`Student ${student.name} has no ${type} registered!`);
            return;
        }

        showToast(`Simulating ${type.toUpperCase()} scan for ${student.name}...`);

        const scanRes = await fetch(`${SERVER_URL}/api/check-in/scan`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                type: type,
                value: value,
                shuttleId: shuttleId
            })
        });

        const scanResult = await scanRes.json();
        if (scanRes.ok) {
            showToast(scanResult.message);
            loadCheckInManagement();
        } else {
            showToast("Scan Failed: " + (scanResult.error || "Unknown"));
        }

    } catch (e) {
        showToast("Simulation Error: " + e.message);
    }
}
