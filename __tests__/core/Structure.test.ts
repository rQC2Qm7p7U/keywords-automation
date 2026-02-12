
import { createStructure } from "../../src/Structure";
import { SHEETS } from "../../src/Config";

// Mocks for Structure.ts
// It uses SpreadsheetApp.getActiveSpreadsheet(), insertSheet, deleteSheet, getSheetByName, etc.
// formatting: setFrozenRows, setFontWeight, protect

const mockProtection = {
    setDescription: jest.fn(),
    addEditor: jest.fn(),
    removeEditors: jest.fn(),
    getEditors: jest.fn().mockReturnValue([]),
    setDomainEdit: jest.fn(),
    canDomainEdit: jest.fn().mockReturnValue(true),
};

// Mock headers for Ads Data sheet — includes "Len" columns to exercise applyAdsDataFormulas
const mockAdsHeaders = [
    "Campaign", "Ad Group", "Keyword",
    "Keyword for Headline 1", "Len",
    "Headline 1", "Len 1", "Headline 2", "Len 2",
    "Description 1", "Len D1",
    "Final URL", "Path1", "Len P1",
];

// Use self-referencing style for chaining
const mockRange: any = {
    setValues: jest.fn(),
    setFontWeight: jest.fn(),
    protect: jest.fn().mockReturnValue(mockProtection),
    setValue: jest.fn(),
    setFormula: jest.fn(),
    setBackground: jest.fn(),
    setDataValidation: jest.fn(),
    autoResizeColumns: jest.fn(),
    getValues: jest.fn().mockReturnValue([mockAdsHeaders]),
    clearContent: jest.fn(),
};

// Enable chaining
mockRange.setValues.mockReturnValue(mockRange);
mockRange.setFontWeight.mockReturnValue(mockRange);
mockRange.setValue.mockReturnValue(mockRange);
mockRange.setFormula.mockReturnValue(mockRange);
mockRange.setBackground.mockReturnValue(mockRange);
mockRange.setDataValidation.mockReturnValue(mockRange);
mockRange.autoResizeColumns.mockReturnValue(mockRange);
mockRange.clearContent.mockReturnValue(mockRange);
mockRange.getValues.mockReturnValue([mockAdsHeaders]);

const mockSheet = {
    getRange: jest.fn().mockReturnValue(mockRange),
    setFrozenRows: jest.fn(),
    getLastColumn: jest.fn().mockReturnValue(5),
    getLastRow: jest.fn().mockReturnValue(10), // For cleaning logic
    getMaxRows: jest.fn().mockReturnValue(100),
    activate: jest.fn(),
    hideSheet: jest.fn(),
    autoResizeColumns: jest.fn(),
    setColumnWidth: jest.fn(),
    getConditionalFormatRules: jest.fn().mockReturnValue([]),
    setConditionalFormatRules: jest.fn(),
    insertRowsAfter: jest.fn(),
};

const mockSpreadsheet = {
    getSheets: jest.fn().mockReturnValue([]), // Initially empty
    insertSheet: jest.fn().mockReturnValue(mockSheet),
    deleteSheet: jest.fn(),
    moveActiveSheet: jest.fn(),
    toast: jest.fn(),
};

const mockValidationBuilder = {
    requireValueInList: jest.fn().mockReturnThis(),
    requireValueInRange: jest.fn().mockReturnThis(),
    requireCheckbox: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue("Rule"),
};

global.SpreadsheetApp = {
    getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
    newConditionalFormatRule: jest.fn(() => ({
        whenNumberLessThan: jest.fn().mockReturnThis(),
        whenNumberBetween: jest.fn().mockReturnThis(),
        whenNumberEqualTo: jest.fn().mockReturnThis(),
        setBackground: jest.fn().mockReturnThis(),
        setRanges: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue("Rule"),
    })),
    newDataValidation: jest.fn(() => mockValidationBuilder),
} as any;

global.Session = {
    getEffectiveUser: jest.fn().mockReturnValue({ getEmail: jest.fn() }),
} as any;

global.UrlFetchApp = {
    fetch: jest.fn().mockReturnValue({
        getContentText: jest.fn().mockReturnValue("Region Name,123"),
    }),
} as any;

global.Utilities = {
    parseCsv: jest.fn().mockReturnValue([["Region Name", "123"]]),
} as any;

describe("Structure", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (mockSheet.getRange as jest.Mock).mockReturnValue(mockRange);
        (mockSpreadsheet.insertSheet as jest.Mock).mockReturnValue(mockSheet);
    });

    test("createStructure creates all required sheets", () => {
        // Mock getSheets to return some existing sheets to test deletion
        const oldSheet = { getName: () => "OldSheet" };
        mockSpreadsheet.getSheets.mockReturnValue([oldSheet]);

        createStructure();

        // 1. Should create Temp Sheet
        expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith(expect.stringContaining("Temp_Setup_"));

        // 2. Should delete old sheets
        expect(mockSpreadsheet.deleteSheet).toHaveBeenCalledWith(oldSheet);

        // 3. Should create standard sheets
        expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith(SHEETS.INTENT_TYPES);
        expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith(SHEETS.RAW_DATA);
        expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith(SHEETS.CLEAN_DATA);
        expect(mockSpreadsheet.insertSheet).toHaveBeenCalledWith(SHEETS.SETTINGS);

        // 4. Should set headers and Validations
        expect(mockRange.setValues).toHaveBeenCalled();
        expect(mockRange.setFontWeight).toHaveBeenCalledWith("bold");
        expect(mockSheet.setFrozenRows).toHaveBeenCalledWith(1);

        // 5. Should toast success
        expect(mockSpreadsheet.toast).toHaveBeenCalled();
    });
});
