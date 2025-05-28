/**
 * js_AppSync.js
 * Handles the "App Sync" section, including Form Setup scanning
 * and QR Entry Generation.
 */

// Global variables
let currentCameraStream = null;
let availableCameras = [];
let currentCameraIndex = 0;
let scanAnimationFrameId = null; // To control the scanning loop

// Declare handlers in a scope accessible by both start and stop functions
let _handleLoadedMetadata = null;
let _handlePlaying = null;
let _handleCanPlay = null;


/**
 * Main function called when the "App Sync" navigation button is pressed.
 * Defaults to showing the Form Setup QR scanner.
 */
function showAppSyncMenu() {
    showFormSetupScan();
}

/**
 * Sets up and displays the UI for the "Form Setup Upload" mode (QR Scanner).
 */
function showFormSetupScan() {
    const formSetupHTML = `
        <div id="app-sync-container">
            <video id="camera-feed" playsinline autoplay muted></video>
            <canvas id="scan-canvas" style="display: none;"></canvas>

            <div id="camera-overlay">
                <div id="scan-target-area">
                    <div class="corner top-left"></div>
                    <div class="corner top-right"></div>
                    <div class="corner bottom-left"></div>
                    <div class="corner bottom-right"></div>
                </div>
            </div>

            <button id="btn-export-data-mode" class="app-sync-button top-left">
                <span class="material-symbols-outlined">qr_code_2_add</span>
                <span class="button-label">Export Data</span>
            </button>

            <button id="btn-switch-camera" class="app-sync-button bottom-center">
                <span class="material-symbols-outlined">cameraswitch</span>
                 <span class="button-label">Switch Camera</span>
            </button>
        </div>
    `;

    window.injectHTMLToMainPane(formSetupHTML);

    document.getElementById('btn-export-data-mode').addEventListener('click', showQREntryGen);
    document.getElementById('btn-switch-camera').addEventListener('click', switchCamera);

    startCamera();
}

/**
 * Starts the camera feed and displays it in the <video> element.
 */
async function startCamera(deviceId) {
    await stopCamera(); 

    const videoElement = document.getElementById('camera-feed');
    if (!videoElement) {
        console.error("startCamera: Camera feed element not found.");
        return;
    }

    let constraints = { video: { facingMode: 'environment' }, audio: false };
    if (deviceId) {
        constraints.video = { deviceId: { exact: deviceId } };
    }

    try {
        currentCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = currentCameraStream;

        _handleLoadedMetadata = async () => {
            try { await enumerateCameras(); } catch (err) { console.error("Error during enumerateCameras:", err); }
        };
        _handleCanPlay = async () => {
            try { await videoElement.play(); } catch (playError) {
                console.error("Error trying to play video:", playError);
                window.injectHTMLToMainPane(`<div class="camera-error"><h2>Camera Play Error</h2><p>Could not play the video stream.</p><p><i>Error: ${playError.message}</i></p><button onclick="showAppSyncMenu()">Try Again</button></div>`);
            }
        };
        _handlePlaying = () => {
            if (scanAnimationFrameId) cancelAnimationFrame(scanAnimationFrameId);
            scanAnimationFrameId = requestAnimationFrame(scanFrame); 
        };

        videoElement.addEventListener('loadedmetadata', _handleLoadedMetadata);
        videoElement.addEventListener('canplay', _handleCanPlay);
        videoElement.addEventListener('playing', _handlePlaying);

    } catch (err) {
        console.error("Error accessing camera (getUserMedia):", err);
        window.injectHTMLToMainPane(`<div class="camera-error"><h2>Camera Access Error</h2><p>Could not access the camera. Please ensure you have granted permission.</p><p><i>Error: ${err.message}</i></p><button onclick="showAppSyncMenu()">Try Again</button></div>`);
    }
}

/**
 * Stops the current camera stream, scanning loop, and removes event listeners.
 */
window.stopCamera = async function() {
    if (scanAnimationFrameId) {
        cancelAnimationFrame(scanAnimationFrameId);
        scanAnimationFrameId = null;
    }

    const videoElement = document.getElementById('camera-feed');
    if (videoElement) {
        if (_handleLoadedMetadata) videoElement.removeEventListener('loadedmetadata', _handleLoadedMetadata);
        if (_handleCanPlay) videoElement.removeEventListener('canplay', _handleCanPlay);
        if (_handlePlaying) videoElement.removeEventListener('playing', _handlePlaying);
        _handleLoadedMetadata = null; _handleCanPlay = null; _handlePlaying = null;

        if (!videoElement.paused) videoElement.pause();
        if (videoElement.srcObject) videoElement.srcObject = null; 
    }

    if (currentCameraStream) {
        currentCameraStream.getTracks().forEach(track => track.stop());
        currentCameraStream = null;
    }
};

/**
 * Enumerates available video input devices.
 */
