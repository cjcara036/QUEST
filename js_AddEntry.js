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
            id: inputEl.id, 
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
                <div id="dynamic-entry-form-area" style="text-align:left;margin:0 auto;max-width:600px;width:100%;">
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

        document.getElementById('btn-clear-form-fab')?.style.setProperty('display', 'flex', 'important');
        const fabScan = document.getElementById('btn-scan-entry-data-fab');
        if(fabScan) {
            fabScan.style.setProperty('display', 'flex', 'important');
            fabScan.style.removeProperty('z-index'); 
        }
        document.getElementById('btn-add-created-entry-fab')?.style.setProperty('display', 'flex', 'important');

        document.getElementById('btn-clear-form-fab')?.addEventListener('click', clickClearEntry);
        document.getElementById('btn-scan-entry-data-fab')?.addEventListener('click', clickQRScan); 
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
    
    const mainPane = document.getElementById('main-pane');
    if (!mainPane) {
        console.error("displayEntryDataScannerUI: Main pane not found!");
        if (isEntryDataScanningMode) clickQRScan(); 
        return;
    }

    let oldScannerWrapper = document.getElementById('entry-scanner-wrapper');
    if (oldScannerWrapper) oldScannerWrapper.remove();

    const scannerWrapper = document.createElement('div');
    scannerWrapper.id = "entry-scanner-wrapper";
    scannerWrapper.style.position = "absolute"; 
    scannerWrapper.style.top = "0"; 
    scannerWrapper.style.left = "0";
    scannerWrapper.style.width = "100%";
    scannerWrapper.style.height = "100%"; 
    scannerWrapper.style.zIndex = "1060"; 
    mainPane.appendChild(scannerWrapper);

    const tempVideoBg = "background-color: limegreen;"; 
    const scannerHTML = `
        <div id="entry-data-scanner-container" class="app-sync-container" style="position:absolute; top:0; left:0; right:0; bottom:0; background-color: #000;"> 
            <video id="entry-data-camera-feed" playsinline autoplay muted style="position:absolute; top:50%; left:50%; width:100%; height:100%; object-fit:cover; transform:translate(-50%,-50%); z-index:1; ${tempVideoBg}"></video>
            <canvas id="entry-data-scan-canvas" style="display: none;"></canvas>
            <div id="camera-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; display:flex; justify-content:center; align-items:center; background: radial-gradient(circle at center, transparent 0%, transparent calc(min(var(--target-area-size), var(--target-area-max-size)) / 2), var(--overlay-color) calc(min(var(--target-area-size), var(--target-area-max-size)) / 2 + 1px));">
                <div id="scan-target-area" style="width:min(var(--target-area-size), var(--target-area-max-size)); height:min(var(--target-area-size), var(--target-area-max-size)); position:relative; border:2px dashed rgba(255,255,255,0.7); border-radius:16px; box-shadow:0 0 15px rgba(0,0,0,0.3);">
                    <div class="corner top-left"></div><div class="corner top-right"></div>
                    <div class="corner bottom-left"></div><div class="corner bottom-right"></div>
                </div>
            </div>
            <button id="btn-switch-entry-data-camera" class="app-sync-button bottom-center" style="z-index: 3; position:fixed;">
                <span class="material-symbols-outlined">cameraswitch</span>
                <span class="button-label">Switch Camera</span>
            </button>
        </div>`;
    scannerWrapper.innerHTML = scannerHTML;

    const videoElementForScanner = scannerWrapper.querySelector('#entry-data-camera-feed');
    const switchButton = scannerWrapper.querySelector('#btn-switch-entry-data-camera');

    if (videoElementForScanner) {
        console.log("displayEntryDataScannerUI: Video element #entry-data-camera-feed found within wrapper.");
        if (switchButton) {
            switchButton.addEventListener('click', switchEntryDataCamera);
        } else {
            console.warn("displayEntryDataScannerUI: Switch camera button not found in wrapper.");
        }
        startEntryDataCamera(null, videoElementForScanner); 
    } else {
        console.error("displayEntryDataScannerUI: CRITICAL - #entry-data-camera-feed not found in scannerWrapper after innerHTML set.");
        alert("Error initializing scanner UI. Video element missing.");
        if (isEntryDataScanningMode) clickQRScan(); 
    }

    document.getElementById('btn-clear-form-fab')?.style.setProperty('display', 'none', 'important');
    document.getElementById('btn-add-created-entry-fab')?.style.setProperty('display', 'none', 'important');
}


