
import { CleanupService } from "../../src/services/CleanupService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { IConfigRepository } from "../../src/repositories/ConfigRepository";

// Mocks
const mockSheetRepo = {
    getData: jest.fn(),
    setData: jest.fn(),
    getColumnValues: jest.fn(),
    setColumnValues: jest.fn(),
    clearColumnBackgrounds: jest.fn(),
    getHeaders: jest.fn(),
    getBackgrounds: jest.fn(),
    setBackgrounds: jest.fn(),
    getMapper: jest.fn()
} as unknown as jest.Mocked<ISheetRepository>;

const mockConfigRepo = {
    getSheetName: jest.fn((key) => key)
} as unknown as jest.Mocked<IConfigRepository>;

const mockMapper = {
    toObject: jest.fn(),
    toArray: jest.fn()
};

describe("CleanupService", () => {
    let service: CleanupService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CleanupService(mockSheetRepo, mockConfigRepo);

        mockSheetRepo.getMapper.mockReturnValue(mockMapper as any);
        mockSheetRepo.getHeaders.mockReturnValue(["Keyword", "Col2"]);
        mockMapper.toObject.mockReturnValue({});
        mockMapper.toArray.mockReturnValue([]);
    });

    describe("removeDuplicates", () => {
        test("should remove duplicate keywords", () => {
            const rawData = [
                ["keyword1", 10],
                ["keyword2", 20],
                ["keyword1", 10] // Duplicate
            ];
            mockSheetRepo.getData.mockReturnValue(rawData);

            const removed = service.removeDuplicates("RAW_DATA");

            expect(removed).toBe(1);
            expect(mockSheetRepo.setData).toHaveBeenCalledWith("RAW_DATA", [
                ["keyword1", 10],
                ["keyword2", 20]
            ]);
        });
    });

    describe("transferRawToClean", () => {
        test("should parse numbers correctly during transfer", () => {
            // Mock Raw Data
            mockSheetRepo.getData.mockReturnValue([["k1"]]);

            // Mock Mapper Returns
            mockMapper.toObject.mockReturnValue({
                "Keyword": "k1",
                "Avg. monthly searches": "1 000,50", // Russian format often uses space and comma
                "Competition index": "0,5",
                "Bid Low": "10.00",
                "Bid High": ""
            });

            mockMapper.toArray.mockImplementation((obj) => [obj["Keyword"], obj["Avg. monthly searches"]]);

            const count = service.transferRawToClean();

            expect(count).toBe(1);

            // Verify setData was called with cleaned numbers
            // We can check the mockMapper.toArray call to see what object was passed
            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Avg. monthly searches": 1000.5,
                "Competition index": 0.5,
                "Bid Low": 10,
                "Bid High": 0
            }));
        });

        test("should handle commas as decimal separator", () => {
            mockSheetRepo.getData.mockReturnValue([["k1"]]);
            mockMapper.toObject.mockReturnValue({
                "Keyword": "k1",
                "Avg. monthly searches": "1,234" // Could be 1.234 or 1234 depending on locale interpretation? 
                // Logic: if only comma, replace with dot. -> 1.234
            });

            service.transferRawToClean();

            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Avg. monthly searches": 1.234
            }));
        });

        test("should handle dot as thousands separator if comma is decimal", () => {
            // Code logic: if (str.includes(',') && str.includes('.')) 
            // if (lastIndexOf(',') > lastIndexOf('.')) -> dot is thousands, comma is decimal.
            // e.g. "1.000,50" -> replace dot, replace comma with dot -> 1000.50

            mockSheetRepo.getData.mockReturnValue([["k1"]]);
            mockMapper.toObject.mockReturnValue({
                "Keyword": "k1",
                "Avg. monthly searches": "1.000,50"
            });

            service.transferRawToClean();

            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Avg. monthly searches": 1000.5
            }));
        });
    });

    describe("cleanKeysFromNegatives", () => {
        test("should remove keywords containing negatives (regex match)", () => {
            mockSheetRepo.getColumnValues.mockReturnValue(["promo"]); // Negative word

            mockSheetRepo.getData.mockReturnValue([
                ["buy iphone"],         // Keep
                ["iphone promo code"],  // Remove (contains "promo")
                ["promotional offer"]   // Keep (start with promo but logic uses \\b word boundary?)
                // Logic: new RegExp("\\b" + word + "\\b", "i")
                // "promo" -> \bpromo\b
                // "promotional" -> no match
            ]);

            mockSheetRepo.getHeaders.mockReturnValue(["Keyword"]); // keywordIdx = 0

            const removed = service.cleanKeysFromNegatives();

            expect(removed).toBe(1);
            expect(mockSheetRepo.setData).toHaveBeenCalledWith("CLEAN_DATA", [
                ["buy iphone"],
                ["promotional offer"]
            ]);
        });
    });

    describe("collectNegativeKeywords", () => {
        test("should aggregate unique negatives and highlight them", () => {
            mockSheetRepo.getColumnValues.mockImplementation((sheet) => {
                if (sheet === "RAW_DATA") return ["neg1", " NEG2 "];
                if (sheet === "CLEAN_DATA") return ["neg2", "neg3"];
                if (sheet === "INTENT_TYPES") return ["neg1"];
                return [];
            });

            // For highlighting
            // getBackgrounds Mock
            mockSheetRepo.getBackgrounds.mockReturnValue([["#ffffff"], ["#ffffff"]]);

            const count = service.collectNegativeKeywords();

            expect(count).toBe(3); // neg1, neg2, neg3
            expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
                "INTENT_TYPES",
                "Negative",
                ["neg1", "neg2", "neg3"]
            );

            // Check highlighting called
            // RAW_DATA has "neg1", " NEG2 ". Set is {neg1, neg2, neg3}.
            // Both should be highlighted.
            expect(mockSheetRepo.setBackgrounds).toHaveBeenCalled();
        });
    });
});
