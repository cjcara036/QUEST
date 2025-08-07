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

    let currentActiveModule = null;

    // --- Core Startup Logic ---
    function performStartupChecks() {
        // If the form fields cookie is missing, delete the entry data cookie.
        if (typeof getStoredDataFields === 'function' && typeof deleteAllEntryData === 'function') {
            if (!getStoredDataFields()) {
                console.log("Form fields cookie expired or missing. Deleting associated entry data.");
                deleteAllEntryData();
            }
        }
    }


    // --- Core UI Functions ---
    window.clearMainPane = function() {
        if (mainPane) mainPane.innerHTML = '';
    };

    window.injectHTMLToMainPane = function(htmlContent) {
        if (mainPane) mainPane.innerHTML = htmlContent;
    };

    window.updateStorageCounterValue = function(count) {
        if (storageCountValueElement) storageCountValueElement.textContent = count;
    };

    function updateActiveButton(clickedButton) {
        navButtons.forEach(button => button.classList.toggle('active', button === clickedButton));
        adjustStorageCounterPosition();
    }

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

    function handleCameraOnModuleChange(newModule) {
        if (currentActiveModule === 'AppSync' && newModule !== 'AppSync') {
            if (typeof window.stopCamera === 'function') {
                window.stopCamera();
            }
        }
        currentActiveModule = newModule;
    }

    // --- Event Listeners ---
    if (btnSync) {
        btnSync.addEventListener('click', () => {
            updateActiveButton(btnSync);
            handleCameraOnModuleChange('AppSync');
            if (typeof showAppSyncMenu === 'function') showAppSyncMenu();
        });
    }

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            updateActiveButton(btnAdd);
            handleCameraOnModuleChange('AddEntry');
            if (typeof showAddEntryMenu === 'function') showAddEntryMenu();
        });
    }

    if (btnReview) {
        btnReview.addEventListener('click', () => {
            updateActiveButton(btnReview);
            handleCameraOnModuleChange('Review');
            if (typeof showReviewMenu === 'function') showReviewMenu();
        });
    }

    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            handleCameraOnModuleChange('Help');
            if (typeof showHelpMenu === 'function') showHelpMenu();
        });
    }

    // --- Initial State Setup ---
    performStartupChecks(); // Run crucial data integrity check on load

    if (btnSync) {
        btnSync.click();
    } else {
        clearMainPane();
        injectHTMLToMainPane('<h1>Welcome to QUEST</h1>');
        currentActiveModule = 'Welcome';
    }
    
    setTimeout(adjustStorageCounterPosition, 50);
    window.addEventListener('resize', adjustStorageCounterPosition);

    if (typeof window.updateStorageCounter === 'function') {
        window.updateStorageCounter();
    }

    console.log("QUEST Web App UI Initialized.");

});
