# QUEST - QR User Entry & Scan Tool

QUEST (QR User Entry & Scan Tool) is a lightweight web application designed to facilitate rapid data capture using QR codes. It allows users to define custom form fields by scanning a "Form Setup" QR code, then quickly add new data entries by either manually filling out the generated form or scanning "Entry Data" QR codes. All collected data is stored locally in the browser's cookies and can be exported as a single QR code for easy transfer to a target application or system.

## Features

- **Dynamic Form Generation**: Define your data entry form fields by scanning a setup QR code.
- **QR Code Scanning**:
    - Scan a "Form Setup" QR code to configure the application's data fields.
    - Scan "Entry Data" QR codes to pre-fill form fields for quick data entry.
- **Manual Data Entry**: Manually input data into the dynamically generated forms.
- **Local Data Storage**: All entries are stored securely in your browser's cookies.
- **Data Export**: Generate a single QR code containing all collected entries for easy transfer.
- **Entry Review & Edit**: Browse through saved entries, and edit them if needed.

## How to Use

### 1. App Sync (Form Setup)

This is the first step to configure QUEST for your specific data entry needs.

- **Scan Form Setup QR**:
    - Navigate to the "App Sync" tab.
    - The camera will activate, ready to scan a "Form Setup" QR code.
    - This QR code should contain field definitions in the format: `fieldName1:defaultValue1:T/F;fieldName2:defaultValue2:T/F;...`
        - `T` indicates a required field, `F` indicates an optional field.
        - Example: `Name::T;Age::F;Date:NOW():T` (NOW() will be replaced by current date/time)
    - Once scanned, QUEST will parse these definitions and set up your data entry form. All previous entries will be cleared.

- **Export Data (QR Entry Generation)**:
    - After adding entries (see "Add Entry" below), you can return to the "App Sync" tab.
    - Click the "Export Data" button (top-left).
    - A QR code will be displayed containing all your collected entries. Scan this QR code with your target application to transfer the data.

### 2. Add Entry

This section allows you to add new data entries.

- **Create New Entry**:
    - Navigate to the "Add Entry" tab.
    - A form will be displayed based on the fields defined in "App Sync".
    - Fill in the fields manually. Required fields are marked with an asterisk (*).
    - **Scan Data**: Click the "Scan Data" FAB (Floating Action Button) to activate a QR scanner. Scan an "Entry Data" QR code to pre-fill empty fields in your form. The format for this QR code is: `fieldName1:fieldValue1;fieldName2:fieldValue2;...`
    - Click the "Add Entry" FAB to save your data.
- **Edit Entry**:
    - If you are editing an entry from the "Review" section, the form will be pre-populated with the entry's data.
    - Make your changes and click the "Save Changes" FAB.
- **Clear Form**: Click the "Clear Form" FAB to reset the form to its default state (empty or initial values). If editing, it reverts to the original entry data.

### 3. Review Entries

Browse and manage your saved data entries.

- **Navigate Entries**: Use the left and right arrow buttons or swipe gestures to move between entries.
- **Edit Entry**: Click the "Edit" FAB to load the current entry into the "Add Entry" form for modifications. The entry will be temporarily removed from storage until saved again.

## Guide for Developers: Data Structures

QUEST uses a simple, string-based data structure for storing and transferring data, primarily leveraging browser cookies. This design prioritizes simplicity and direct QR code compatibility.

### Core Concepts

- **Field Definition (Form Setup)**: Defines the structure of your data entry form.
- **Entry Data**: The actual data collected for each entry.

### Data Structure Details

#### 1. Field Definition (Used in `main_dataStructure.js` `dataFields` array)

When you scan a "Form Setup" QR code, the content is parsed into an array of field definitions.

- **QR Code Format**: `fieldName1:defaultValue1:T/F;fieldName2:defaultValue2:T/F;...`
    - Each field is a triplet separated by a semicolon (`;`).
    - Within each triplet, `fieldName`, `defaultValue`, and `requiredFlag` are separated by a colon (`:`).
    - `requiredFlag`: `T` for true (required), `F` for false (optional).
    - `defaultValue`: Can be empty, or a specific string. `NOW()` is a special value that gets replaced by the current date/time upon form loading.

