/**
 * js_AddEntry.js
 * Handles the "Add Entry" section.
 * Dynamically creates a form, provides FABs for actions,
 * and includes a toggleable QR scanner for field data.
 */

// --- State variables for Add Entry mode ---
let isEntryDataScanningMode = false; // Tracks if the field data QR scanner is active
let tempEntryFieldValues = []; // Stores {id, originalFieldNameLC, value}
let currentEditingOriginalData = null; // Stores the original data of the entry being edited for "Clear" functionality

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
 * If entryDataToEdit is provided, it populates the form with that data.
 */
function fillDefaultEntryContent(entryDataToEdit = null) {
    console.log("fillDefaultEntryContent() called. Editing data:", entryDataToEdit);
    const formArea = document.getElementById('dynamic-entry-form-area');
    if (!formArea) {
        console.error("fillDefaultEntryContent: dynamic-entry-form-area not found.");
        return;
    }
    const existingValidationMsg = document.getElementById('entry-validation-message');
    if (existingValidationMsg) existingValidationMsg.remove();

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];
    // Determine the fields to use: either the global dataFields (for a new entry)
    // or the structure from the entry being edited.
    const fieldsToRender = entryDataToEdit ? 
        entryDataToEdit.map(f => ({ 
            fieldName: f.fieldName, 
            fieldValue: f.fieldValue, // This will be the value from the entry being edited
            // Get 'fieldRequired' status from the global dataFields setup, matching by fieldName
            fieldRequired: (currentDataFields.find(df => df.fieldName === f.fieldName) || {}).fieldRequired || false 
        })) : 
        currentDataFields;

    if (fieldsToRender.length === 0) {
        formArea.innerHTML = "<p>No form fields defined. Please perform App Sync or check setup.</p>";
        // Optionally hide FABs if no form can be shown
        document.getElementById('btn-clear-form-fab')?.style.setProperty('display', 'none', 'important');
        document.getElementById('btn-scan-entry-data-fab')?.style.setProperty('display', 'none', 'important');
        document.getElementById('btn-add-created-entry-fab')?.style.setProperty('display', 'none', 'important');
        return;
    }

    let tableHTML = `
        <div id="entry-validation-message-container" style="margin-bottom: 10px;"></div> 
        <table id="entry-table" class="entry-form-table">
            <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
            <tbody>`;
    fieldsToRender.forEach((field, index) => {
        const fieldNameDisplay = field.fieldRequired ? `${field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}*` : field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        let initialValue = field.fieldValue; // This is either from dataFields default or from entryDataToEdit
        if (!entryDataToEdit && field.fieldValue && field.fieldValue.toUpperCase() === "NOW()") { // Only process NOW() for new entries
            initialValue = formatDateTime(new Date());
        }
        const escapedInitialValue = initialValue.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        tableHTML += `
            <tr>
                <td><label for="entry-field-${index}">${fieldNameDisplay}</label></td>
                <td><input type="text" id="entry-field-${index}" class="entry-field-input" 
                           data-original-field-name="${field.fieldName.replace(/"/g, "&quot;")}"
                           data-is-required="${field.fieldRequired === true}" value="${escapedInitialValue}">
                </td>
            </tr>`;
    });
    tableHTML += `</tbody></table><p class="entry-table-footnote">* Required field</p>`;
    formArea.innerHTML = tableHTML;
    console.log("fillDefaultEntryContent: Entry table populated.");
}

/**
 * Saves the current values from the entry form inputs into tempEntryFieldValues.
 */
function saveCurrentEntryFieldData() {
    tempEntryFieldValues = [];
    const inputElements = document.querySelectorAll('#dynamic-entry-form-area .entry-field-input');
    inputElements.forEach(inputEl => {
        const originalFieldName = inputEl.dataset.originalFieldName || ""; 
        tempEntryFieldValues.push({
            id: inputEl.id, 
            originalFieldNameLC: originalFieldName.toLowerCase(), 
            value: inputEl.value
        });
    });
    console.log("saveCurrentEntryFieldData: Saved form values:", tempEntryFieldValues);
}

/**
 * Restores values to the entry form inputs from tempEntryFieldValues.
 */
function restoreEntryFieldData() {
    console.log("restoreEntryFieldData: Attempting to restore values from:", tempEntryFieldValues);
    if (tempEntryFieldValues.length > 0) {
        tempEntryFieldValues.forEach(savedField => {
            const inputEl = document.getElementById(savedField.id);
            if (inputEl) {
                inputEl.value = savedField.value;
            } else {
                console.warn(`restoreEntryFieldData: Could not find input with ID ${savedField.id}`);
            }
        });
    }
}

/**
 * Displays the UI for the Add Entry mode (form and FABs).
 */
