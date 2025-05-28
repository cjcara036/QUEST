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

            <button id="btn-generate-qr-mode" class="app-sync-button top-left">
                <span class="material-symbols-outlined">qr_code_2_add</span>
                <span class="button-label">Generate QR</span>
            </button>

            <button id="btn-switch-camera" class="app-sync-button bottom-center">
                <span class="material-symbols-outlined">cameraswitch</span>
                 <span class="button-label">Switch Camera</span>
            </button>
        </div>
    `;

    window.injectHTMLToMainPane(formSetupHTML);

    document.getElementById('btn-generate-qr-mode').addEventListener('click', showQREntryGen);
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

    // Alert removed as per request
    // alert(`Form Setup QR Code Scanned. Previous entries will be cleared and new form fields will be parsed.`);

    if (typeof window.deleteAllEntryData === 'function') {
        window.deleteAllEntryData(); 
        console.log("parseFormSetup: deleteAllEntryData() called.");
        // Since deleteAllEntryData in the provided main_EntryStorage.js doesn't reset LAST_ENTRY_LENGTH or update counter:
        LAST_ENTRY_LENGTH = 50; // Reset to default
        console.log("parseFormSetup: LAST_ENTRY_LENGTH reset to 50.");
        if(typeof window.updateStorageCounter === 'function') {
            window.updateStorageCounter(); // Update UI counter
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
            <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                <h2 style="color: var(--md-sys-color-primary);">Form Fields Successfully Parsed!</h2>
                <p>The following fields have been set up for data entry:</p>
        `;

        if (fields.length > 0) {
            htmlOutput += `
                <div style="max-width: 600px; margin: 20px auto; background-color: var(--md-sys-color-surface); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
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
                htmlOutput += `
                    <tr style="background-color: ${index % 2 === 0 ? 'var(--md-sys-color-surface)' : 'var(--md-sys-color-background)'};">
                        <td style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline);">${field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline); font-style: ${field.fieldValue === "" ? 'italic' : 'normal'}; color: ${field.fieldValue === "" ? '#757575' : 'inherit'};">${field.fieldValue === "" ? '(empty)' : field.fieldValue.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                    </tr>
                `;
            });
            htmlOutput += `
                        </tbody>
                    </table>
                </div>
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
                <p>Invalid format. Please scan a valid Form Setup QR code.</p>
                <button onclick="showFormSetupScan()" style="padding: 10px 15px; margin-top: 25px; cursor:pointer; background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border: none; border-radius: 20px; font-weight: 500;">Try Scanning Again</button>
            </div>
        `;
    }
    window.injectHTMLToMainPane(htmlOutput);
}

/**
 * Switches to "QR Entry Generation" mode.
 */
async function showQREntryGen() {
    await window.stopCamera(); 
    window.clearMainPane(); 
    window.injectHTMLToMainPane(`
        <div style="padding: 20px; text-align: center;">
            <h2>Generate Export QR Code</h2>
            <p>This section will allow you to generate a QR code containing all your collected data.</p>
            <div id="export-qr-code-placeholder" style="width: 250px; height: 250px; background: #eee; margin: 20px auto; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                (QR Code Will Appear Here)
            </div>
            <button onclick="showFormSetupScan()" style="padding: 10px 15px; margin-top: 15px; cursor:pointer;">Back to Scan Setup QR</button>
        </div>
    `);
}