- **Internal Representation (`dataFields` array)**:
    ```javascript
    // Example after parsing "Name::T;Age::F;Date:NOW():T"
    let dataFields = [
        { fieldName: "Name", fieldValue: "", fieldRequired: true },
        { fieldName: "Age", fieldValue: "", fieldRequired: false },
        { fieldName: "Date", fieldValue: "NOW()", fieldRequired: true }
    ];
    ```

#### 2. Entry Data Storage (Used in `main_EntryStorage.js` and `main_dataStructure.js`)

All collected entries are concatenated into a single string and stored in a browser cookie named `"questEntryContent"`.

- **Entry Separator (`SEP_CHAR`)**: Each individual entry is separated by a tilde (`~`).
    - Defined in `main_EntryStorage.js`: `const SEP_CHAR = "~";`
- **Field-Value Pair Separator (`SEP_ENTRY_FIELD`)**: Within a single entry, field-value pairs are separated by a pipe (`|`).
    - Defined in `main_dataStructure.js`: `const SEP_ENTRY_FIELD = "|";`
- **Field-Value Pair Format**: Each field-value pair within an entry is in the format `fieldName:fieldValue`.

- **Example of a Stored Entry String in Cookie**:
    ```
    Name:John Doe|Age:30|Date:08/06/2025 19:30~Name:Jane Smith|Age:25|Date:08/06/2025 19:35
    ```
    This string represents two entries.

- **Internal Representation (Parsed by `getAllEntriesAsObjects()` in `main_dataStructure.js`)**:
    ```javascript
    // Example of parsed data from the above cookie string
    [
        [ // First Entry
            { fieldName: "Name", fieldValue: "John Doe" },
            { fieldName: "Age", fieldValue: "30" },
            { fieldName: "Date", fieldValue: "08/06/2025 19:30" }
        ],
        [ // Second Entry
            { fieldName: "Name", fieldValue: "Jane Smith" },
            { fieldName: "Age", fieldValue: "25" },
            { fieldName: "Date", fieldValue: "08/06/2025 19:35" }
        ]
    ]
    ```

### Integration Guide

To integrate with QUEST, your target application needs to be able to:

1.  **Generate Form Setup QR Codes**:
    -   Create a QR code with a string following the `fieldName:defaultValue:T/F;...` format. This allows QUEST to dynamically build the data entry form.
    -   Ensure field names are consistent with what your target application expects.

2.  **Generate Entry Data QR Codes (Optional)**:
    -   If you want to pre-fill fields in QUEST, generate QR codes with data in the `fieldName:fieldValue;...` format. QUEST will scan this and populate matching empty fields.

3.  **Parse Exported Data QR Codes**:
    -   Your application should be able to scan a QR code generated by QUEST (from the "Export Data" section).
    -   The scanned string will be a concatenation of all entries, separated by `~`.
    -   Each entry will be a string of `fieldName:fieldValue` pairs, separated by `|`.
    -   You will need to parse this string to reconstruct the individual entries and their field-value pairs.

    ```javascript
    // Example parsing logic for your target application (pseudo-code)
    function parseQuestExport(exportedQrString) {
        const entries = exportedQrString.split('~');
        const parsedData = [];

        entries.forEach(entryString => {
            if (entryString.trim() === "") return;

            const fieldPairs = entryString.split('|');
            const currentEntry = {};

            fieldPairs.forEach(pairString => {
                if (pairString.trim() === "") return;
                const parts = pairString.split(':');
                if (parts.length >= 2) {
                    const fieldName = parts[0].trim();
                    const fieldValue = parts.slice(1).join(':').trim(); // Handle values with colons
                    currentEntry[fieldName] = fieldValue;
                }
            });
            if (Object.keys(currentEntry).length > 0) {
                parsedData.push(currentEntry);
            }
        });
        return parsedData;
    }

    // Usage:
    // const qrContent = "Name:John Doe|Age:30~Name:Jane Smith|Age:25"; // Scanned from QUEST
    // const data = parseQuestExport(qrContent);
    // console.log(data);
    /*
    [
        { Name: "John Doe", Age: "30" },
        { Name: "Jane Smith", Age: "25" }
    ]
    */
    ```

This structured approach ensures clear communication and easy data exchange between QUEST and any integrated system.
