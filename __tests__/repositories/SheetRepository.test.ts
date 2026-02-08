
import { SheetRepository } from "../../src/repositories/SheetRepository";

// Mock Types
const mockRange = {
    getValues: jest.fn(),
    setValues: jest.fn(),
    clearContent: jest.fn(),
    setBackground: jest.fn(),
    setBackgrounds: jest.fn(),
    getBackgrounds: jest.fn(),
    setValue: jest.fn(),
    protect: jest.fn(),
};

const mockProtection = {
    setDescription: jest.fn(),
    addEditor: jest.fn(),
    removeEditors: jest.fn(),
    getEditors: jest.fn(),
    canDomainEdit: jest.fn(),
    setDomainEdit: jest.fn(),
};

const mockSheet = {
    getLastRow: jest.fn(),
    getLastColumn: jest.fn(),
    getRange: jest.fn(() => mockRange),
};

const mockSpreadsheet = {
    getSheetByName: jest.fn(),
};

const mockUser = { getEmail: jest.fn() };

// Assign Globals
global.SpreadsheetApp = {
    getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
    newConditionalFormatRule: jest.fn(),
} as any;

global.Session = {
    getEffectiveUser: jest.fn(() => mockUser),
} as any;


describe("SheetRepository", () => {
    let repo: SheetRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new SheetRepository();
        (mockSpreadsheet.getSheetByName as jest.Mock).mockReturnValue(mockSheet);
        (mockRange.protect as jest.Mock).mockReturnValue(mockProtection);
        (mockProtection.getEditors as jest.Mock).mockReturnValue([]);
    });

    test("getData returns data excluding headers", () => {
        (mockSheet.getLastRow as jest.Mock).mockReturnValue(3);
        (mockSheet.getLastColumn as jest.Mock).mockReturnValue(2);
        (mockRange.getValues as jest.Mock).mockReturnValue([["Row1"], ["Row2"]]);

        const data = repo.getData("Sheet1");
        expect(data).toEqual([["Row1"], ["Row2"]]);
        expect(mockSheet.getRange).toHaveBeenCalledWith(2, 1, 2, 2);
    });

    test("getData returns empty if only header exists", () => {
        (mockSheet.getLastRow as jest.Mock).mockReturnValue(1);
        expect(repo.getData("Sheet1")).toEqual([]);
    });

    test("setData clears content and sets new values", () => {
        (mockSheet.getLastRow as jest.Mock).mockReturnValue(5);
        (mockSheet.getLastColumn as jest.Mock).mockReturnValue(2);

        const newData = [["New1"], ["New2"]];
        repo.setData("Sheet1", newData);

        // Expect clear
        expect(mockRange.clearContent).toHaveBeenCalled();
        // Expect set
        expect(mockRange.setValues).toHaveBeenCalledWith(newData);
    });

    test("appendData appends to end of sheet", () => {
        (mockSheet.getLastRow as jest.Mock).mockReturnValue(10);
        const newData = [["Appended"]];

        repo.appendData("Sheet1", newData);

        expect(mockSheet.getRange).toHaveBeenCalledWith(11, 1, 1, 1);
        expect(mockRange.setValues).toHaveBeenCalledWith(newData);
    });

    test("getHeaders returns first row", () => {
        (mockSheet.getLastColumn as jest.Mock).mockReturnValue(2);
        (mockRange.getValues as jest.Mock).mockReturnValue([["H1", "H2"]]);

        const headers = repo.getHeaders("Sheet1");
        expect(headers).toEqual(["H1", "H2"]);
        expect(mockSheet.getRange).toHaveBeenCalledWith(1, 1, 1, 2);
    });

    test("protectHeaderRow interacts with protection API", () => {
        (mockSheet.getLastColumn as jest.Mock).mockReturnValue(5);

        repo.protectHeaderRow("Sheet1");

        expect(mockRange.protect).toHaveBeenCalled();
        expect(mockProtection.setDescription).toHaveBeenCalledWith('Protected Headers');
    });
});
