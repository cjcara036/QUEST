/**
 * main_dataStructure.js
 * Contains the data structure for form fields and the parser for
 * QR code content that defines these fields.
 * New format: fieldName:fieldValue:fieldRequired (T/F)
 */

/**
 * @type {Array<{fieldName: string, fieldValue: string, fieldRequired: boolean}>}
 * Stores the definitions of data fields to be used in forms.
 * Each object in the array represents a single data field.
 * - fieldName: The label or identifier for the field (cannot be empty).
 * - fieldValue: The initial or current value of the field (can be empty).
 * - fieldRequired: Boolean indicating if the field is mandatory (true if "T", false if "F").
 */
let dataFields = [];

/**
 * Separator character used between individual fieldName:fieldValue pairs within a single entry string.
 * @type {string}
 */
const SEP_ENTRY_FIELD = "|"; // Renamed to avoid confusion with SEP_CHAR in main_EntryStorage.js

/**
 * Parses a string containing field definitions (triplets) and populates the dataFields array.
 * The input string is expected to be a series of fieldName:fieldValue:fieldRequired triplets,
 * separated by semicolons.
 * Example: "Name:John Doe:T;Age:30:T;Email::F;Occupation:Developer:F"
 *
 * @param {string} content - The string to parse.
 * @returns {boolean} True if parsing was successful and at least one valid field was added, false otherwise.
 */
function parseDataField(content) {
    console.log("parseDataField (triplet): Received content:", content);
    if (typeof content !== 'string' || content.trim() === "") {
        console.error("parseDataField (triplet): Content is not a string or is empty.");
        dataFields = []; 
        return false;
    }

    dataFields = []; 
    const segments = content.split(';');
    let overallSuccess = true;
    let fieldsAdded = 0;

    segments.forEach((segment, segmentIndex) => {
        if (segment.trim() === "") {
            return; 
        }

        const parts = segment.split(':');
        if (parts.length !== 3) {
            console.error(`parseDataField (triplet): Segment "${segment}" at index ${segmentIndex} does not have 3 parts. Found ${parts.length}.`);
            overallSuccess = false;
            return; 
        }

        const fieldName = parts[0].trim();
        const fieldValue = parts[1].trim(); 
        const fieldRequiredStr = parts[2].trim().toUpperCase();

        if (fieldName === "") {
            console.error(`parseDataField (triplet): fieldName cannot be empty in segment "${segment}" at index ${segmentIndex}.`);
            overallSuccess = false;
            return; 
        }

        if (fieldRequiredStr !== "T" && fieldRequiredStr !== "F") {
            console.error(`parseDataField (triplet): fieldRequired value must be 'T' or 'F' in segment "${segment}" at index ${segmentIndex}. Found "${parts[2].trim()}".`);
            overallSuccess = false;
            return; 
        }

        const fieldRequired = (fieldRequiredStr === "T");

        dataFields.push({
            fieldName: fieldName,
            fieldValue: fieldValue,
            fieldRequired: fieldRequired
        });
        fieldsAdded++;
    });

    if (!overallSuccess) {
        console.error("parseDataField (triplet): Parsing completed with one or more errors.");
    } else {
        console.log(`parseDataField (triplet): Parsing successful. ${fieldsAdded} fields populated.`);
    }
    
    return overallSuccess && fieldsAdded > 0;
}

/**
 * Returns a copy of the dataFields array.
 * @returns {Array<{fieldName: string, fieldValue: string, fieldRequired: boolean}>} A copy of the data fields.
 */
function getDataFields() {
    return dataFields.map(field => ({ ...field }));
}

/**
 * Creates a string pair in the format "[fieldName]:[fieldValue]".
 * @param {string} fieldName - The name of the field.
 * @param {string} fieldValue - The value of the field.
 * @returns {string} The formatted string pair.
 */
function makeDataFieldStringPair(fieldName, fieldValue) {
    if (typeof fieldName !== 'string' || typeof fieldValue !== 'string') {
        console.error("makeDataFieldStringPair: fieldName and fieldValue must be strings.");
        return ""; // Return empty or handle error as appropriate
    }
    // Note: Values containing ":" or "|" will cause issues if not handled during parsing on the receiving end.
    // For this tool's internal consistency, we assume they are simple strings for now.
    return `${fieldName}:${fieldValue}`;
}

/**
 * Consolidates an array of string pairs into a single string, separated by SEP_ENTRY_FIELD.
 * @param {string[]} stringPairArray - An array of string pairs (e.g., ["Name:John", "Age:30"]).
 * @returns {string} The consolidated entry string.
 */
function makeEntryString(stringPairArray) {
    if (!Array.isArray(stringPairArray)) {
        console.error("makeEntryString: Input must be an array.");
        return "";
    }
    return stringPairArray.join(SEP_ENTRY_FIELD);
}
