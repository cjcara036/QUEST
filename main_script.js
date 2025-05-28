/**
 * Main script for QUEST Web App UI interactions.
 * Handles navigation, content injection, and active states including label visibility.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const mainPane = document.getElementById('main-pane');
    const navBar = document.getElementById('navigation-bar');
    const navButtons = document.querySelectorAll('.nav-button');
    const btnSync = document.getElementById('btn-sync');
    const btnAdd = document.getElementById('btn-add');
    const btnReview = document.getElementById('btn-review');
    const storageCounter = document.getElementById('storage-counter');
    const storageCountValueElement = document.getElementById('storage-count-value');
    const btnHelp = document.getElementById('btn-help');

    // --- Core UI Functions ---

    window.clearMainPane = function() {
        if (mainPane) {
            mainPane.innerHTML = '';
        } else {
            console.error("Main pane element not found for clearing.");
        }
    };

    window.injectHTMLToMainPane = function(htmlContent) {
        if (mainPane) {
            mainPane.innerHTML = htmlContent;
        } else {
            console.error("Main pane element not found for injection.");
        }
    };

    /**
     * Updates the number displayed in the storage entry counter.
     * @param {number | string} count - The new count to display.
     */
    window.updateStorageCounterValue = function(count) {
        if (storageCountValueElement) {
            storageCountValueElement.textContent = count;
        } else {
            console.error("Storage count value element not found.");
        }
    };

    /**
     * Updates the visual active state for navigation buttons, including showing/hiding labels.
     * @param {HTMLElement} clickedButton - The button that was clicked and should be marked active.
     */
    function updateActiveButton(clickedButton) {
        navButtons.forEach(button => {
            if (button === clickedButton) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        adjustStorageCounterPosition();
    }

    /**
     * Adjusts the storage counter position based on the navigation bar's current width.
     */
    function adjustStorageCounterPosition() {
        if (navBar && storageCounter) {
            const navBarRect = navBar.getBoundingClientRect();
            const counterSize = storageCounter.offsetWidth;
            const overlapFactor = 0.65;
            let newLeft = (navBarRect.left + navBarRect.width) - (counterSize * overlapFactor);
            newLeft = Math.min(newLeft, window.innerWidth - counterSize - 4);
            storageCounter.style.left = `${newLeft}px`;
        }
    }


    // --- Event Listeners for Navigation Buttons ---

    if (btnSync) {
        btnSync.addEventListener('click', () => {
            updateActiveButton(btnSync);
            clearMainPane();
            if (typeof showAppSyncMenu === 'function') {
                showAppSyncMenu();
                injectHTMLToMainPane('<h2>App Sync & QR Tools</h2><p>Interface for scanning setup QR codes and generating export QR codes will appear here.</p><p><em>(Content from js_AppSync.js)</em></p>');
            } else {
                console.error("showAppSyncMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: App Sync module not loaded.</p>');
            }
        });
    }

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            updateActiveButton(btnAdd);
            clearMainPane();
            if (typeof showAddEntryMenu === 'function') {
                showAddEntryMenu();
                injectHTMLToMainPane('<h2>Add New Entry</h2><p>Interface for adding new entries via QR scan or manual input will appear here.</p><p><em>(Content from js_AddEntry.js)</em></p>');
            } else {
                console.error("showAddEntryMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: Add Entry module not loaded.</p>');
            }
        });
    }

    if (btnReview) {
        btnReview.addEventListener('click', () => {
            updateActiveButton(btnReview);
            clearMainPane();
            if (typeof showReviewMenu === 'function') {
                showReviewMenu();
                injectHTMLToMainPane('<h2>Review Entries</h2><p>Carousel or list of saved entries for review and deletion will appear here.</p><p><em>(Content from js_Review.js)</em></p>');
            } else {
                console.error("showReviewMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: Review Entries module not loaded.</p>');
            }
        });
    }

    // Event Listener for Help Button
    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            clearMainPane();
            if (typeof showHelpMenu === 'function') {
                showHelpMenu();
                injectHTMLToMainPane('<h2>Help & Information</h2><p>Help content will appear here.</p><p><em>(Content from js_Help.js)</em></p>');
            } else {
                console.error("showHelpMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: Help module not loaded.</p>');
            }
        });
    }

    // --- Initial State Setup ---
    if (btnSync) {
        btnSync.click();
    } else {
        clearMainPane();
        injectHTMLToMainPane('<h1>Welcome to QUEST</h1><p>Please select an option from the navigation bar.</p>');
        console.warn("Default 'App Sync' button not found for initial click.");
    }
    setTimeout(adjustStorageCounterPosition, 50);

    // Initial call to update the storage counter on page load
    if (typeof updateStorageCounter === 'function') {
        updateStorageCounter();
    } else {
         console.error("updateStorageCounter() function not found. Ensure main_EntryStorage.js is loaded correctly.");
    }

    console.log("QUEST Web App UI Initialized. Entry Storage functions updated.");

}); // End of DOMContentLoaded
