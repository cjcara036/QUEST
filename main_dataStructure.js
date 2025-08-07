/**
 * main_dataStructure.js
 * Contains the data structure for form fields and the parser for
 * QR code content that defines these fields.
 */

/**
 * @type {Array<{fieldName: string, fieldValue: string, fieldRequired: boolean}>}
 * Stores the definitions of data fields. Now loaded from a cookie.
 */
let dataFields = [];

/**
 * Separator character used between individual fieldName:fieldValue pairs within a single entry string.
 * @type {string}
 */
const SEP_ENTRY_FIELD = "|";

/**
 * Parses a string containing field definitions and saves them to a cookie.
 * Format: fieldName:fieldValue:fieldRequired (T/F)
 * @param {string} content - The string to parse.
 * @returns {boolean} True if parsing was successful.
 */
function parseDataField(content) {
    console.log("parseDataField (triplet): Received content:", content);
    if (typeof content !== 'string' || content.trim() === "") {
        dataFields = [];
        console.error("parseDataField (triplet): Content is not a string or is empty.");
        return false;
    }

    const parsedFields = [];
    const segments = content.split(';');
    let overallSuccess = true;

    segments.forEach((segment, segmentIndex) => {
        if (segment.trim() === "") return;

        const parts = segment.split(':');
        if (parts.length !== 3) {
            console.error(`parseDataField (triplet): Segment "${segment}" at index ${segmentIndex} has invalid parts.`);
            overallSuccess = false; return;
        }

        const fieldName = parts[0].trim();
        const fieldValue = parts[1].trim();
        const fieldRequiredStr = parts[2].trim().toUpperCase();

        if (fieldName === "" || (fieldRequiredStr !== "T" && fieldRequiredStr !== "F")) {
            console.error(`parseDataField (triplet): Invalid data in segment "${segment}".`);
            overallSuccess = false; return;
        }
        parsedFields.push({
            fieldName: fieldName,
            fieldValue: fieldValue,
            fieldRequired: (fieldRequiredStr === "T")
        });
    });

    if (overallSuccess && parsedFields.length > 0) {
        dataFields = parsedFields;
        if (typeof window.storeDataFields === 'function') {
            window.storeDataFields(dataFields); // Save to cookie
            console.log(`parseDataField (triplet): Parsing successful. ${dataFields.length} fields populated and stored.`);
        } else {
             console.error("parseDataField (triplet): storeDataFields function not found.");
             overallSuccess = false;
        }
    } else {
        if (parsedFields.length === 0) overallSuccess = false;
        console.error("parseDataField (triplet): Parsing failed or produced no fields.");
    }
    
    return overallSuccess;
}

/**
 * Parses a QR code string containing data for entry fields.
 * Expected format: [QR data field name0]:[QR data field value0];[QR data field name1]:[QR data field value1];...
 * @param {string} qrCodeString - The string from the scanned QR code.
 * @returns {Array<{fieldName: string, fieldValue: string}>} An array of parsed field objects.
 * @throws {Error} If the input string is invalid or no valid field-value pairs can be parsed.
 */
function parseQRDataEntry(qrCodeString) {
    console.log("parseQRDataEntry: Received content:", qrCodeString);
    if (typeof qrCodeString !== 'string' || qrCodeString.trim() === "") {
        throw new Error("QR code content is empty.");
    }

    const parsedQRData = [];
    const pairs = qrCodeString.split(';');
    let foundAtLeastOneValidPair = false;

    pairs.forEach((pair, index) => {
        if (pair.trim() === "") {
            return; 
        }

        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) {
            console.warn(`parseQRDataEntry: Pair "${pair}" at index ${index} is missing a colon. Skipping.`);
            return; 
        }

        const fieldName = pair.substring(0, colonIndex).trim();
        const fieldValue = pair.substring(colonIndex + 1).trim(); 

        if (fieldName === "") {
            console.warn(`parseQRDataEntry: fieldName is empty in pair "${pair}" at index ${index}. Skipping.`);
            return; 
        }
        parsedQRData.push({ fieldName: fieldName, fieldValue: fieldValue });
        foundAtLeastOneValidPair = true;
    });
    
    if (!foundAtLeastOneValidPair) {
        throw new Error("QR code data is malformed or contains no valid field-value pairs.");
    }
    
    console.log("parseQRDataEntry: Parsed QR data:", parsedQRData);
    return parsedQRData; 
}


/**
 * Returns a copy of the dataFields array, loading from cookie if necessary.
 */
function getDataFields() {
    // Check if dataFields is already populated in memory
    if (dataFields && dataFields.length > 0) {
        return dataFields.map(field => ({ ...field }));
    }
    // If not, try loading from cookie storage
    const storedFields = typeof getStoredDataFields === 'function' ? getStoredDataFields() : null;
    if (storedFields) {
        dataFields = storedFields;
        return dataFields.map(field => ({ ...field }));
    }
    // If nothing is found, return empty
    return [];
}

/**
 * Creates a string pair in the format "[fieldName]:[fieldValue]".
 */
function makeDataFieldStringPair(fieldName, fieldValue) {
    if (typeof fieldName !== 'string' || typeof fieldValue !== 'string') {
        console.error("makeDataFieldStringPair: fieldName and fieldValue must be strings.");
        return "";
    }
    return `${fieldName}:${fieldValue}`;
}

/**
 * Consolidates an array of string pairs into a single string, separated by SEP_ENTRY_FIELD.
 */
function makeEntryString(stringPairArray) {
    if (!Array.isArray(stringPairArray)) {
        console.error("makeEntryString: Input must be an array.");
        return "";
    }
    return stringPairArray.join(SEP_ENTRY_FIELD);
}

/**
 * Retrieves all stored entries from the cookie and parses them into a structured array of objects.
 */
function getAllEntriesAsObjects() {
    if (typeof getAllEntryData !== 'function') {
        console.error("getAllEntriesAsObjects: getAllEntryData() function is not available.");
        return [];
    }
    
    const allEntriesString = getAllEntryData();
    if (!allEntriesString) {
        return [];
    }

    const entrySeparator = typeof SEP_CHAR === 'string' ? SEP_CHAR : "~";
    const individualEntryStrings = allEntriesString.split(entrySeparator);
    const allParsedEntries = [];

    individualEntryStrings.forEach(entryStr => {
        if (entryStr.trim() === "") return;

        const fieldPairs = entryStr.split(SEP_ENTRY_FIELD);
        const currentEntryFields = [];
        
        fieldPairs.forEach(pairStr => {
            if (pairStr.trim() === "") return;
            const colonIndex = pairStr.indexOf(':');
            if (colonIndex === -1) return;

            const fieldName = pairStr.substring(0, colonIndex).trim();
            const fieldValue = pairStr.substring(colonIndex + 1).trim();

            if (fieldName === "") return;
            currentEntryFields.push({ fieldName: fieldName, fieldValue: fieldValue });
        });

        if (currentEntryFields.length > 0) {
            allParsedEntries.push(currentEntryFields);
        }
    });
    
    return allParsedEntries;
}
