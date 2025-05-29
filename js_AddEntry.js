/**
 * js_AddEntry.js
 * Handles the "Add Entry" section.
 * Dynamically creates a form, provides FABs for actions,
 * and includes a toggleable QR scanner for field data.
 */

// --- State variables for Add Entry mode ---
let isEntryDataScanningMode = false; // Tracks if the field data QR scanner is active
let tempEntryFieldValues = []; // Stores form field values before entering scan mode

// --- Camera/Scanner state variables specific to this Add Entry scanner ---
let entryDataCameraStream = null;
let entryDataAvailableCameras = [];
let entryDataCurrentCameraIndex = 0;
let entryDataScanAnimationFrameId = null;

/**
 * Helper function to format a Date object as "mm/dd/yyyy hh:mm" (24-hour).
 */
function formatDateTime(date) {
    const pad = (num) => String(num).padStart(2, '0');
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

/**
 * Creates and populates the "EntryTable" (dynamic form) based on dataFields.
 */
function fillDefaultEntryContent() {
    console.log("fillDefaultEntryContent() called.");
    const formArea = document.getElementById('dynamic-entry-form-area');
    if (!formArea) {
        console.error("fillDefaultEntryContent: dynamic-entry-form-area not found.");
        return;
    }
    const existingValidationMsg = document.getElementById('entry-validation-message');
    if (existingValidationMsg) existingValidationMsg.remove();

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];
    if (currentDataFields.length === 0) {
        formArea.innerHTML = "<p>No form fields defined. Please perform App Sync.</p>";
        return;
    }

    let tableHTML = `
        <div id="entry-validation-message-container" style="margin-bottom: 10px;"></div> 
        <table id="entry-table" class="entry-form-table">
            <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
            <tbody>`;
    currentDataFields.forEach((field, index) => {
        const fieldNameDisplay = field.fieldRequired ? `${field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}*` : field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let initialValue = field.fieldValue;
        if (field.fieldValue.toUpperCase() === "NOW()") initialValue = formatDateTime(new Date());
        const escapedInitialValue = initialValue.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        tableHTML += `
            <tr>
                <td><label for="entry-field-${index}">${fieldNameDisplay}</label></td>
                <td><input type="text" id="entry-field-${index}" class="entry-field-input" 
                           data-original-field-name="${field.fieldName.replace(/"/g, "&quot;")}"
                           data-is-required="${field.fieldRequired}" value="${escapedInitialValue}">
                </td>
            </tr>`;
    });
    tableHTML += `</tbody></table><p class="entry-table-footnote">* Required field</p>`;
    formArea.innerHTML = tableHTML;
}

/**
 * Saves the current values from the entry form inputs into tempEntryFieldValues.
 */
function saveCurrentEntryFieldData() {
    tempEntryFieldValues = [];
    const inputElements = document.querySelectorAll('#dynamic-entry-form-area .entry-field-input');
    inputElements.forEach(inputEl => {
        tempEntryFieldValues.push({
            id: inputEl.id, // Store ID for easier restoration
            value: inputEl.value
        });
    });
    console.log("saveCurrentEntryFieldData: Saved form values:", tempEntryFieldValues);
}

/**
 * Restores values to the entry form inputs from tempEntryFieldValues.
 */
function restoreEntryFieldData() {
    console.log("restoreEntryFieldData: Attempting to restore values:", tempEntryFieldValues);
    if (tempEntryFieldValues.length > 0) {
        tempEntryFieldValues.forEach(savedField => {
            const inputEl = document.getElementById(savedField.id);
            if (inputEl) {
                inputEl.value = savedField.value;
            }
        });
    }
}

/**
 * Displays the UI for the Add Entry mode (form and FABs).
 * @param {boolean} [isRestoring=false] - If true, restores form values from temp storage.
 */