async function enumerateCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        const switchButton = document.getElementById('btn-switch-camera');
        if (switchButton) {
           switchButton.style.display = availableCameras.length > 1 ? 'flex' : 'none';
        }
    } catch (err) { console.error("Error enumerating cameras:", err); }
}

/**
 * Switches to the next available camera.
 */
async function switchCamera() {
    if (availableCameras.length > 1) {
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        await startCamera(availableCameras[currentCameraIndex].deviceId);
    }
}

/**
 * Continuously scans the video feed for QR codes.
 */
function scanFrame() {
    if (!currentCameraStream || !document.getElementById('camera-feed')?.srcObject) {
        if(scanAnimationFrameId) cancelAnimationFrame(scanAnimationFrameId);
        scanAnimationFrameId = null; return;
    }

    const videoElement = document.getElementById('camera-feed');
    const canvasElement = document.getElementById('scan-canvas');
    const targetAreaElement = document.getElementById('scan-target-area');

    if (!videoElement || !canvasElement || !targetAreaElement || 
        videoElement.readyState < videoElement.HAVE_ENOUGH_DATA ||
        videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        scanAnimationFrameId = requestAnimationFrame(scanFrame); return;
    }
    
    if (canvasElement.width !== videoElement.videoWidth) canvasElement.width = videoElement.videoWidth;
    if (canvasElement.height !== videoElement.videoHeight) canvasElement.height = videoElement.videoHeight;
    
    const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
    canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    try {
        const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code && code.data && checkIfCodeInTargetArea(code.location, videoElement, targetAreaElement)) {
            console.log("QR Code detected INSIDE target area:", code.data.substring(0,50)+"..."); 
            parseFormSetup(code.data); 
            return; 
        }
    } catch (error) { console.error("ScanFrame: Error during QR processing:", error); }

    scanAnimationFrameId = requestAnimationFrame(scanFrame);
}

/**
 * Checks if the center of a detected QR code falls within the visual target area.
 */
function checkIfCodeInTargetArea(qrCodeLocation, videoElement, targetAreaDiv) {
    const videoIntrinsicWidth = videoElement.videoWidth, videoIntrinsicHeight = videoElement.videoHeight;
    const videoDisplayWidth = videoElement.offsetWidth, videoDisplayHeight = videoElement.offsetHeight; 

    if (videoIntrinsicWidth === 0 || videoIntrinsicHeight === 0) return false;

    const targetRect = targetAreaDiv.getBoundingClientRect(), videoRect = videoElement.getBoundingClientRect();   
    const targetRelX = targetRect.left - videoRect.left, targetRelY = targetRect.top - videoRect.top;
    const targetRelWidth = targetRect.width, targetRelHeight = targetRect.height;
    const videoIntrinsicRatio = videoIntrinsicWidth / videoIntrinsicHeight, videoDisplayRatio = videoDisplayWidth / videoDisplayHeight;
    let scale, offsetX = 0, offsetY = 0;

    if (videoIntrinsicRatio > videoDisplayRatio) {
        scale = videoDisplayHeight / videoIntrinsicHeight; offsetX = (videoDisplayWidth - videoIntrinsicWidth * scale) / 2; 
    } else {
        scale = videoDisplayWidth / videoIntrinsicWidth; offsetY = (videoDisplayHeight - videoIntrinsicHeight * scale) / 2; 
    }

    const targetIntrinsicX = (targetRelX - offsetX) / scale, targetIntrinsicY = (targetRelY - offsetY) / scale;
    const targetIntrinsicWidth = targetRelWidth / scale, targetIntrinsicHeight = targetRelHeight / scale;
    const qrCenterX = (qrCodeLocation.topLeftCorner.x + qrCodeLocation.bottomRightCorner.x) / 2;
    const qrCenterY = (qrCodeLocation.topLeftCorner.y + qrCodeLocation.bottomRightCorner.y) / 2;
    
    return (qrCenterX >= targetIntrinsicX && qrCenterX <= (targetIntrinsicX + targetIntrinsicWidth) &&
            qrCenterY >= targetIntrinsicY && qrCenterY <= (targetIntrinsicY + targetIntrinsicHeight));
}

/**
 * Processes the scanned Form Setup QR code data.
 */