function showAddEntryMenu(isRestoring = false) {
    console.log("showAddEntryMenu called. isRestoring:", isRestoring);
    let entryDataForEditing = null;
    currentEditingOriginalData = null; // Clear any previous edit data backup

    if (window.tmp_EntryForEdit) {
        console.log("showAddEntryMenu: Editing mode detected. Data:", window.tmp_EntryForEdit);
        entryDataForEditing = window.tmp_EntryForEdit;
        currentEditingOriginalData = JSON.parse(JSON.stringify(window.tmp_EntryForEdit)); // Backup for clear
        window.tmp_EntryForEdit = null; 
        isRestoring = false; 
    }

    if (typeof window.clearMainPane === 'function') window.clearMainPane();
    else console.error("showAddEntryMenu: clearMainPane() function is not defined.");

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];

    if (currentDataFields.length === 0 && !entryDataForEditing) { 
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
                    <h2 style="text-align:center;color:var(--md-sys-color-primary);margin-bottom:10px;margin-top:10px;">
                        ${entryDataForEditing ? 'Edit Entry' : 'Create New Entry'}
                    </h2>
                </div>
                <button id="btn-scan-entry-data-fab" class="fab-entry-mode fab-bottom-left" aria-label="Scan Data">
                    <span class="material-symbols-outlined">document_scanner</span><span class="fab-text">Scan Data</span>
                </button>
                <button id="btn-add-created-entry-fab" class="fab-entry-mode fab-bottom-right" aria-label="${entryDataForEditing ? 'Save Changes' : 'Add Entry'}">
                    <span class="material-symbols-outlined">${entryDataForEditing ? 'save' : 'add'}</span>
                    <span class="fab-text">${entryDataForEditing ? 'Save Changes' : 'Add Entry'}</span>
                </button>
            </div>`;
        if (typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(addEntryViewHTML);
        
        fillDefaultEntryContent(entryDataForEditing); 
        
        if (isRestoring && !entryDataForEditing) { 
            restoreEntryFieldData();
        }

        document.getElementById('btn-clear-form-fab')?.style.setProperty('display', 'flex', 'important');
        const fabScan = document.getElementById('btn-scan-entry-data-fab');
        if(fabScan) {
            fabScan.style.setProperty('display', 'flex', 'important');
            fabScan.style.removeProperty('z-index'); 
        }
        document.getElementById('btn-add-created-entry-fab')?.style.setProperty('display', 'flex', 'important');

        document.getElementById('btn-clear-form-fab')?.addEventListener('click', () => clickClearEntry(!!entryDataForEditing || !!currentEditingOriginalData));
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

    const tempVideoBg = ""; 
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

    requestAnimationFrame(() => {
        const currentScannerWrapper = document.getElementById('entry-scanner-wrapper'); 
        if (!currentScannerWrapper || !currentScannerWrapper.contains(document.getElementById('entry-data-camera-feed'))) {
            console.error("displayEntryDataScannerUI (deferred): Scanner wrapper or video element no longer in DOM. Aborting camera start.");
            if (isEntryDataScanningMode) clickQRScan(); 
            return;
        }
        const videoElementForScanner = currentScannerWrapper.querySelector('#entry-data-camera-feed');
        const switchButton = currentScannerWrapper.querySelector('#btn-switch-entry-data-camera');
        if (videoElementForScanner) {
            if (switchButton) switchButton.addEventListener('click', switchEntryDataCamera);
            startEntryDataCamera(null, videoElementForScanner); 
        } else {
            console.error("displayEntryDataScannerUI (deferred): CRITICAL - #entry-data-camera-feed not found.");
            alert("Error initializing scanner UI. Video element missing.");
            if (isEntryDataScanningMode) clickQRScan(); 
        }
    });
    document.getElementById('btn-clear-form-fab')?.style.setProperty('display', 'none', 'important');
    document.getElementById('btn-add-created-entry-fab')?.style.setProperty('display', 'none', 'important');
}


// --- Camera and QR Scanning Logic for Entry Data ---
async function startEntryDataCamera(deviceId, videoElementInstance) {
    const videoElement = videoElementInstance; 
    if (!videoElement) { 
        console.error("startEntryDataCamera: Video element instance was not provided or is null."); 
        if (isEntryDataScanningMode) clickQRScan(); return; 
    }
    let constraints = { video: { facingMode: 'environment' }, audio: false };
    if (deviceId) constraints.video = { deviceId: { exact: deviceId } };
    try {
        entryDataCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = entryDataCameraStream;
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("Entry data camera started and playing.");
                enumerateEntryDataCameras(); 
                if (entryDataScanAnimationFrameId) cancelAnimationFrame(entryDataScanAnimationFrameId);
                entryDataScanAnimationFrameId = requestAnimationFrame(scanEntryDataFrame);
            }).catch(error => { console.error("Error playing entry data camera:", error); });
        }
    } catch (err) {
        console.error("Error accessing entry data camera (getUserMedia):", err);
        if (isEntryDataScanningMode) clickQRScan(); 
    }
}

window.stopEntryDataCamera = async function() { // Make it globally accessible
    console.log("stopEntryDataCamera called.");
    isEntryDataScanningMode = false; // Ensure this flag is reset when explicitly stopping
    if (entryDataScanAnimationFrameId) {
        cancelAnimationFrame(entryDataScanAnimationFrameId);
        entryDataScanAnimationFrameId = null;
    }
    if (entryDataCameraStream) {
        entryDataCameraStream.getTracks().forEach(track => track.stop());
        entryDataCameraStream = null;
    }
    const scannerWrapper = document.getElementById('entry-scanner-wrapper');
    if (scannerWrapper) scannerWrapper.remove();
}

async function enumerateEntryDataCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        entryDataAvailableCameras = devices.filter(device => device.kind === 'videoinput');
        const scannerWrapper = document.getElementById('entry-scanner-wrapper');
        const switchButton = scannerWrapper ? scannerWrapper.querySelector('#btn-switch-entry-data-camera') : null;
        if (switchButton) switchButton.style.display = entryDataAvailableCameras.length > 1 ? 'flex' : 'none';
    } catch (err) { console.error("Error enumerating entry data cameras:", err); }
}

async function switchEntryDataCamera() {
    if (entryDataAvailableCameras.length > 1) {
        entryDataCurrentCameraIndex = (entryDataCurrentCameraIndex + 1) % entryDataAvailableCameras.length;
        const scannerWrapper = document.getElementById('entry-scanner-wrapper');
        const videoElement = scannerWrapper ? scannerWrapper.querySelector('#entry-data-camera-feed') : null;
        if (videoElement) {
            await startEntryDataCamera(entryDataAvailableCameras[entryDataCurrentCameraIndex].deviceId, videoElement);
        }
    }
}

function scanEntryDataFrame() {
    if (!entryDataCameraStream) return; 
    const scannerWrapper = document.getElementById('entry-scanner-wrapper');
    if (!scannerWrapper) {
        if(entryDataScanAnimationFrameId) cancelAnimationFrame(entryDataScanAnimationFrameId);
        entryDataScanAnimationFrameId = null; return;
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
                let qrScannedDataArray = null;
                let updatedFieldsList = []; 

                try {
                    if (typeof parseQRDataEntry === 'function') {
                        qrScannedDataArray = parseQRDataEntry(code.data); 
                    } else {
                        throw new Error("parseQRDataEntry function not available.");
                    }

                    if (qrScannedDataArray) { 
                        console.log("Parsed QR data for fields:", qrScannedDataArray);
                        const qrDataMap = qrScannedDataArray.reduce((map, item) => {
                            map[item.fieldName.toLowerCase()] = item.fieldValue;
                            return map;
                        }, {});
                        tempEntryFieldValues.forEach(tempField => {
                            if (tempField.value.trim() === "" && qrDataMap.hasOwnProperty(tempField.originalFieldNameLC)) {
                                const newValue = qrDataMap[tempField.originalFieldNameLC];
                                if (tempField.value !== newValue) { 
                                    tempField.value = newValue;
                                    const originalCasingFieldName = document.getElementById(tempField.id)?.dataset.originalFieldName || tempField.originalFieldNameLC;
                                    updatedFieldsList.push(originalCasingFieldName); 
                                }
                            }
                        });
                        if (updatedFieldsList.length > 0) {
                            alert("Updated fields: " + updatedFieldsList.join(", "));
                        } else {
                            alert("No empty fields were updated by the QR scan.");
                        }
                    } 
                } catch (parseError) {
                    console.error("Error parsing scanned QR data:", parseError.message);
                    alert("Invalid QR Code Scanned: " + parseError.message + "\nExpected format: fieldName1:fieldValue1;fieldName2:fieldValue2;...");
                }
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
        stopEntryDataCamera(); // This now also resets isEntryDataScanningMode
        showAddEntryMenu(true); // Pass true to restore (potentially updated) values
        // isEntryDataScanningMode is already false due to stopEntryDataCamera
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

    if (entryString) { 
        try {
            window.addEntry(entryString); 
            showAddEntrySuccessScreen(); 
        } catch (error) {
            console.error("clickAddEntry: Error calling window.addEntry():", error.message);
            showValidationMessage(`Error saving entry: ${error.message}`, "error");
        }
    } else { 
        showValidationMessage("No data to save. All fields were empty.", "error"); 
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

function clickClearEntry(wasEditing = false) {
    console.log("clickClearEntry() called. wasEditing:", wasEditing);
    clearValidationMessages();
    if (wasEditing && currentEditingOriginalData) {
        fillDefaultEntryContent(currentEditingOriginalData);
        console.log("Form fields reverted to original edit state.");
    } else {
        fillDefaultEntryContent(null); 
        console.log("Form fields cleared/reset to defaults for new entry.");
    }
    const titleElement = document.querySelector('#dynamic-entry-form-area h2');
    if(titleElement) titleElement.textContent = 'Create New Entry';
    const addFab = document.getElementById('btn-add-created-entry-fab');
    if(addFab) {
        addFab.querySelector('.material-symbols-outlined').textContent = 'add';
        addFab.querySelector('.fab-text').textContent = 'Add Entry';
        addFab.setAttribute('aria-label', 'Add Entry');
    }
    currentEditingOriginalData = null; 
}
