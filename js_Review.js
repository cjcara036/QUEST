/**
 * js_Review.js
 * Handles the "Review Entries" section, allowing users to browse,
 * and initiate editing of stored entries.
 */

// Module-level variables for the Review mode
let review_allEntries = [];
let review_currentIndex = 0;
window.tmp_EntryForEdit = null; // Used to pass data to Add Entry for editing

/**
 * Main function called when the "Review" navigation button is pressed.
 */
async function showReviewMenu() {
    console.log("showReviewMenu() called.");

    // Stop any active cameras from other modules
    if (typeof window.stopCamera === 'function') { // AppSync camera
        await window.stopCamera(); // This global stop should handle AppSync's camera
    }
    // Explicitly stop AddEntry's field scanner if it's active and its stop function exists
    if (typeof window.stopEntryDataCamera === 'function' && typeof window.isEntryDataScanningMode === 'boolean' && window.isEntryDataScanningMode) { 
        console.log("showReviewMenu: Stopping entry data camera from Add Entry mode.");
        await window.stopEntryDataCamera();
        // window.isEntryDataScanningMode should be reset by stopEntryDataCamera or clickQRScan
    }


    if (typeof window.clearMainPane === 'function') {
        window.clearMainPane();
    } else {
        console.error("showReviewMenu: clearMainPane() function is not defined.");
        return;
    }

    const rawCookieData = typeof getAllEntryData === 'function' ? getAllEntryData() : "";
    if (!rawCookieData || rawCookieData.trim() === "") {
        displayNoEntriesMessage();
        return;
    }

    review_allEntries = typeof getAllEntriesAsObjects === 'function' ? getAllEntriesAsObjects() : [];

    if (review_allEntries.length === 0) {
        displayNoEntriesMessage();
        return;
    }

    review_currentIndex = 0; // Start with the first entry
    buildReviewUI();
    renderCurrentReviewEntry();
}

/**
 * Displays a message when no entries are available for review.
 */
function displayNoEntriesMessage() {
    const noEntriesHTML = `
        <div style="padding: 30px 20px; text-align: center; color: var(--md-sys-color-on-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <span class="material-symbols-outlined" style="font-size: 60px; color: var(--md-sys-color-secondary); margin-bottom: 15px;">info</span>
            <h2 style="color: var(--md-sys-color-secondary); margin-bottom: 10px;">No Entries to Review</h2>
            <p>Please add some entries first using the 'Add Entry' section.</p>
            <button onclick="document.getElementById('btn-add').click()" class="quest-button primary" style="margin-top: 25px;">
                Go to Add Entry
            </button>
        </div>
    `;
    if (typeof window.injectHTMLToMainPane === 'function') {
        window.injectHTMLToMainPane(noEntriesHTML);
    }
}

/**
 * Builds the static UI structure for the Review mode.
 */
function buildReviewUI() {
    const reviewUIHTML = `
        <div class="review-mode-container">
            <button id="review-nav-prev" class="review-nav-arrow left" aria-label="Previous Entry">
                <span class="material-symbols-outlined">arrow_back_ios</span>
            </button>
            <div id="review-entry-card-container">
                <div id="review-entry-display-area">
                    </div>
            </div>
            <button id="review-nav-next" class="review-nav-arrow right" aria-label="Next Entry">
                <span class="material-symbols-outlined">arrow_forward_ios</span>
            </button>
            <div class="review-bottom-controls">
                <div id="review-progress-indicator"></div>
                <button id="review-btn-edit-entry" class="fab-entry-mode review-edit-button" aria-label="Edit Entry">
                    <span class="material-symbols-outlined">edit</span>
                    <span class="fab-text">Edit</span>
                </button>
            </div>
        </div>
    `;
    if (typeof window.injectHTMLToMainPane === 'function') {
        window.injectHTMLToMainPane(reviewUIHTML);
    }

    // Attach event listeners
    document.getElementById('review-nav-prev')?.addEventListener('click', handlePreviousEntry);
    document.getElementById('review-nav-next')?.addEventListener('click', handleNextEntry);
    document.getElementById('review-btn-edit-entry')?.addEventListener('click', handleEditCurrentEntry);
    
    const editButton = document.getElementById('review-btn-edit-entry');
    if(editButton){
        editButton.addEventListener('mouseenter', () => editButton.classList.add('expanded'));
        editButton.addEventListener('mouseleave', () => editButton.classList.remove('expanded'));
        editButton.addEventListener('focus', () => editButton.classList.add('expanded'));
        editButton.addEventListener('blur', () => editButton.classList.remove('expanded'));
    }


    // Touch swipe listeners
    const cardContainer = document.getElementById('review-entry-card-container');
    if (cardContainer) {
        let touchStartX = 0;
        let touchEndX = 0;
        const swipeThreshold = 50; 

        cardContainer.addEventListener('touchstart', function(event) {
            touchStartX = event.changedTouches[0].screenX;
        }, { passive: true }); 

        cardContainer.addEventListener('touchend', function(event) {
            touchEndX = event.changedTouches[0].screenX;
            handleSwipeGesture();
        }, { passive: true });

        function handleSwipeGesture() {
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) >= swipeThreshold) {
                if (swipeDistance < 0) { 
                    handleNextEntry();
                } else { 
                    handlePreviousEntry();
                }
            }
        }
    }
}

