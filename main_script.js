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

    let currentActiveModule = null; // To track the active module, helps manage camera state

    // --- Core UI Functions ---

    /**
     * Clears all content from the main application pane.
     */
    window.clearMainPane = function() {
        if (mainPane) {
            mainPane.innerHTML = '';
        } else {
            console.error("Main pane element not found for clearing.");
        }
    };

    /**
     * Injects the provided HTML content into the main application pane.
     * @param {string} htmlContent - The HTML string to inject.
     */
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
            button.classList.toggle('active', button === clickedButton);
        });
        adjustStorageCounterPosition(); // Adjust counter whenever active button (and thus nav bar width) might change
    }

    /**
     * Adjusts the storage counter position based on the navigation bar's current width.
     * This ensures it stays correctly aligned with the end of the navigation bar.
     */
    function adjustStorageCounterPosition() {
        if (navBar && storageCounter) {
            const navBarRect = navBar.getBoundingClientRect();
            const counterSize = storageCounter.offsetWidth; // Get actual width of the counter
            const overlapFactor = 0.65; // How much of the counter should overlap the nav bar
            
            // Calculate the desired left position of the counter
            let newLeft = (navBarRect.left + navBarRect.width) - (counterSize * overlapFactor);
            
            // Ensure the counter doesn't go off-screen on the right
            newLeft = Math.min(newLeft, window.innerWidth - counterSize - 4); // 4px buffer from edge

            storageCounter.style.left = `${newLeft}px`;
        }
    }

    /**
     * Handles camera state when changing modules.
     * If the previous module was 'AppSync' and the new one isn't, it stops the camera.
     * @param {string | null} newModule - The name of the module being activated.
     */
    function handleCameraOnModuleChange(newModule) {
        if (currentActiveModule === 'AppSync' && newModule !== 'AppSync') {
            if (typeof window.stopCamera === 'function') {
                window.stopCamera();
                console.log("Camera stopped due to module change from AppSync.");
            }
        }
        currentActiveModule = newModule;
    }

    // --- Event Listeners for Navigation Buttons ---

    if (btnSync) {
        btnSync.addEventListener('click', () => {
            updateActiveButton(btnSync);
            handleCameraOnModuleChange('AppSync'); // Manages camera state and sets currentActiveModule
            clearMainPane();
            if (typeof showAppSyncMenu === 'function') {
                showAppSyncMenu(); // js_AppSync.js handles injecting its own UI
            } else {
                console.error("showAppSyncMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: App Sync module not loaded.</p>');
            }
        });
    }

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            updateActiveButton(btnAdd);
            handleCameraOnModuleChange('AddEntry');
            clearMainPane();
            if (typeof showAddEntryMenu === 'function') {
                showAddEntryMenu();
                // If showAddEntryMenu is a placeholder and doesn't inject HTML itself:
                if (mainPane.innerHTML.trim() === '') {
                    injectHTMLToMainPane('<h2>Add New Entry</h2><p>Interface for adding new entries via QR scan or manual input will appear here.</p><p><em>(Content from js_AddEntry.js)</em></p>');
                }
            } else {
                console.error("showAddEntryMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: Add Entry module not loaded.</p>');
            }
        });
    }

    if (btnReview) {
        btnReview.addEventListener('click', () => {
            updateActiveButton(btnReview);
            handleCameraOnModuleChange('Review');
            clearMainPane();
            if (typeof showReviewMenu === 'function') {
                showReviewMenu();
                // If showReviewMenu is a placeholder and doesn't inject HTML itself:
                if (mainPane.innerHTML.trim() === '') {
                    injectHTMLToMainPane('<h2>Review Entries</h2><p>Carousel or list of saved entries for review and deletion will appear here.</p><p><em>(Content from js_Review.js)</em></p>');
                }
            } else {
                console.error("showReviewMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: Review Entries module not loaded.</p>');
            }
        });
    }

    // Event Listener for Help Button (Top App Bar)
    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            // Help button does not change the active state of the bottom navigation bar buttons
            handleCameraOnModuleChange('Help'); // Or null if Help is a modal and doesn't "take over" the main pane
            clearMainPane();
            if (typeof showHelpMenu === 'function') {
                showHelpMenu();
                // If showHelpMenu is a placeholder and doesn't inject HTML itself:
                 if (mainPane.innerHTML.trim() === '') {
                    injectHTMLToMainPane('<h2>Help & Information</h2><p>Help content will appear here.</p><p><em>(Content from js_Help.js)</em></p>');
                }
            } else {
                console.error("showHelpMenu() is not defined.");
                injectHTMLToMainPane('<p style="color: red;">Error: Help module not loaded.</p>');
            }
        });
    }

    // --- Initial State Setup ---
    if (btnSync) {
        btnSync.click(); // Programmatically click "App Sync" to load it by default
                         // This will also call handleCameraOnModuleChange('AppSync') and set currentActiveModule
    } else {
        // Fallback if the App Sync button isn't found for some reason
        clearMainPane();
        injectHTMLToMainPane('<h1>Welcome to QUEST</h1><p>Please select an option from the navigation bar.</p>');
        console.warn("Default 'App Sync' button not found for initial click.");
        currentActiveModule = 'Welcome'; // Set a default module identifier
    }
    
    // Adjust counter position shortly after load and on window resize
    setTimeout(adjustStorageCounterPosition, 50); // Initial adjustment
    window.addEventListener('resize', adjustStorageCounterPosition); // Adjust on resize

    // Initial call to update the storage counter on page load
    if (typeof window.updateStorageCounter === 'function') {
        window.updateStorageCounter();
    } else {
         console.error("updateStorageCounter() function not found. Ensure main_EntryStorage.js is loaded correctly.");
    }

    console.log("QUEST Web App UI Initialized. Entry Storage functions updated.");

}); // End of DOMContentLoaded
