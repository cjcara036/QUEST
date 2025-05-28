/**
 * main_EntryStorage.js
 * Handles the storage, retrieval, and manipulation of entry data using browser cookies.
 *
 * Cookie Name: "questEntryContent"
 */

// --- Constants and Global Variables for Entry Storage ---

/**
 * Approximate character limit for QR codes.
 * @type {number}
 */
const QR_CHAR_LIMIT = 2800;

/**
 * Character used to separate entries in the stored string.
 * @type {string}
 */
const SEP_CHAR = "~";

/**
 * Stores an estimate or the actual length of the largest (or last) entry added.
 * Used to estimate how many more entries might fit.
 * Initialized to 50 as per requirement.
 * @type {number}
 */
let LAST_ENTRY_LENGTH = 50;

// --- Cookie Management Functions ---

/**
 * Stores the provided content string into a cookie named "questEntryContent".
 * If the cookie already exists, its content will be overwritten.
 * The cookie will expire after 7 days.
 *
 * @param {string} content - The string content to store.
 */
function storeAllEntryData(content) {
    if (typeof content !== 'string') {
        console.error("storeAllEntryData: Content must be a string.");
        return;
    }
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `questEntryContent=${encodeURIComponent(content)}; expires=${expires}; path=/; SameSite=Lax`;
    console.log("Entry data stored in cookie. Expires in 7 days.");
}

/**
 * Retrieves the content of the "questEntryContent" cookie.
 *
 * @returns {string} The content of the cookie as a string. Returns an empty string
 * if the cookie does not exist or has no value.
 */
function getAllEntryData() {
    const nameEQ = "questEntryContent=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            const value = c.substring(nameEQ.length, c.length);
            try {
                return decodeURIComponent(value);
            } catch (e) {
                console.error("Error decoding cookie content:", e);
                return "";
            }
        }
    }
    return "";
}

/**
 * Deletes the "questEntryContent" cookie.
 */
function deleteAllEntryData() {
    document.cookie = "questEntryContent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
    console.log("Entry data cookie deleted.");
}

// --- Entry Management Functions ---

/**
 * Adds a new entry string to the existing data in the cookie.
 * Appends using the SEP_CHAR and updates LAST_ENTRY_LENGTH if the new
 * entry (including its separator) is larger than the current value.
 * Throws an error and does not store data if the new total length exceeds QR_CHAR_LIMIT.
 *
 * @param {string} content - The new entry string to add.
 * @throws {Error} If adding the new content would exceed QR_CHAR_LIMIT.
 */
function addEntry(content) {
    if (typeof content !== 'string' || content.length === 0) {
        console.error("addEntry: Content must be a non-empty string.");
        return; // Exit if content is invalid
    }

    const existingData = getAllEntryData();
    const UPDATE_STRING = (existingData === "") ? content : SEP_CHAR + content;
    const newData = existingData + UPDATE_STRING;

    if (newData.length > QR_CHAR_LIMIT) {
        const errorMessage = `Error: Adding this entry would exceed the QR character limit. Current: ${newData.length}, Limit: ${QR_CHAR_LIMIT}. Entry not added.`;
        console.error(errorMessage);
        throw new Error(errorMessage); 
    }

    storeAllEntryData(newData);

    const updateStringLength = UPDATE_STRING.length;
    if (updateStringLength > LAST_ENTRY_LENGTH) {
        LAST_ENTRY_LENGTH = updateStringLength;
        console.log(`LAST_ENTRY_LENGTH updated to ${LAST_ENTRY_LENGTH}`);
    }

    if (typeof window.updateStorageCounter === 'function') {
        window.updateStorageCounter();
    }
}

/**
 * Calculates the estimated number of entries left based on current storage
 * and the QR limit, then updates the UI counter.
 * Made explicitly global by assigning to window.
 */
window.updateStorageCounter = function() {
    const currentLength = getAllEntryData().length;
    const remainingCapacity = QR_CHAR_LIMIT - currentLength;

    let entriesLeft = 0;
    if (LAST_ENTRY_LENGTH > 0 && remainingCapacity > 0) {
        entriesLeft = Math.round(remainingCapacity / LAST_ENTRY_LENGTH);
    }
    entriesLeft = Math.max(0, entriesLeft);

    if (typeof window.updateStorageCounterValue === 'function') {
        window.updateStorageCounterValue(entriesLeft);
        console.log(`Storage counter updated. Estimated entries left: ${entriesLeft}`);
    } else {
        console.error("updateStorageCounter: window.updateStorageCounterValue() is not defined.");
    }
};

// Also make other key functions explicitly global if they need to be called from other files directly
window.storeAllEntryData = storeAllEntryData;
window.getAllEntryData = getAllEntryData;
window.deleteAllEntryData = deleteAllEntryData;
window.addEntry = addEntry;
