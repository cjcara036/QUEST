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
        dataFields = []; // Clear dataFields if content is invalid
        return false;
    }

    dataFields = []; // Clear the existing dataFields before parsing new content
    const segments = content.split(';');
    let overallSuccess = true;
    let fieldsAdded = 0;

    segments.forEach((segment, segmentIndex) => {
        if (segment.trim() === "") {
            // console.warn(`parseDataField (triplet): Empty segment at index ${segmentIndex}. Skipping.`);
            return; // Skip empty segments (e.g., from trailing semicolons)
        }

        const parts = segment.split(':');
        if (parts.length !== 3) {
            console.error(`parseDataField (triplet): Segment "${segment}" at index ${segmentIndex} does not have 3 parts (fieldName:fieldValue:fieldRequired). Found ${parts.length} parts.`);
            overallSuccess = false;
            return; // Skip this malformed segment
        }

        const fieldName = parts[0].trim();
        const fieldValue = parts[1].trim(); // fieldValue can be empty
        const fieldRequiredStr = parts[2].trim().toUpperCase();

        if (fieldName === "") {
            console.error(`parseDataField (triplet): fieldName cannot be empty in segment "${segment}" at index ${segmentIndex}.`);
            overallSuccess = false;
            return; // Skip this segment due to empty fieldName
        }

        if (fieldRequiredStr !== "T" && fieldRequiredStr !== "F") {
            console.error(`parseDataField (triplet): fieldRequired value must be 'T' or 'F' (case-insensitive) in segment "${segment}" at index ${segmentIndex}. Found "${parts[2].trim()}".`);
            overallSuccess = false;
            return; // Skip this segment due to invalid fieldRequired value
        }

        const fieldRequired = (fieldRequiredStr === "T");

        dataFields.push({
            fieldName: fieldName,
            fieldValue: fieldValue,
            fieldRequired: fieldRequired
        });
        fieldsAdded++;
        // console.log(`parseDataField (triplet): Added field - Name: "${fieldName}", Value: "${fieldValue}", Required: ${fieldRequired}`);
    });

    if (!overallSuccess) {
        console.error("parseDataField (triplet): Parsing completed with one or more errors. dataFields may be incomplete or reflect only valid segments.");
        // If any error occurs, we might want to clear dataFields to ensure no partial/incorrect setup.
        // However, current logic allows valid parts of a malformed string to be parsed.
        // If strict all-or-nothing parsing is needed, clear dataFields here if !overallSuccess.
        // For now, we keep successfully parsed fields even if others fail.
    } else {
        console.log(`parseDataField (triplet): Parsing successful. ${fieldsAdded} fields populated:`, dataFields);
    }
    
    // Return true if parsing was generally successful AND at least one field was actually added.
    // This handles cases like an empty string or a string with only semicolons.
    return overallSuccess && fieldsAdded > 0;
}

/**
 * Returns a copy of the dataFields array.
 * @returns {Array<{fieldName: string, fieldValue: string, fieldRequired: boolean}>} A copy of the data fields.
 */
function getDataFields() {
    // Return a copy to prevent external modification of the internal array
    return dataFields.map(field => ({ ...field }));
}


// Example usage (for testing in console):
// parseDataField("Name:John Doe:T;Age:30:T;Email::F;Occupation:Developer:F;Notes:This is a note:T;");
// console.log(getDataFields());
// parseDataField("InvalidNoColonOrRequired;ValidName:ValidValue:T;EmptyName::EmptyValueOK:F;Another:TrailingSemicolon:X;Correct:Value:T");
// console.log(getDataFields());
// parseDataField("SingleField:NoSemicolon:T");
// console.log(getDataFields());
// parseDataField("Field1:Value1:T;;Field2:Value2:F"); // Test empty segment between valid ones
// console.log(getDataFields());
// parseDataField("Field1:Val1:G"); // Test invalid required flag
// console.log(getDataFields());
