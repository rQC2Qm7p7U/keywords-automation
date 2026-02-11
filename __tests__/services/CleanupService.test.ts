
import { CleanupService } from "../../src/services/CleanupService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { IConfigRepository } from "../../src/repositories/ConfigRepository";

// Mocks
const mockSheetRepo = {
    getData: jest.fn(),
    setData: jest.fn(),
    appendData: jest.fn(),
    getColumnValues: jest.fn(),
    setColumnValues: jest.fn(),
    clearColumnValues: jest.fn(),
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
        mockSheetRepo.getColumnValues.mockReturnValue([]); // Default empty array
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

            const result = service.removeDuplicates("RAW_DATA");

            expect(result).toEqual({ removed: 1, remaining: 2 });
            expect(mockSheetRepo.setData).toHaveBeenCalledWith("RAW_DATA", [
                ["keyword1", 10],
                ["keyword2", 20]
            ]);
        });

        test("should remove empty keyword rows", () => {
            const rawData = [
                ["keyword1", 10],
                ["", ""],          // Empty
                ["keyword2", 20],
                ["  ", ""],        // Whitespace-only
            ];
            mockSheetRepo.getData.mockReturnValue(rawData);

            const result = service.removeDuplicates("RAW_DATA");

            expect(result).toEqual({ removed: 2, remaining: 2 });
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
                "Avg. monthly searches": 1001, // Math.round(1000.5) -> 1001
                "Competition index": 0.5,
                "Bid Low": 10,
                "Bid High": 0
            }));
        });

        test("should handle commas as decimal separator", () => {
            mockSheetRepo.getData.mockReturnValue([["k1"]]);
            mockMapper.toObject.mockReturnValue({
                "Keyword": "k1",
                "Avg. monthly searches": "1,234" // 1.234
            });

            service.transferRawToClean();

            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Avg. monthly searches": 1 // Math.round(1.234) -> 1
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
                "Avg. monthly searches": 1001 // Math.round(1000.5) -> 1001
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

            const { cleanRemoved, clustersRemoved } = service.cleanKeysFromNegatives();

            expect(cleanRemoved).toBe(1);
            expect(mockSheetRepo.setData).toHaveBeenCalledWith("CLEAN_DATA", [
                ["buy iphone"],
                ["promotional offer"]
            ]);
        });

        test("should clean Clusters sheet (negatives only, no search check)", () => {
            // Mock Negatives
            mockSheetRepo.getColumnValues.mockImplementation((sheet, col) => {
                if (sheet === "INTENT_TYPES" && col === "Negative") return ["bad"];
                return [];
            });

            // Mock Data for CLEAN_DATA (return empty to focus on Clusters)
            mockSheetRepo.getData.mockImplementation((sheet) => {
                if (sheet === "CLEAN_DATA") return [];
                if (sheet === "CLUSTERS") return [
                    ["good keyword", "Group A"],
                    ["bad keyword", "Group B"], // Remove (negative)
                    ["zero search", "Group C"]  // Keep (no search check for Clusters)
                ];
                return [];
            });

            // Mock Headers
            mockSheetRepo.getHeaders.mockImplementation((sheet) => {
                if (sheet === "CLEAN_DATA") return ["Keyword", "Avg. monthly searches"];
                if (sheet === "CLUSTERS") return ["Keyword", "Group"];
                return [];
            });

            const { cleanRemoved, clustersRemoved } = service.cleanKeysFromNegatives();

            expect(clustersRemoved).toBe(1);
            expect(mockSheetRepo.setData).toHaveBeenCalledWith("CLUSTERS", [
                ["good keyword", "Group A"],
                ["zero search", "Group C"]
            ]);
        });
    });

    describe("collectNegativeKeywords", () => {
        test("should aggregate unique negatives and highlight them", () => {
            mockSheetRepo.getColumnValues.mockImplementation((sheet) => {
                if (sheet === "RAW_DATA") return ["neg1", " NEG2 "];
                if (sheet === "CLEAN_DATA") return ["neg2", "neg3"];
                if (sheet === "INTENT_TYPES") return ["neg1"];
                if (sheet === "CLUSTERS") return [];
                return [];
            });

            // For highlighting
            // getBackgrounds Mock
            mockSheetRepo.getBackgrounds.mockReturnValue([["#ffffff"], ["#ffffff"]]);

            const stats = service.collectNegativeKeywords();

            expect(stats.total).toBe(3); // neg1, neg2, neg3
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

        test("should split negatives by comma and semicolon", () => {
            mockSheetRepo.getColumnValues.mockImplementation((sheet, col) => {
                if (sheet === "RAW_DATA" && col === "Negative") return ["neg1, neg2", "neg3; neg4"];
                // Mock headers check in highlightConflicts
                if (sheet === "INTENT_TYPES" && col === "Negative") return [];
                return [];
            });

            mockSheetRepo.getBackgrounds.mockReturnValue([["#ffffff"], ["#ffffff"]]);
            // Mock headers
            mockSheetRepo.getHeaders.mockImplementation((sheet) => {
                if (sheet === "INTENT_TYPES") return ["Negative"];
                return ["Keyword", "Negative"]; // Default
            });

            const stats = service.collectNegativeKeywords();

            expect(stats.total).toBe(4); // neg1, neg2, neg3, neg4
            expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
                "INTENT_TYPES",
                "Negative",
                ["neg1", "neg2", "neg3", "neg4"]
            );
        });

        test("should highlight conflicts in Intent Types yellow", () => {
            // Setup: "bad neg" in Transactional column, "neg" in Negative column.
            mockSheetRepo.getColumnValues.mockImplementation((sheet, col) => {
                if (sheet === "RAW_DATA") return [];
                if (sheet === "INTENT_TYPES") {
                    if (col === "Negative") return ["neg"];
                    if (col === "Transactional") return ["good val", "bad neg match"];
                }
                return [];
            });

            mockSheetRepo.getHeaders.mockReturnValue(["Transactional", "Negative"]);
            mockSheetRepo.getBackgrounds.mockReturnValue([["#ffffff"], ["#ffffff"]]); // 2 rows

            service.collectNegativeKeywords();

            // Expect setBackgrounds to be called for "Transactional" column
            // Row 2 ("bad neg match") should be yellow
            expect(mockSheetRepo.setBackgrounds).toHaveBeenCalledWith(
                "INTENT_TYPES",
                "Transactional",
                expect.arrayContaining([
                    ["#ffffff"],
                    ["#ffff00"] // Yellow
                ])
            );
        });
    });
});
