
import { AdsDataService } from "../../src/services/AdsDataService";
import { SHEETS } from "../../src/Config";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { SheetDataMapper } from "../../src/utils/SheetDataMapper";

// Mock Structure to avoid real formula application
jest.mock("../../src/Structure", () => ({
    applyAdsDataFormulas: jest.fn()
}));

describe("AdsDataService - Transfer Clusters to Ads Data", () => {
    let mockRepo: jest.Mocked<ISheetRepository>;
    let service: AdsDataService;

    // Mock Mapper
    const mockMapper = {
        toObject: jest.fn(),
        toArray: jest.fn()
    };

    beforeAll(() => {
        // Mock global SpreadsheetApp
        (global as any).SpreadsheetApp = {
            getActiveSpreadsheet: jest.fn().mockReturnValue({
                getSheetByName: jest.fn().mockReturnValue({}),
            }),
            getUi: jest.fn(),
        };
        (global as any).applyAdsDataFormulas = jest.fn(); // Mock external function if needed
    });

    beforeEach(() => {
        mockRepo = {
            getData: jest.fn(),
            setData: jest.fn(),
            appendData: jest.fn(),
            getColumnValues: jest.fn(),
            setColumnValues: jest.fn(),
            clearContent: jest.fn(),
            getHeaders: jest.fn(),
            getMapper: jest.fn().mockReturnValue(mockMapper),
            getBackgrounds: jest.fn(),
            setBackgrounds: jest.fn(),
            clearColumnBackgrounds: jest.fn(),
            clearColumnValues: jest.fn()
        } as unknown as jest.Mocked<ISheetRepository>;

        service = new AdsDataService(mockRepo);

        // Setup Settings
        mockRepo.setData(SHEETS.SETTINGS, [
            ["Campaign Name", "Test Campaign"],
            ["Target URL", "https://example.com"]
        ]);

        // Setup Intent Types (Abbreviations)
        mockRepo.getColumnValues.mockImplementation((sheet, col) => {
            if (sheet === SHEETS.INTENT_TYPES && col === "Abbreviations") {
                return ["SEO", "USA"];
            }
            return [];
        });
    });

    test("should transfer clusters to ads data correctly", () => {
        // Setup Data
        mockRepo.getData.mockImplementation((sheet) => {
            if (sheet === SHEETS.SETTINGS) {
                return [
                    ["Campaign Name", "Test Campaign"],
                    ["Target URL", "https://example.com"]
                ];
            }
            if (sheet === SHEETS.CLUSTERS) {
                return [
                    ["buy iphone", "Group Alpha"],
                    ["seo services", "Group Beta"]
                ];
            }
            return [];
        });

        // Setup Headers/Mapper
        mockMapper.toObject.mockImplementation((row) => {
            if (row[0] === "buy iphone") return { "Keyword": "buy iphone", "Group name": "Group Alpha" };
            if (row[0] === "seo services") return { "Keyword": "seo services", "Group name": "Group Beta" };
            return {};
        });
        mockMapper.toArray.mockImplementation((obj) => Object.values(obj));

        const result = service.transferClustersToAdsData();

        expect(result).toContain("Transferred 2 rows");

        // Verify setData was called with correct Ads Data
        expect(mockRepo.setData).toHaveBeenCalledWith(SHEETS.ADS_DATA, expect.any(Array));
        const savedData = (mockRepo.setData as jest.Mock).mock.calls[0][1];
        expect(savedData.length).toBe(2);

        // We can't easily verify exact structure because mockMapper.toArray output depends on implementation
        // But we can check if generateAdsRow was called ideally. 
        // Or if I trust the service to pass the right object to mapper.
    });

    test("should use auto-generated group name if Group name is empty", () => {
        mockRepo.getData.mockImplementation((sheet) => {
            if (sheet === SHEETS.CLUSTERS) {
                return [["cheap laptop", ""]];
            }
            return [["Campaign Name", "Test"], ["Target URL", "http"]];
        });

        mockMapper.toObject.mockReturnValue({ "Keyword": "cheap laptop", "Group name": "" });

        service.transferClustersToAdsData();

        // Logic: transfer -> generateAdsRow -> adGroup = TitleCase(Keyword) -> "Cheap Laptop"
        // Then passed to mapper.toArray. 
        // We can spy on mapper.toArray.
        expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
            "Ad Group": "Cheap Laptop"
        }));
    });
});
