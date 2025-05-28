/**
 * js_AddEntry.js
 * Handles the "Add Entry" section.
 * Dynamically creates a form based on dataFields.
 */

/**
 * Called when the "Add Entry" navigation button is pressed.
 * Checks if dataFields are populated. If not, prompts user to sync.
 * Otherwise, prepares to display the data entry form.
 */
function showAddEntryMenu() {
    console.log("showAddEntryMenu() called.");

    // Clear the main pane before adding new content
    if (typeof window.clearMainPane === 'function') {
        window.clearMainPane();
    } else {
        console.error("showAddEntryMenu: clearMainPane() function is not defined.");
        // Fallback if clearMainPane is somehow unavailable
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
            // Fallback
            const mainPane = document.getElementById('main-pane');
            if (mainPane) mainPane.innerHTML = promptToSyncHTML;
        }
    } else {
        console.log("showAddEntryMenu: dataFields found. Displaying placeholder for entry form.");
        // Placeholder for where the dynamic form will be built.
        // This will be developed in subsequent steps.
        const entryFormPlaceholderHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2>Add New Data Entry</h2>
                <p><em>(Form based on scanned data fields will appear here.)</em></p>
                <div id="dynamic-entry-form-container">
                    </div>
                <button id="save-entry-button" style="margin-top: 20px; padding: 10px 20px; background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border: none; border-radius: 20px; font-weight: 500; cursor: pointer;">
                    Save Entry (Placeholder)
                </button>
            </div>
        `;
        if (typeof window.injectHTMLToMainPane === 'function') {
            window.injectHTMLToMainPane(entryFormPlaceholderHTML);
        } else {
            console.error("showAddEntryMenu: injectHTMLToMainPane() function is not defined.");
             const mainPane = document.getElementById('main-pane');
            if (mainPane) mainPane.innerHTML = entryFormPlaceholderHTML;
        }
        // TODO: Add logic here to dynamically build the form based on `currentDataFields`
        // and handle form submission.
    }
}
