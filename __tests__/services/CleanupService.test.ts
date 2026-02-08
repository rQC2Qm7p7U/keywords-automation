
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
            // Keyword(0), Currency(1), Searches(2), ..., Comp Index(6), Bid Low(7), Bid High(8)
            const row: any[] = [];
            row[0] = "k1";
            row[2] = "1 000,50";
            row[6] = "0,5";
            row[7] = "10.00";
            row[8] = "";
            mockSheetRepo.getData.mockReturnValue([row]);

            mockMapper.toArray.mockImplementation((obj) => [obj["Keyword"], obj["Avg. monthly searches"]]);

            const count = service.transferRawToClean();

            expect(count).toBe(1);

            // Verify setData was called with cleaned numbers
            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Avg. monthly searches": 1000.5,
                "Competition index": 0.5,
                "Bid Low": 10,
                "Bid High": 0
            }));
        });

        test("should handle commas as decimal separator", () => {
            const row: any[] = [];
            row[0] = "k1";
            row[2] = "1,234";
            mockSheetRepo.getData.mockReturnValue([row]);

            service.transferRawToClean();

            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Avg. monthly searches": 1.234
            }));
        });

        test("should handle dot as thousands separator if comma is decimal", () => {
            const row: any[] = [];
            row[0] = "k1";
            row[2] = "1.000,50";
            mockSheetRepo.getData.mockReturnValue([row]);

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
                if (sheet === "CLUSTERS") return [];
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

        test("should split negatives by comma and semicolon", () => {
            mockSheetRepo.getColumnValues.mockImplementation((sheet) => {
                if (sheet === "RAW_DATA") return ["neg1, neg2", "neg3; neg4"];
                return [];
            });

            mockSheetRepo.getBackgrounds.mockReturnValue([["#ffffff"], ["#ffffff"]]);

            const count = service.collectNegativeKeywords();

            expect(count).toBe(4); // neg1, neg2, neg3, neg4
            expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
                "INTENT_TYPES",
                "Negative",
                ["neg1", "neg2", "neg3", "neg4"]
            );
        });

        test("should handle tricky number formats in transferRawToClean", () => {
            // Mock various weird number formats the user might have
            const trickyInputs = [
                { raw: "1 000", expected: 1000 },
                { raw: "1,000.50", expected: 1000.5 },
                { raw: "1.000,50", expected: 1000.5 },
                { raw: "1 000,50", expected: 1000.5 },
                { raw: "1\u00A0000", expected: 1000 }, // NBSP
                { raw: "1000", expected: 1000 },
                { raw: "< 10", expected: 10 },
            ];

            const data = trickyInputs.map(input => {
                const row: any[] = [];
                row[0] = "k1";
                row[2] = input.raw; // Searches
                row[6] = "0.1"; // Comp
                row[7] = "0.1"; // Bid Low
                row[8] = "0.1"; // Bid High
                return row;
            });

            mockSheetRepo.getData.mockReturnValue(data);

            mockMapper.toArray.mockClear();

            service.transferRawToClean();

            trickyInputs.forEach((input, index) => {
                expect(mockMapper.toArray).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
                    "Avg. monthly searches": input.expected
                }));
            });
        });
    });
});