function showAddEntryMenu(isRestoring = false) {
    console.log("showAddEntryMenu called. isRestoring:", isRestoring);
    isEntryDataScanningMode = false; // Ensure we are not in scan mode

    if (typeof window.clearMainPane === 'function') window.clearMainPane();
    else console.error("showAddEntryMenu: clearMainPane() function is not defined.");

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];

    if (currentDataFields.length === 0) {
        const promptToSyncHTML = `
            <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                <h2 style="color: var(--md-sys-color-secondary); margin-bottom: 15px;">Setup Required</h2>
                <p>No form fields are currently defined. Please use <strong>App Sync</strong> first.</p>
                <button onclick="document.getElementById('btn-sync').click()" class="quest-button primary">Go to App Sync</button>
            </div>`;
        if (typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(promptToSyncHTML);
    } else {
        const addEntryViewHTML = `
            <div class="add-entry-view-container">
                <button id="btn-clear-form-fab" class="fab-entry-mode fab-top-left" aria-label="Clear Form">
                    <span class="material-symbols-outlined">delete</span><span class="fab-text">Clear Form</span>
                </button>
                <div id="dynamic-entry-form-area" style="padding:0 0 80px 0;text-align:left;margin:0 auto;max-width:600px;width:100%;">
                    <h2 style="text-align:center;color:var(--md-sys-color-primary);margin-bottom:10px;margin-top:10px;">Create New Entry</h2>
                </div>
                <button id="btn-scan-entry-data-fab" class="fab-entry-mode fab-bottom-left" aria-label="Scan Data">
                    <span class="material-symbols-outlined">document_scanner</span><span class="fab-text">Scan Data</span>
                </button>
                <button id="btn-add-created-entry-fab" class="fab-entry-mode fab-bottom-right" aria-label="Add Entry">
                    <span class="material-symbols-outlined">add</span><span class="fab-text">Add Entry</span>
                </button>
            </div>`;
        if (typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(addEntryViewHTML);
        
        fillDefaultEntryContent(); 
        if (isRestoring) {
            restoreEntryFieldData();
        }

        document.getElementById('btn-clear-form-fab')?.addEventListener('click', clickClearEntry);
        document.getElementById('btn-scan-entry-data-fab')?.addEventListener('click', clickQRScan); // Main toggle
        document.getElementById('btn-add-created-entry-fab')?.addEventListener('click', clickAddEntry);

        document.querySelectorAll('.fab-entry-mode').forEach(fab => {
            fab.addEventListener('mouseenter', () => fab.classList.add('expanded'));
            fab.addEventListener('mouseleave', () => fab.classList.remove('expanded'));
            fab.addEventListener('focus', () => fab.classList.add('expanded'));
            fab.addEventListener('blur', () => fab.classList.remove('expanded'));
        });
    }
}

/**
 * Displays the QR scanner UI for individual entry fields.
 */
function displayEntryDataScannerUI() {
    console.log("displayEntryDataScannerUI called.");
    if(typeof window.clearMainPane === 'function') window.clearMainPane();

    // Re-using app-sync-container class for styling, but with unique IDs for elements
    const scannerHTML = `
        <div id="entry-data-scanner-container" class="app-sync-container" style="top: 0; /* Cover entire main-pane */"> 
            <video id="entry-data-camera-feed" playsinline autoplay muted></video>
            <canvas id="entry-data-scan-canvas" style="display: none;"></canvas>
            <div id="camera-overlay">
                <div id="scan-target-area">
                    <div class="corner top-left"></div><div class="corner top-right"></div>
                    <div class="corner bottom-left"></div><div class="corner bottom-right"></div>
                </div>
            </div>
            <button id="btn-switch-entry-data-camera" class="app-sync-button bottom-center" style="z-index: 104;">
                <span class="material-symbols-outlined">cameraswitch</span>
                <span class="button-label">Switch Camera</span>
            </button>
            </div>`;
    if(typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(scannerHTML);
    
    document.getElementById('btn-switch-entry-data-camera')?.addEventListener('click', switchEntryDataCamera);
    startEntryDataCamera();
}


// --- Camera and QR Scanning Logic for Entry Data ---

async function startEntryDataCamera(deviceId) {
    await stopEntryDataCamera(); // Ensure previous stream is stopped
    const videoElement = document.getElementById('entry-data-camera-feed');
    if (!videoElement) { console.error("Entry data camera feed element not found."); return; }

    let constraints = { video: { facingMode: 'environment' }, audio: false };
    if (deviceId) constraints.video = { deviceId: { exact: deviceId } };

    try {
        entryDataCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = entryDataCameraStream;
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("Entry data camera started.");
                enumerateEntryDataCameras();
                if (entryDataScanAnimationFrameId) cancelAnimationFrame(entryDataScanAnimationFrameId);
                entryDataScanAnimationFrameId = requestAnimationFrame(scanEntryDataFrame);
            }).catch(error => { 
                console.error("Error playing entry data camera:", error);
                alert("Error starting camera for field scan.");
            });
        }
    } catch (err) {
        console.error("Error accessing entry data camera:", err);
        alert("Could not access camera for field scan. Please check permissions.");
        clickQRScan(); // Attempt to toggle back to form view
    }
}

