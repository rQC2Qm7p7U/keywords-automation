import { CleanupService } from "../../src/services/CleanupService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { IConfigRepository } from "../../src/repositories/ConfigRepository";

const mockSheetRepo = {
    getData: jest.fn(),
    setData: jest.fn(),
    appendData: jest.fn(),
    clearContent: jest.fn(),
    getColumnValues: jest.fn(),
    setColumnValues: jest.fn(),
    clearColumnValues: jest.fn(),
    clearColumnBackgrounds: jest.fn(),
    getHeaders: jest.fn(),
    getBackgrounds: jest.fn(),
    setBackgrounds: jest.fn(),
    getMapper: jest.fn(),
    protectHeaderRow: jest.fn(),
    setCellValue: jest.fn(),
    invalidateCache: jest.fn()
} as unknown as jest.Mocked<ISheetRepository>;

const mockConfigRepo = {
    getSheetName: jest.fn((key) => key)
} as unknown as jest.Mocked<IConfigRepository>;

describe("CleanupService.clearAllData", () => {
    let service: CleanupService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CleanupService(mockSheetRepo, mockConfigRepo);
    });

    test("should clear all 6 sheets and return correct stats", () => {
        const sheets = ["Raw Data", "Clean Data", "Clusters", "Ads Data", "Ads Phrase", "Ads Adaptive"];

        const result = service.clearAllData(sheets);

        expect(result.cleared).toBe(6);
        expect(result.skipped).toEqual([]);
        expect(mockSheetRepo.clearContent).toHaveBeenCalledTimes(6);
        sheets.forEach(name => {
            expect(mockSheetRepo.clearContent).toHaveBeenCalledWith(name);
        });
    });

    test("should skip non-existent sheets without crashing", () => {
        (mockSheetRepo.clearContent as jest.Mock).mockImplementation((name: string) => {
            if (name === "Missing Sheet") throw new Error("Sheet not found: Missing Sheet");
        });

        const sheets = ["Raw Data", "Missing Sheet", "Clean Data"];

        const result = service.clearAllData(sheets);

        expect(result.cleared).toBe(2);
        expect(result.skipped).toEqual(["Missing Sheet"]);
        expect(mockSheetRepo.clearContent).toHaveBeenCalledTimes(3);
    });

    test("should handle empty sheet list", () => {
        const result = service.clearAllData([]);

        expect(result.cleared).toBe(0);
        expect(result.skipped).toEqual([]);
        expect(mockSheetRepo.clearContent).not.toHaveBeenCalled();
    });

    test("should handle all sheets missing", () => {
        (mockSheetRepo.clearContent as jest.Mock).mockImplementation(() => {
            throw new Error("Sheet not found");
        });

        const sheets = ["Sheet1", "Sheet2"];

        const result = service.clearAllData(sheets);

        expect(result.cleared).toBe(0);
        expect(result.skipped).toEqual(["Sheet1", "Sheet2"]);
    });
});
