/**
 * main_dataStructure.js
 * Contains the data structure for form fields and the parser for
 * QR code content that defines these fields.
 */

/**
 * @type {Array<{fieldName: string, fieldValue: string, fieldRequired: boolean}>}
 * Stores the definitions of data fields to be used in forms.
 */
let dataFields = [];

/**
 * Separator character used between individual fieldName:fieldValue pairs within a single entry string.
 * @type {string}
 */
const SEP_ENTRY_FIELD = "|"; 

/**
 * Parses a string containing field definitions (triplets for form setup).
 * Format: fieldName:fieldValue:fieldRequired (T/F)
 * @param {string} content - The string to parse.
 * @returns {boolean} True if parsing was successful and at least one valid field was added.
 */
function parseDataField(content) {
    console.log("parseDataField (triplet): Received content:", content);
    if (typeof content !== 'string' || content.trim() === "") {
        dataFields = []; 
        console.error("parseDataField (triplet): Content is not a string or is empty.");
        return false;
    }

    dataFields = []; 
    const segments = content.split(';');
    let overallSuccess = true;
    let fieldsAdded = 0;

    segments.forEach((segment, segmentIndex) => {
        if (segment.trim() === "") return; 

        const parts = segment.split(':');
        if (parts.length !== 3) {
            console.error(`parseDataField (triplet): Segment "${segment}" at index ${segmentIndex} has ${parts.length} parts, expected 3.`);
            overallSuccess = false; return; 
        }

        const fieldName = parts[0].trim();
        const fieldValue = parts[1].trim(); 
        const fieldRequiredStr = parts[2].trim().toUpperCase();

        if (fieldName === "") {
            console.error(`parseDataField (triplet): fieldName empty in segment "${segment}" at index ${segmentIndex}.`);
            overallSuccess = false; return; 
        }
        if (fieldRequiredStr !== "T" && fieldRequiredStr !== "F") {
            console.error(`parseDataField (triplet): fieldRequired invalid in segment "${segment}" at index ${segmentIndex}. Found "${parts[2].trim()}".`);
            overallSuccess = false; return; 
        }
        dataFields.push({
            fieldName: fieldName,
            fieldValue: fieldValue,
            fieldRequired: (fieldRequiredStr === "T")
        });
        fieldsAdded++;
    });

    if (!overallSuccess) console.error("parseDataField (triplet): Parsing completed with errors.");
    else console.log(`parseDataField (triplet): Parsing successful. ${fieldsAdded} fields populated.`);
    
    return overallSuccess && fieldsAdded > 0;
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
 * Returns a copy of the dataFields array (form setup).
 */
function getDataFields() {
    return dataFields.map(field => ({ ...field }));
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
 * Each entry in the main array is an array of field objects {fieldName, fieldValue}.
 * Assumes SEP_CHAR is globally available from main_EntryStorage.js (e.g., '~')
 * Assumes getAllEntryData is globally available from main_EntryStorage.js
 * Uses SEP_ENTRY_FIELD from this file (e.g., '|')
 * @returns {Array<Array<{fieldName: string, fieldValue: string}>>} An array of entries, 
 * where each entry is an array of its field-value pairs. Returns empty array if no data or error.
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

    // SEP_CHAR is defined in main_EntryStorage.js as: const SEP_CHAR = "~";
    // It should be globally accessible if main_EntryStorage.js is loaded before this file.
    // If not, this will cause an error. A safer approach is to pass it or define it here.
    // For now, assuming it's globally accessible.
    const entrySeparator = typeof SEP_CHAR === 'string' ? SEP_CHAR : "~"; // Fallback just in case


    const individualEntryStrings = allEntriesString.split(entrySeparator);
    const allParsedEntries = [];

    individualEntryStrings.forEach(entryStr => {
        if (entryStr.trim() === "") return; 

        const fieldPairs = entryStr.split(SEP_ENTRY_FIELD); // SEP_ENTRY_FIELD from this file
        const currentEntryFields = [];
        
        fieldPairs.forEach(pairStr => {
            if (pairStr.trim() === "") return;

            const colonIndex = pairStr.indexOf(':');
            if (colonIndex === -1) {
                console.warn(`getAllEntriesAsObjects: Malformed pair (missing colon) in entry: "${pairStr}". Skipping pair.`);
                return; 
            }

            const fieldName = pairStr.substring(0, colonIndex).trim();
            const fieldValue = pairStr.substring(colonIndex + 1).trim(); 

            if (fieldName === "") {
                console.warn(`getAllEntriesAsObjects: Empty fieldName in pair: "${pairStr}". Skipping pair.`);
                return; 
            }
            currentEntryFields.push({ fieldName: fieldName, fieldValue: fieldValue });
        });

        if (currentEntryFields.length > 0) {
            allParsedEntries.push(currentEntryFields);
        }
    });

    console.log("getAllEntriesAsObjects: Parsed all entries:", allParsedEntries);
    return allParsedEntries;
}
