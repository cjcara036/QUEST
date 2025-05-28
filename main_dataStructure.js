/**
 * main_dataStructure.js
 * Contains the data structure for form fields and the parser for
 * QR code content that defines these fields.
 */

/**
 * @type {Array<{fieldName: string, fieldValue: string}>}
 * Stores the definitions of data fields to be used in forms.
 * Each object in the array represents a single data field.
 * - fieldName: The label or identifier for the field (cannot be empty).
 * - fieldValue: The initial or current value of the field (can be empty).
 */
let dataFields = [];

/**
 * Parses a string containing field definitions and populates the dataFields array.
 * The input string is expected to be a series of fieldName:fieldValue pairs,
 * separated by semicolons.
 * Example: "Name:John Doe;Age:30;Email:;Occupation:Developer"
 *
 * @param {string} content - The string to parse.
 * @returns {boolean} True if parsing was successful, false otherwise.
 */
function parseDataField(content) {
    console.log("parseDataField: Received content:", content);
    if (typeof content !== 'string' || content.trim() === "") {
        console.error("parseDataField: Content is not a string or is empty.");
        dataFields = []; // Clear dataFields if content is invalid
        return false;
    }

    // Clear the existing dataFields before parsing new content
    dataFields = [];

    const pairs = content.split(';');
    let success = true;

    pairs.forEach((pair, index) => {
        if (pair.trim() === "") {
            // Allow empty segments if they are due to trailing semicolons, for example.
            // Or, if a segment is truly empty between two semicolons, it's an error.
            // For now, we'll skip fully empty segments.
            // console.warn(`parseDataField: Empty pair segment at index ${index}. Skipping.`);
            return; // Skip this iteration
        }

        const colonIndex = pair.indexOf(':');

        if (colonIndex === -1) {
            console.error(`parseDataField: Pair "${pair}" at index ${index} is missing a colon separator.`);
            success = false;
            return; // Skip this malformed pair
        }

        const fieldName = pair.substring(0, colonIndex).trim();
        // fieldValue can be empty, so we take everything after the colon.
        // If colon is the last char, fieldValue will be empty string.
        const fieldValue = pair.substring(colonIndex + 1).trim();

        if (fieldName === "") {
            console.error(`parseDataField: fieldName cannot be empty in pair "${pair}" at index ${index}.`);
            success = false;
            return; // Skip this pair due to empty fieldName
        }

        dataFields.push({ fieldName: fieldName, fieldValue: fieldValue });
        // console.log(`parseDataField: Added field - Name: "${fieldName}", Value: "${fieldValue}"`);
    });

    if (!success) {
        console.error("parseDataField: Parsing completed with errors. dataFields may be incomplete or incorrect.");
    } else {
        console.log("parseDataField: Parsing successful. dataFields populated:", dataFields.length > 0 ? dataFields : " (empty - possibly due to only empty/invalid pairs)");
    }

    return success;
}

/**
 * Returns a copy of the dataFields array.
 * @returns {Array<{fieldName: string, fieldValue: string}>} A copy of the data fields.
 */
function getDataFields() {
    // Return a copy to prevent external modification of the internal array
    return [...dataFields];
}


// Example usage (for testing in console):
// parseDataField("Name:John Doe;Age:30;Email:;Occupation:Developer;Notes:This is a note;");
// console.log(getDataFields());
// parseDataField("InvalidNoColon;ValidName:ValidValue;EmptyName::EmptyValueOK;Another:TrailingSemicolon;");
// console.log(getDataFields());
// parseDataField("");
// console.log(getDataFields());
// parseDataField("SingleField:NoSemicolon");
// console.log(getDataFields());