/**
 * Renders the entry at the current review_currentIndex into the display area.
 */
function renderCurrentReviewEntry() {
    const displayArea = document.getElementById('review-entry-display-area');
    if (!displayArea) {
        console.error("renderCurrentReviewEntry: Display area not found.");
        return;
    }

    displayArea.innerHTML = ''; 

    if (review_allEntries.length === 0) {
        // This case should be handled by showReviewMenu redirecting to displayNoEntriesMessage
        // but as a fallback if render is called with an empty array:
        displayNoEntriesMessage(); 
        updateReviewNavigationControls(); // Disable edit/nav if no entries
        updateReviewProgressIndicator();
        return;
    }
    
    // Ensure currentIndex is valid
    if (review_currentIndex < 0) review_currentIndex = 0;
    if (review_currentIndex >= review_allEntries.length) review_currentIndex = review_allEntries.length - 1;


    const currentEntryData = review_allEntries[review_currentIndex];
    if (!currentEntryData || !Array.isArray(currentEntryData)) {
        displayArea.innerHTML = '<p style="padding:20px;">Error: Could not load entry data.</p>';
        updateReviewNavigationControls();
        updateReviewProgressIndicator();
        return;
    }

    let tableHTML = `
        <h3 style="color: var(--md-sys-color-primary); margin-bottom: 15px;">Entry ${review_currentIndex + 1}</h3>
        <table class="review-entry-table">
            <tbody>
    `;
    currentEntryData.forEach(field => {
        tableHTML += `
            <tr>
                <td class="review-field-name">${field.fieldName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                <td class="review-field-value">${field.fieldValue.replace(/</g, "&lt;").replace(/>/g, "&gt;") || '(empty)'}</td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    displayArea.innerHTML = tableHTML;

    displayArea.classList.remove('swipe-left-animation', 'swipe-right-animation'); 
    void displayArea.offsetWidth; 

    updateReviewNavigationControls();
    updateReviewProgressIndicator();
}

/**
 * Updates the state (enabled/disabled) of navigation arrows and edit button.
 */
function updateReviewNavigationControls() {
    const prevBtn = document.getElementById('review-nav-prev');
    const nextBtn = document.getElementById('review-nav-next');
    const editBtn = document.getElementById('review-btn-edit-entry');

    if (review_allEntries.length === 0) {
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (editBtn) editBtn.disabled = true;
        return;
    }
    if (prevBtn) prevBtn.disabled = review_currentIndex === 0;
    if (nextBtn) nextBtn.disabled = review_currentIndex >= review_allEntries.length - 1;
    if (editBtn) editBtn.disabled = false; // Enable if there are entries
}

/**
 * Updates the progress indicator text.
 */
function updateReviewProgressIndicator() {
    const indicator = document.getElementById('review-progress-indicator');
    if (indicator) {
        if (review_allEntries.length > 0) {
            indicator.textContent = `Entry ${review_currentIndex + 1} of ${review_allEntries.length}`;
        } else {
            indicator.textContent = "No Entries";
        }
    }
}

/**
 * Handles click on the "Previous Entry" arrow.
 */
function handlePreviousEntry() {
    if (review_currentIndex > 0) {
        review_currentIndex--;
        const displayArea = document.getElementById('review-entry-display-area');
        if(displayArea) {
            displayArea.classList.add('swipe-right-animation'); 
            setTimeout(() => {
                renderCurrentReviewEntry();
                displayArea.classList.remove('swipe-right-animation');
            }, 300); // Match CSS animation duration
        } else {
            renderCurrentReviewEntry();
        }
    }
}

/**
 * Handles click on the "Next Entry" arrow.
 */
function handleNextEntry() {
    if (review_currentIndex < review_allEntries.length - 1) {
        review_currentIndex++;
        const displayArea = document.getElementById('review-entry-display-area');
        if(displayArea) {
            displayArea.classList.add('swipe-left-animation'); 
            setTimeout(() => {
                renderCurrentReviewEntry();
                displayArea.classList.remove('swipe-left-animation');
            }, 300); 
        } else {
            renderCurrentReviewEntry();
        }
    }
}

/**
 * Handles click on the "Edit Entry" button.
 */
function handleEditCurrentEntry() {
    if (review_allEntries.length === 0 || review_currentIndex < 0 || review_currentIndex >= review_allEntries.length) {
        console.warn("handleEditCurrentEntry: No valid entry to edit.");
        return;
    }

    const entryToEdit = review_allEntries[review_currentIndex];
    window.tmp_EntryForEdit = JSON.parse(JSON.stringify(entryToEdit)); 

    const allEntryStrings = getAllEntryData().split(SEP_CHAR); // SEP_CHAR from main_EntryStorage.js
    allEntryStrings.splice(review_currentIndex, 1); 
    storeAllEntryData(allEntryStrings.join(SEP_CHAR)); // storeAllEntryData from main_EntryStorage.js

    review_allEntries.splice(review_currentIndex, 1);

    if (typeof window.updateStorageCounter === 'function') {
        window.updateStorageCounter();
    }

    console.log("handleEditCurrentEntry: Entry prepared for editing:", window.tmp_EntryForEdit);
    
    const btnAdd = document.getElementById('btn-add');
    if (btnAdd) {
        btnAdd.click(); 
    } else {
        console.error("handleEditCurrentEntry: Add Entry button not found.");
    }
}
