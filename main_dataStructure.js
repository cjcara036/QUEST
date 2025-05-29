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
            return; // Skip empty segments
        }

        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) {
            console.warn(`parseQRDataEntry: Pair "${pair}" at index ${index} is missing a colon. Skipping.`);
            return; 
        }

        const fieldName = pair.substring(0, colonIndex).trim();
        const fieldValue = pair.substring(colonIndex + 1).trim(); // Value can be empty

        if (fieldName === "") {
            console.warn(`parseQRDataEntry: fieldName is empty in pair "${pair}" at index ${index}. Skipping.`);
            return; 
        }
        parsedQRData.push({ fieldName: fieldName, fieldValue: fieldValue });
        foundAtLeastOneValidPair = true;
    });
    
    if (!foundAtLeastOneValidPair) {
        // This means the string was not empty, but contained no parsable fieldName:fieldValue pairs.
        throw new Error("QR code data is malformed or contains no valid field-value pairs.");
    }
    
    console.log("parseQRDataEntry: Parsed QR data:", parsedQRData);
    return parsedQRData; 
}


/**
 * Returns a copy of the dataFields array.
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
