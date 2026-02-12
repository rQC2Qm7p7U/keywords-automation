
import { ConfigRepository } from "../../src/repositories/ConfigRepository";
import { CONFIG, SHEETS } from "../../src/Config";

// Mock GAS Globals
const mockSheet = {
    getRange: jest.fn(),
    getLastRow: jest.fn(),
};

const mockSpreadsheet = {
    getSheetByName: jest.fn(),
};

global.SpreadsheetApp = {
    getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
} as any;




describe("ConfigRepository", () => {
    let repo: ConfigRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new ConfigRepository();
    });

    test("getSheetName returns correct sheet name from constant", () => {
        expect(repo.getSheetName("RAW_DATA")).toBe(SHEETS.RAW_DATA);
        expect(repo.getSheetName("SETTINGS")).toBe(SHEETS.SETTINGS);
    });

    test("getProjectName returns correct project name", () => {
        expect(repo.getProjectName()).toBe(CONFIG.PROJECT_NAME);
    });

    test("getApiUrl returns correct URL from Config module", () => {
        expect(repo.getApiUrl("BASE_URL")).toBe("https://arsenkin.ru/api/tools/set");
    });

    test("getRegions returns empty array if sheet not found", async () => {
        (mockSpreadsheet.getSheetByName as jest.Mock).mockReturnValue(null);
        const regions = await repo.getRegions();
        expect(regions).toEqual([]);
    });

    test("getRegions returns mapped regions from sheet", async () => {
        (mockSpreadsheet.getSheetByName as jest.Mock).mockReturnValue(mockSheet);
        (mockSheet.getLastRow as jest.Mock).mockReturnValue(3);

        const mockRange = {
            getValues: jest.fn().mockReturnValue([
                ["Region A", 1],
                ["Region B", 2]
            ])
        };
        (mockSheet.getRange as jest.Mock).mockReturnValue(mockRange);

        const regions = await repo.getRegions();
        expect(regions).toEqual([
            ["Region A", "1"],
            ["Region B", "2"]
        ]);
        expect(mockSheet.getRange).toHaveBeenCalledWith(2, 1, 2, 2);
    });
});