// --- Camera and QR Scanning Logic for Entry Data ---

async function startEntryDataCamera(deviceId, videoElementInstance) {
    console.log("startEntryDataCamera: Function called. Device ID:", deviceId);
    // await stopEntryDataCamera(); // Already called by clickQRScan or the function that transitions to this view

    const videoElement = videoElementInstance; 

    if (!videoElement) { 
        console.error("startEntryDataCamera: Video element instance was not provided or is null."); 
        alert("Error: Camera display element missing (passed as null).");
        if (isEntryDataScanningMode) clickQRScan();
        return; 
    }
    console.log("startEntryDataCamera: Using provided video element instance:", videoElement);

    let constraints = { video: { facingMode: 'environment' }, audio: false };
    if (deviceId) constraints.video = { deviceId: { exact: deviceId } };
    console.log("startEntryDataCamera: Using constraints:", constraints);

    try {
        console.log("startEntryDataCamera: Requesting media stream...");
        entryDataCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("startEntryDataCamera: Media stream obtained:", entryDataCameraStream);
        videoElement.srcObject = entryDataCameraStream;
        console.log("startEntryDataCamera: srcObject set on video element.");
        
        const playPromise = videoElement.play();
        console.log("startEntryDataCamera: videoElement.play() called.");

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("startEntryDataCamera: Play promise resolved. Entry data camera started and playing.");
                enumerateEntryDataCameras(); 
                if (entryDataScanAnimationFrameId) cancelAnimationFrame(entryDataScanAnimationFrameId);
                entryDataScanAnimationFrameId = requestAnimationFrame(scanEntryDataFrame);
                console.log("startEntryDataCamera: Scan loop initiated.");
            }).catch(error => { 
                console.error("startEntryDataCamera: Error playing entry data camera:", error);
                alert("Error starting camera for field scan. Check console for details.");
            });
        } else {
            console.warn("startEntryDataCamera: videoElement.play() did not return a promise.");
        }
    } catch (err) {
        console.error("startEntryDataCamera: Error accessing entry data camera (getUserMedia):", err);
        alert("Could not access camera for field scan. Please check permissions and console for details.");
        if (isEntryDataScanningMode) clickQRScan(); 
    }
}

async function stopEntryDataCamera() {
    console.log("stopEntryDataCamera: Attempting to stop.");
    if (entryDataScanAnimationFrameId) {
        cancelAnimationFrame(entryDataScanAnimationFrameId);
        entryDataScanAnimationFrameId = null;
        console.log("stopEntryDataCamera: Scan animation frame canceled.");
    }
    if (entryDataCameraStream) {
        entryDataCameraStream.getTracks().forEach(track => track.stop());
        entryDataCameraStream = null;
        console.log("stopEntryDataCamera: Media stream tracks stopped.");
    }
    const videoElement = document.getElementById('entry-data-camera-feed'); // This ID is inside scannerWrapper
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject = null;
        console.log("stopEntryDataCamera: Video srcObject set to null.");
    }
    const scannerWrapper = document.getElementById('entry-scanner-wrapper');
    if (scannerWrapper) {
        scannerWrapper.remove();
        console.log("stopEntryDataCamera: Scanner wrapper removed.");
    }
}

async function enumerateEntryDataCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        entryDataAvailableCameras = devices.filter(device => device.kind === 'videoinput');
        console.log("enumerateEntryDataCameras: Found cameras:", entryDataAvailableCameras.map(d => d.label));
        
        const scannerWrapper = document.getElementById('entry-scanner-wrapper');
        const switchButton = scannerWrapper ? scannerWrapper.querySelector('#btn-switch-entry-data-camera') : null;

        if (switchButton) {
            switchButton.style.display = entryDataAvailableCameras.length > 1 ? 'flex' : 'none';
        }
    } catch (err) { console.error("Error enumerating entry data cameras:", err); }
}

async function switchEntryDataCamera() {
    if (entryDataAvailableCameras.length > 1) {
        entryDataCurrentCameraIndex = (entryDataCurrentCameraIndex + 1) % entryDataAvailableCameras.length;
        console.log("switchEntryDataCamera: Switching to camera index", entryDataCurrentCameraIndex);
        const scannerWrapper = document.getElementById('entry-scanner-wrapper');
        const videoElement = scannerWrapper ? scannerWrapper.querySelector('#entry-data-camera-feed') : null;
        if (videoElement) {
            await startEntryDataCamera(entryDataAvailableCameras[entryDataCurrentCameraIndex].deviceId, videoElement);
        } else {
            console.error("switchEntryDataCamera: Could not find video element to restart camera.");
        }
    }
}