async function parseFormSetup(data) {
    console.log("parseFormSetup: Scanned QR Data:", data.substring(0,100)+"...");
    await window.stopCamera(); 

    if (typeof window.deleteAllEntryData === 'function') {
        window.deleteAllEntryData(); 
        console.log("parseFormSetup: deleteAllEntryData() called.");
        if (typeof LAST_ENTRY_LENGTH !== 'undefined') {
             LAST_ENTRY_LENGTH = 50; 
             console.log("parseFormSetup: LAST_ENTRY_LENGTH reset to 50.");
        }
        if(typeof window.updateStorageCounter === 'function') {
            window.updateStorageCounter(); 
        }
    } else {
        console.error("parseFormSetup: deleteAllEntryData() function is not defined.");
    }
    
    let htmlOutput = '';
    const parseSuccess = typeof parseDataField === 'function' && parseDataField(data);

    if (parseSuccess) {
        console.log("parseFormSetup: parseDataField returned true.");
        const fields = typeof getDataFields === 'function' ? getDataFields() : [];
        
        htmlOutput = `
            <div class="form-setup-result-container" style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                <h2 style="color: var(--md-sys-color-primary); margin-bottom: 10px;">Form Fields Parsed</h2>
                <p style="margin-bottom: 20px;">The following fields are ready for data entry:</p>
        `;

        if (fields.length > 0) {
            htmlOutput += `
                <div class="data-table-container" style="max-width: 600px; margin: 0 auto 20px auto; background-color: var(--md-sys-color-surface); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="background-color: var(--md-sys-color-surface-container);">
                            <tr>
                                <th style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline);">Field Name</th>
                                <th style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline);">Initial Value</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            fields.forEach((field, index) => {
                const fieldNameDisplay = field.fieldRequired ? `${field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}*` : field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                htmlOutput += `
                    <tr style="background-color: ${index % 2 === 0 ? 'var(--md-sys-color-surface)' : 'var(--md-sys-color-background)'};">
                        <td style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline); white-space: nowrap;">${fieldNameDisplay}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline); font-style: ${field.fieldValue === "" ? 'italic' : 'normal'}; color: ${field.fieldValue === "" ? '#757575' : 'inherit'};">${field.fieldValue === "" ? '(empty)' : field.fieldValue.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                    </tr>
                `;
            });
            htmlOutput += `
                        </tbody>
                    </table>
                </div>
                <p style="font-size: 0.9em; text-align: left; margin-top: 10px; max-width: 600px; margin-left: auto; margin-right: auto;"><em>* FieldNames with asterisks are required to be filled-up.</em></p>
            `;
        } else {
            htmlOutput += `<p style="margin-top: 15px; color: var(--md-sys-color-secondary);">No data fields were found in the QR code after parsing.</p>`;
        }
        htmlOutput += `
                <div style="margin-top: 25px;">
                    <button onclick="showFormSetupScan()" style="padding: 10px 15px; margin-right: 10px; cursor:pointer; background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); border: none; border-radius: 20px; font-weight: 500;">Scan Another Setup QR</button>
                </div>
            </div>
        `;
    } else {
        console.log("parseFormSetup: parseDataField returned false or function not found.");
        htmlOutput = `
            <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                <h2 style="color: #B00020;">Error Parsing QR Code</h2>
                <p>Invalid format. Please scan a valid Form Setup QR code (e.g., Name:Value:T;Age::F).</p>
                <button onclick="showFormSetupScan()" style="padding: 10px 15px; margin-top: 25px; cursor:pointer; background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border: none; border-radius: 20px; font-weight: 500;">Try Scanning Again</button>
            </div>
        `;
    }
    window.injectHTMLToMainPane(htmlOutput);
}

/**
 * Switches to "QR Entry Generation" mode.
 * Displays a QR code of the current questEntryContent cookie.
 */
async function showQREntryGen() {
    await window.stopCamera(); 
    window.clearMainPane(); 

    const entryData = typeof getAllEntryData === 'function' ? getAllEntryData() : "";
    let qrContentHTML;

    if (entryData) {
        qrContentHTML = `
            <p style="margin-bottom: 15px; font-size: 16px;">Scan this QR code with your target application:</p>
            <div id="qr-code-display-area" style="width: 256px; height: 256px; margin: 0 auto 20px auto; padding: 10px; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
        `;
    } else {
        qrContentHTML = `
            <p id="no-data-for-qr-message" style="margin-bottom: 20px; font-size: 16px; color: var(--md-sys-color-secondary);">
                No data available to generate QR code. Add some entries first.
            </p>
        `;
    }

    const QREntryGenHTML = `
        <div class="qr-generation-container" style="padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%;">
            <button id="btn-scan-setup-mode" class="app-sync-button top-left" style="position: relative; margin-bottom: 25px; align-self: flex-start;">
                <span class="material-symbols-outlined">qr_code_scanner</span>
                <span class="button-label">Form Setup</span>
            </button>
            <h2 style="margin-bottom: 10px; color: var(--md-sys-color-primary); width: 100%; text-align: center;">Export Data Entries</h2>
            ${qrContentHTML}
        </div>
    `;
    window.injectHTMLToMainPane(QREntryGenHTML);

    document.getElementById('btn-scan-setup-mode').addEventListener('click', showFormSetupScan);

    if (entryData) {
        const qrCodeElement = document.getElementById('qr-code-display-area');
        if (qrCodeElement) {
            try {
                new QRCode(qrCodeElement, {
                    text: entryData,
                    width: 256,
                    height: 256,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H 
                });
                console.log("QR Code for export generated.");
            } catch (e) {
                console.error("Error generating QR code for export:", e);
                qrCodeElement.innerHTML = "<p style='color:red;'>Error generating QR code.</p>";
            }
        }
    }
}
