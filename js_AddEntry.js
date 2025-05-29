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

    // Clear previous validation messages if any
    const existingValidationMsg = document.getElementById('entry-validation-message');
    if (existingValidationMsg) {
        existingValidationMsg.remove();
    }

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];
    if (currentDataFields.length === 0) {
        formArea.innerHTML = "<p>No form fields defined. Please perform App Sync.</p>";
        return;
    }

    let tableHTML = `
        <div id="entry-validation-message-container" style="margin-bottom: 10px;"></div> 
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
                           data-original-field-name="${field.fieldName.replace(/"/g, "&quot;")}"
                           data-is-required="${field.fieldRequired}"
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
 */
function showAddEntryMenu() {
    console.log("showAddEntryMenu() called.");

    if (typeof window.clearMainPane === 'function') window.clearMainPane();
    else console.error("showAddEntryMenu: clearMainPane() function is not defined.");

    const currentDataFields = typeof getDataFields === 'function' ? getDataFields() : [];

    if (currentDataFields.length === 0) {
        const promptToSyncHTML = `
            <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                <h2 style="color: var(--md-sys-color-secondary); margin-bottom: 15px;">Setup Required</h2>
                <p>No form fields are currently defined.</p>
                <p>Please go to <strong>App Sync</strong> and scan a Form Setup QR code first.</p>
                <button onclick="document.getElementById('btn-sync').click()" class="quest-button primary">Go to App Sync</button>
            </div>
        `;
        if (typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(promptToSyncHTML);
    } else {
        const addEntryViewHTML = `
            <div class="add-entry-view-container">
                <button id="btn-clear-form-fab" class="fab-entry-mode fab-top-left" aria-label="Clear Form">
                    <span class="material-symbols-outlined">delete</span>
                    <span class="fab-text">Clear Form</span>
                </button>
                <div id="dynamic-entry-form-area" style="padding: 0px 0px 80px 0px; text-align: left; margin: 0 auto; max-width: 600px; width: 100%;">
                    <h2 style="text-align:center; color: var(--md-sys-color-primary); margin-bottom: 10px; margin-top: 10px;">Create New Entry</h2>
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
        if (typeof window.injectHTMLToMainPane === 'function') window.injectHTMLToMainPane(addEntryViewHTML);
        
        fillDefaultEntryContent(); // Populate the form area

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
 * Displays a validation message above the entry table.
 * @param {string} message - The message to display.
 * @param {string} type - 'error' or 'success'.
 */
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

/**
 * Clears any existing validation messages.
 */
function clearValidationMessages() {
    const messageDiv = document.getElementById('entry-validation-message');
    if (messageDiv) {
        messageDiv.remove();
    }
    document.querySelectorAll('.entry-field-input.input-error').forEach(input => {
        input.classList.remove('input-error');
    });
}


/**
 * Handles the "Add Created Entry" FAB click.
 * Validates required fields, creates an entry string, and stores it.
 */
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
        if (fieldName) {
             stringPairArray.push(makeDataFieldStringPair(fieldName, fieldValue));
        }
    });

    if (!allRequiredFilled) {
        console.warn("clickAddEntry: Not all required fields are filled.");
        showValidationMessage("Please fill all required fields marked with *.", "error");
        if (firstMissingField) firstMissingField.focus(); 
        return; 
    }

    if (typeof makeEntryString !== 'function' || typeof window.addEntry !== 'function') {
        console.error("clickAddEntry: makeEntryString or addEntry function is not defined.");
        showValidationMessage("Error: System function missing. Cannot save entry.", "error");
        return;
    }
    
    const entryString = makeEntryString(stringPairArray);
    console.log("clickAddEntry: Constructed entryString:", entryString);

    if (entryString) {
        try {
            window.addEntry(entryString); 
            console.log("clickAddEntry: Entry added successfully via window.addEntry.");
            // Instead of just resetting, show the success screen
            showAddEntrySuccessScreen(); 
        } catch (error) {
            console.error("clickAddEntry: Error calling window.addEntry():", error.message);
            showValidationMessage(`Error saving entry: ${error.message}`, "error");
        }
    } else {
        console.warn("clickAddEntry: entryString is empty, nothing to add.");
        showValidationMessage("No data to save.", "error"); 
    }
}

/**
 * Displays a success message and options after an entry is added.
 */
function showAddEntrySuccessScreen() {
    console.log("showAddEntrySuccessScreen() called.");
    if (typeof window.clearMainPane === 'function') window.clearMainPane();

    const successHTML = `
        <div style="padding: 30px 20px; text-align: center; color: var(--md-sys-color-on-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <span class="material-symbols-outlined" style="font-size: 60px; color: var(--md-sys-color-success); margin-bottom: 15px;">check_circle</span>
            <h2 style="color: var(--md-sys-color-success); margin-bottom: 10px;">Entry Added Successfully!</h2>
            <p style="margin-bottom: 20px;">You can review your entries in the 'Review' tab.</p>
            <p style="margin-bottom: 25px;">Would you like to add another entry?</p>
            <div style="display: flex; gap: 15px;">
                <button onclick="showAddEntryMenu()" class="quest-button primary" style="min-width: 150px;">Add Another Entry</button>
                <button onclick="document.getElementById('btn-review').click()" class="quest-button secondary" style="min-width: 150px; background-color: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface-variant); border: 1px solid var(--md-sys-color-outline);">Go to Review</button>
            </div>
        </div>
    `;
    if (typeof window.injectHTMLToMainPane === 'function') {
        window.injectHTMLToMainPane(successHTML);
    }
}


/**
 * Placeholder function called when the "QR Scan" FAB is clicked.
 */
function clickQRScan() {
    console.log("clickQRScan() called. (Placeholder)");
    alert("QR Scan Data button clicked! (Functionality to be implemented)");
}

/**
 * Called when the "Clear" FAB is clicked.
 * Resets the form fields to their default values.
 */
function clickClearEntry() {
    console.log("clickClearEntry() called.");
    clearValidationMessages();
    fillDefaultEntryContent(); 
    console.log("Form fields cleared/reset to defaults.");
}