async function stopEntryDataCamera() {
    if (entryDataScanAnimationFrameId) {
        cancelAnimationFrame(entryDataScanAnimationFrameId);
        entryDataScanAnimationFrameId = null;
    }
    if (entryDataCameraStream) {
        entryDataCameraStream.getTracks().forEach(track => track.stop());
        entryDataCameraStream = null;
        console.log("Entry data camera stopped.");
    }
    const videoElement = document.getElementById('entry-data-camera-feed');
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject = null;
    }
}

async function enumerateEntryDataCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        entryDataAvailableCameras = devices.filter(device => device.kind === 'videoinput');
        const switchButton = document.getElementById('btn-switch-entry-data-camera');
        if (switchButton) {
            switchButton.style.display = entryDataAvailableCameras.length > 1 ? 'flex' : 'none';
        }
    } catch (err) { console.error("Error enumerating entry data cameras:", err); }
}

async function switchEntryDataCamera() {
    if (entryDataAvailableCameras.length > 1) {
        entryDataCurrentCameraIndex = (entryDataCurrentCameraIndex + 1) % entryDataAvailableCameras.length;
        await startEntryDataCamera(entryDataAvailableCameras[entryDataCurrentCameraIndex].deviceId);
    }
}

function scanEntryDataFrame() {
    if (!entryDataCameraStream) return;
    const videoElement = document.getElementById('entry-data-camera-feed');
    const canvasElement = document.getElementById('entry-data-scan-canvas');
    const targetAreaElement = document.querySelector('#entry-data-scanner-container #scan-target-area'); // More specific selector

    if (!videoElement || !canvasElement || !targetAreaElement || videoElement.readyState < videoElement.HAVE_ENOUGH_DATA || videoElement.videoWidth === 0) {
        entryDataScanAnimationFrameId = requestAnimationFrame(scanEntryDataFrame); return;
    }
    if (canvasElement.width !== videoElement.videoWidth) canvasElement.width = videoElement.videoWidth;
    if (canvasElement.height !== videoElement.videoHeight) canvasElement.height = videoElement.videoHeight;

    const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    try {
        const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code && code.data) {
            // Use a more specific target area check if needed, for now, reusing global one
            if (typeof checkIfCodeInTargetArea === 'function' && checkIfCodeInTargetArea(code.location, videoElement, targetAreaElement)) {
                console.log("Entry Data QR Scanned:", code.data);
                alert("Scanned Data for Field: " + code.data + "\n(Auto-filling not yet implemented)");
                // TODO: Implement logic to find which field this QR is for and populate it.
                // For now, just toggle back.
                clickQRScan(); // Toggle back to form view
                return; // Stop scanning
            }
        }
    } catch (error) { console.error("Error during entry data QR scan:", error); }
    entryDataScanAnimationFrameId = requestAnimationFrame(scanEntryDataFrame);
}


/**
 * Toggles between Entry Form view and QR Data Scan view.
 */
function clickQRScan() {
    console.log("clickQRScan() called. Current mode (before toggle):", isEntryDataScanningMode ? "Scan" : "Form");
    const fabScan = document.getElementById('btn-scan-entry-data-fab');
    const fabScanIcon = fabScan ? fabScan.querySelector('.material-symbols-outlined') : null;
    const fabScanText = fabScan ? fabScan.querySelector('.fab-text') : null;

    if (isEntryDataScanningMode) { // Currently scanning, switch back to form
        stopEntryDataCamera();
        showAddEntryMenu(true); // Pass true to indicate restoring values
        if (fabScanIcon) fabScanIcon.textContent = 'document_scanner';
        if (fabScanText) fabScanText.textContent = 'Scan Data';
        fabScan?.setAttribute('aria-label', 'Scan Data');
        isEntryDataScanningMode = false;
    } else { // Currently on form, switch to scanning
        saveCurrentEntryFieldData();
        displayEntryDataScannerUI();
        if (fabScanIcon) fabScanIcon.textContent = 'edit_document'; // Or 'close'
        if (fabScanText) fabScanText.textContent = 'Back to Form'; // Or 'Exit Scan'
        fabScan?.setAttribute('aria-label', 'Back to Form');
        isEntryDataScanningMode = true;
    }
    console.log("clickQRScan: Toggled. New mode:", isEntryDataScanningMode ? "Scan" : "Form");
}


