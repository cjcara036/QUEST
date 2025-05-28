/**
 * js_AddEntry.js
 * Handles the "Add Entry" section.
 * Dynamically creates a form based on dataFields and provides FABs for actions.
 */

/**
 * Helper function to format a Date object as "mm/dd/yyyy hh:mm" (24-hour).
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date-time string.
 */
function formatDateTime(date) {
    const pad = (num) => String(num).padStart(2, '0');
    const month = pad(date.getMonth() + 1); // Months are 0-indexed
    const day = pad(date.getDate());
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}

/**
 * Creates and populates the "EntryTable" (dynamic form) based on dataFields.
 * Injects the table into the 'dynamic-entry-form-area' div.
 */
function fillDefaultEntryContent() {
    console.log("fillDefaultEntryContent() called.");
    const formArea = document.getElementById('dynamic-entry-form-area');
    if (!formArea) {
        console.error("fillDefaultEntryContent: dynamic-entry-form-area not found.");
        return;
    }

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];
    if (currentDataFields.length === 0) {
        // This case should ideally be handled by showAddEntryMenu,
        // but as a safeguard:
        formArea.innerHTML = "<p>No form fields defined. Please perform App Sync.</p>";
        return;
    }

    let tableHTML = `
        <table id="entry-table" class="entry-form-table">
            <thead>
                <tr>
                    <th>Field Name</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentDataFields.forEach((field, index) => {
        const fieldNameDisplay = field.fieldRequired ? 
            `${field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}*` : 
            field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        let initialValue = field.fieldValue;
        if (field.fieldValue.toUpperCase() === "NOW()") {
            initialValue = formatDateTime(new Date());
        }
        // Escape HTML characters for the value attribute
        const escapedInitialValue = initialValue.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        tableHTML += `
            <tr>
                <td>
                    <label for="entry-field-${index}">${fieldNameDisplay}</label>
                </td>
                <td>
                    <input type="text" 
                           id="entry-field-${index}" 
                           class="entry-field-input" 
                           data-field-name="${field.fieldName.replace(/"/g, "&quot;")}" 
                           value="${escapedInitialValue}">
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
        <p class="entry-table-footnote">* Required field</p>
    `;

    formArea.innerHTML = tableHTML;
    console.log("fillDefaultEntryContent: Entry table populated.");
}


/**
 * Called when the "Add Entry" navigation button is pressed.
 * Checks if dataFields are populated. If not, prompts user to sync.
 * Otherwise, displays the data entry UI with FABs and the dynamic form.
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

                <div id="dynamic-entry-form-area" style="padding: 0px 0px 80px 0px; /* Adjusted padding */ text-align: left; margin: 0 auto; max-width: 600px; width: 100%;">
                    <h2 style="text-align:center; color: var(--md-sys-color-primary); margin-bottom: 20px; margin-top: 10px;">Create New Entry</h2>
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

        // Populate the form area
        fillDefaultEntryContent();

        // Add event listeners for the new FABs
        const btnClear = document.getElementById('btn-clear-form-fab');
        const btnScanData = document.getElementById('btn-scan-entry-data-fab');
        const btnAddEntry = document.getElementById('btn-add-created-entry-fab');

        if (btnClear) btnClear.addEventListener('click', clickClearEntry);
        if (btnScanData) btnScanData.addEventListener('click', clickQRScan);
        if (btnAddEntry) btnAddEntry.addEventListener('click', clickAddEntry);

        document.querySelectorAll('.fab-entry-mode').forEach(fab => {
            fab.addEventListener('mouseenter', () => fab.classList.add('expanded'));
            fab.addEventListener('mouseleave', () => fab.classList.remove('expanded'));
            fab.addEventListener('focus', () => fab.classList.add('expanded'));
            fab.addEventListener('blur', () => fab.classList.remove('expanded'));
        });
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
 * Called when the "Clear" FAB is clicked.
 * Resets the form fields to their default values.
 */
function clickClearEntry() {
    console.log("clickClearEntry() called.");
    fillDefaultEntryContent(); // Repopulate with defaults (handles "NOW()")
    // alert("Form fields cleared/reset to defaults!"); // Optional feedback
}