function scanEntryDataFrame() {
    if (!entryDataCameraStream) return; 

    const scannerWrapper = document.getElementById('entry-scanner-wrapper');
    if (!scannerWrapper) {
        if(entryDataScanAnimationFrameId) cancelAnimationFrame(entryDataScanAnimationFrameId);
        entryDataScanAnimationFrameId = null;
        return;
    }

    const videoElement = scannerWrapper.querySelector('#entry-data-camera-feed');
    const canvasElement = scannerWrapper.querySelector('#entry-data-scan-canvas');
    const targetAreaElement = scannerWrapper.querySelector('#scan-target-area'); 

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
            // Assuming checkIfCodeInTargetArea is globally available from js_AppSync.js
            if (typeof checkIfCodeInTargetArea === 'function' && checkIfCodeInTargetArea(code.location, videoElement, targetAreaElement)) {
                console.log("Entry Data QR Scanned:", code.data);
                alert("Scanned Data for Field: " + code.data + "\n(Auto-filling not yet implemented. This data will be lost when returning to form for now.)");
                clickQRScan(); 
                return; 
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

    if (isEntryDataScanningMode) { 
        stopEntryDataCamera(); 
        showAddEntryMenu(true); 
        isEntryDataScanningMode = false;
        // FAB text/icon/aria-label are reset by showAddEntryMenu re-creating the button
        // Ensure z-index is reset (done in showAddEntryMenu)
    } else { 
        saveCurrentEntryFieldData();
        displayEntryDataScannerUI(); 
        if (fabScanIcon) fabScanIcon.textContent = 'edit_document'; 
        if (fabScanText) fabScanText.textContent = 'Back to Form'; 
        fabScan?.setAttribute('aria-label', 'Back to Form');
        fabScan?.style.setProperty('z-index', '1070', 'important'); 
        fabScan?.style.setProperty('display', 'flex', 'important'); 

        isEntryDataScanningMode = true;
    }
    console.log("clickQRScan: Toggled. New mode:", isEntryDataScanningMode ? "Scan" : "Form");
}


// --- Other FAB click handlers and validation logic ---
function showValidationMessage(message, type = 'error') {
    const container = document.getElementById('entry-validation-message-container');
    if (!container) return; 
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

/**
 * Handles the "Add Created Entry" FAB click.
 * Validates required fields, creates an entry string (only with non-empty fieldValues), and stores it.
 */
function clickAddEntry() {
    console.log("clickAddEntry() called.");
    clearValidationMessages(); 
    const inputElements = document.querySelectorAll('#dynamic-entry-form-area .entry-field-input');
    let allRequiredFilled = true;
    let firstMissingField = null;
    const stringPairArray = [];

    inputElements.forEach(inputEl => {
        const fieldValue = inputEl.value.trim(); // Trim value here
        const fieldName = inputEl.dataset.originalFieldName; 
        const isRequired = inputEl.dataset.isRequired === 'true';

        if (isRequired && fieldValue === "") { // Check trimmed value for required fields
            allRequiredFilled = false;
            inputEl.classList.add('input-error'); 
            if (!firstMissingField) firstMissingField = inputEl;
        } else {
            inputEl.classList.remove('input-error'); 
        }
        // Only add to stringPairArray if fieldName is valid AND trimmed fieldValue is not empty
        if (fieldName && fieldValue !== "") { 
             stringPairArray.push(makeDataFieldStringPair(fieldName, fieldValue));
        }
    });

    if (!allRequiredFilled) {
        showValidationMessage("Please fill all required fields marked with *.", "error");
        if (firstMissingField) firstMissingField.focus(); return; 
    }

    if (typeof makeEntryString !== 'function' || typeof window.addEntry !== 'function') {
        showValidationMessage("Error: System function missing. Cannot save entry.", "error"); return;
    }
    
    const entryString = makeEntryString(stringPairArray);
    console.log("clickAddEntry: Constructed entryString (only non-empty values):", entryString);

    if (entryString) { // Will be empty if all fields were empty
        try {
            window.addEntry(entryString); 
            showAddEntrySuccessScreen(); 
        } catch (error) {
            console.error("clickAddEntry: Error calling window.addEntry():", error.message);
            showValidationMessage(`Error saving entry: ${error.message}`, "error");
        }
    } else { 
        showValidationMessage("No data to save. All fields were empty.", "error"); // Updated message
    }
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
