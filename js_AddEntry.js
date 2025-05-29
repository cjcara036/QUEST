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
function saveCurrentEntryFieldData(
