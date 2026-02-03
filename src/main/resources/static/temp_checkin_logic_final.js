
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
                fingerprint: fullStudent.fingerprintHash1 || fullStudent.fingerprintHash2 || fullStudent.fingerprintHash3 || fullStudent.fingerprintHash,
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
