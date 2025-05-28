/**
 * js_AddEntry.js
 * Handles the "Add Entry" section.
 * Dynamically creates a form based on dataFields and provides FABs for actions.
 */

/**
 * Called when the "Add Entry" navigation button is pressed.
 * Checks if dataFields are populated. If not, prompts user to sync.
 * Otherwise, displays the data entry UI with FABs and a form area.
 */
function showAddEntryMenu() {
    console.log("showAddEntryMenu() called.");

    if (typeof window.clearMainPane === 'function') {
        window.clearMainPane();
    } else {
        console.error("showAddEntryMenu: clearMainPane() function is not defined.");
        const mainPane = document.getElementById('main-pane');
        if (mainPane) mainPane.innerHTML = '';
    }

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];

    if (currentDataFields.length === 0) {
        console.log("showAddEntryMenu: dataFields is empty. Prompting user to sync.");
        const promptToSyncHTML = `
            <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                <h2 style="color: var(--md-sys-color-secondary); margin-bottom: 15px;">Setup Required</h2>
                <p>No form fields are currently defined.</p>
                <p>Please go to <strong>App Sync</strong> and scan a Form Setup QR code first before adding entries.</p>
                <button onclick="document.getElementById('btn-sync').click()" style="margin-top: 25px; padding: 10px 20px; background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border: none; border-radius: 20px; font-weight: 500; cursor: pointer;">
                    Go to App Sync
                </button>
            </div>
        `;
        if (typeof window.injectHTMLToMainPane === 'function') {
            window.injectHTMLToMainPane(promptToSyncHTML);
        } else {
            console.error("showAddEntryMenu: injectHTMLToMainPane() function is not defined.");
            const mainPane = document.getElementById('main-pane');
            if (mainPane) mainPane.innerHTML = promptToSyncHTML;
        }
    } else {
        console.log("showAddEntryMenu: dataFields found. Building Add Entry UI.");
        
        const addEntryViewHTML = `
            <div class="add-entry-view-container">
                <button id="btn-clear-form-fab" class="fab-entry-mode fab-top-left" aria-label="Clear Form">
                    <span class="material-symbols-outlined">delete</span>
                    <span class="fab-text">Clear Form</span>
                </button>

                <div id="dynamic-entry-form-area" style="padding: 20px 20px 80px 20px; /* Bottom padding to avoid overlap with FABs */ text-align: left; margin: 0 auto; max-width: 600px;">
                    <h2 style="text-align:center; color: var(--md-sys-color-primary); margin-bottom: 20px;">Create New Entry</h2>
                    <p style="text-align:center; margin-bottom: 25px;"><em>(Form fields based on setup will appear here. For now, this is a placeholder.)</em></p>
                    </div>

                <button id="btn-scan-entry-data-fab" class="fab-entry-mode fab-bottom-left" aria-label="Scan Data">
                    <span class="material-symbols-outlined">document_scanner</span>
                    <span class="fab-text">Scan Data</span>
                </button>

                <button id="btn-add-created-entry-fab" class="fab-entry-mode fab-bottom-right" aria-label="Add Entry">
                    <span class="material-symbols-outlined">add</span>
                    <span class="fab-text">Add Entry</span>
                </button>
            </div>
        `;
        
        if (typeof window.injectHTMLToMainPane === 'function') {
            window.injectHTMLToMainPane(addEntryViewHTML);
        } else {
            console.error("showAddEntryMenu: injectHTMLToMainPane() function is not defined.");
            const mainPane = document.getElementById('main-pane');
            if (mainPane) mainPane.innerHTML = addEntryViewHTML;
        }

        // Add event listeners for the new FABs
        const btnClear = document.getElementById('btn-clear-form-fab');
        const btnScanData = document.getElementById('btn-scan-entry-data-fab');
        const btnAddEntry = document.getElementById('btn-add-created-entry-fab');

        if (btnClear) btnClear.addEventListener('click', clickClearEntry);
        if (btnScanData) btnScanData.addEventListener('click', clickQRScan);
        if (btnAddEntry) btnAddEntry.addEventListener('click', clickAddEntry);

        // Setup hover/touch listeners for FAB expansion
        document.querySelectorAll('.fab-entry-mode').forEach(fab => {
            fab.addEventListener('mouseenter', () => fab.classList.add('expanded'));
            fab.addEventListener('mouseleave', () => fab.classList.remove('expanded'));
            fab.addEventListener('focus', () => fab.classList.add('expanded'));
            fab.addEventListener('blur', () => fab.classList.remove('expanded'));
            // For touch devices, a simple click might be better than long press for expansion,
            // or we can use mousedown/touchstart for expansion and mouseup/touchend for action.
            // Current CSS handles expansion on hover/focus. For touch, :active state can be used or JS.
            // Let's ensure :active also triggers expansion via CSS for tap-and-hold feel.
        });


        // TODO: Call a function to dynamically render form fields into #dynamic-entry-form-area
        // renderDynamicFormFields(currentDataFields); 
        console.log("TODO: Call renderDynamicFormFields with:", currentDataFields);
    }
}

/**
 * Placeholder function called when the "Add Created Entry" FAB is clicked.
 */
function clickAddEntry() {
    console.log("clickAddEntry() called. (Placeholder)");
    // TODO: Logic to gather data from the dynamic form and save it.
    alert("Add Entry button clicked! (Functionality to be implemented)");
}

/**
 * Placeholder function called when the "QR Scan" FAB is clicked.
 */
function clickQRScan() {
    console.log("clickQRScan() called. (Placeholder)");
    // TODO: Logic to initiate QR scanning for individual data fields.
    alert("QR Scan Data button clicked! (Functionality to be implemented)");
}

/**
 * Placeholder function called when the "Clear" FAB is clicked.
 */
function clickClearEntry() {
    console.log("clickClearEntry() called. (Placeholder)");
    // TODO: Logic to clear all input fields in the dynamic form.
    alert("Clear Form button clicked! (Functionality to be implemented)");
    // Example: if form fields are rendered, you'd iterate and clear them.
    // const formContainer = document.getElementById('dynamic-entry-form-area');
    // formContainer.querySelectorAll('input, textarea').forEach(input => input.value = '');
}

// Function to dynamically render form fields (to be developed further)
// function renderDynamicFormFields(fields) {
//     const container = document.getElementById('dynamic-entry-form-area');
//     if (!container) return;
//     container.innerHTML = ''; // Clear previous form
//     fields.forEach((field, index) => {
//         // ... logic to create label and input for each field ...
//     });
// }