// --- Other FAB click handlers and validation logic ---
function showValidationMessage(message, type = 'error') {
    const container = document.getElementById('entry-validation-message-container');
    if (!container) { /* console.error("Validation message container not found!");*/ return; }
    let messageDiv = document.getElementById('entry-validation-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'entry-validation-message';
        container.appendChild(messageDiv);
    }
    messageDiv.textContent = message;
    messageDiv.className = `validation-message ${type}`;
}

function clearValidationMessages() {
    const messageDiv = document.getElementById('entry-validation-message');
    if (messageDiv) messageDiv.remove();
    document.querySelectorAll('.entry-field-input.input-error').forEach(input => input.classList.remove('input-error'));
}

function clickAddEntry() {
    console.log("clickAddEntry() called.");
    clearValidationMessages(); 
    const inputElements = document.querySelectorAll('#dynamic-entry-form-area .entry-field-input');
    let allRequiredFilled = true;
    let firstMissingField = null;
    const stringPairArray = [];

    inputElements.forEach(inputEl => {
        const fieldValue = inputEl.value.trim();
        const fieldName = inputEl.dataset.originalFieldName; 
        const isRequired = inputEl.dataset.isRequired === 'true';
        if (isRequired && fieldValue === "") {
            allRequiredFilled = false;
            inputEl.classList.add('input-error'); 
            if (!firstMissingField) firstMissingField = inputEl;
        } else {
            inputEl.classList.remove('input-error'); 
        }
        if (fieldName) stringPairArray.push(makeDataFieldStringPair(fieldName, fieldValue));
    });

    if (!allRequiredFilled) {
        showValidationMessage("Please fill all required fields marked with *.", "error");
        if (firstMissingField) firstMissingField.focus(); return; 
    }

    if (typeof makeEntryString !== 'function' || typeof window.addEntry !== 'function') {
        showValidationMessage("Error: System function missing. Cannot save entry.", "error"); return;
    }
    
    const entryString = makeEntryString(stringPairArray);
    if (entryString) {
        try {
            window.addEntry(entryString); 
            showAddEntrySuccessScreen(); 
        } catch (error) {
            console.error("clickAddEntry: Error calling window.addEntry():", error.message);
            showValidationMessage(`Error saving entry: ${error.message}`, "error");
        }
    } else { showValidationMessage("No data to save.", "error"); }
}

function showAddEntrySuccessScreen() {
    if (typeof window.clearMainPane === 'function') window.clearMainPane();
    const successHTML = `
        <div style="padding:30px 20px;text-align:center;color:var(--md-sys-color-on-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
            <span class="material-symbols-outlined" style="font-size:60px;color:var(--md-sys-color-success);margin-bottom:15px;">check_circle</span>
            <h2 style="color:var(--md-sys-color-success);margin-bottom:10px;">Entry Added Successfully!</h2>
            <p style="margin-bottom:20px;">You can review your entries in the 'Review' tab.</p>
            <p style="margin-bottom:25px;">Would you like to add another entry?</p>
            <div style="display:flex;gap:15px;">
                <button onclick="showAddEntryMenu()" class="quest-button primary" style="min-width:150px;">Add Another Entry</button>
                <button onclick="document.getElementById('btn-review').click()" class="quest-button secondary" style="min-width:150px;background-color:var(--md-sys-color-surface-container);color:var(--md-sys-color-on-surface-variant);border:1px solid var(--md-sys-color-outline);">Go to Review</button>
            </div>
        </div>`;
    if (typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(successHTML);
}

function clickClearEntry() {
    console.log("clickClearEntry() called.");
    clearValidationMessages();
    fillDefaultEntryContent(); 
    console.log("Form fields cleared/reset to defaults.");
}
