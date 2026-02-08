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
    setBackgrounds: jest.fn()
} as unknown as ISheetRepository;

const mockConfigRepo = {
    getSheetName: jest.fn((key) => key) // Return key as name (e.g. "RAW_DATA" -> "RAW_DATA")
} as unknown as IConfigRepository;

describe("CleanupService", () => {
    let service: CleanupService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CleanupService(mockSheetRepo, mockConfigRepo);
    });

    test("removeDuplicates should remove duplicate keywords", () => {
        const rawData = [
            ["keyword1", 10],
            ["keyword2", 20],
            ["keyword1", 10] // Duplicate
        ];
        (mockSheetRepo.getData as jest.Mock).mockReturnValue(rawData);

        const removed = service.removeDuplicates("RAW_DATA");

        expect(removed).toBe(1);
        expect(mockSheetRepo.setData).toHaveBeenCalledWith("RAW_DATA", [
            ["keyword1", 10],
            ["keyword2", 20]
        ]);
    });

    test("collectNegativeKeywords should aggregate unique negatives", () => {
        (mockSheetRepo.getColumnValues as jest.Mock).mockImplementation((sheet) => {
            if (sheet === "RAW_DATA") return ["neg1", "neg2"];
            if (sheet === "CLEAN_DATA") return ["neg2", "neg3"];
            if (sheet === "INTENT_TYPES") return ["neg1"];
            return [];
        });

        (mockSheetRepo.getBackgrounds as jest.Mock).mockReturnValue([["#ffffff"], ["#ffffff"]]);

        const count = service.collectNegativeKeywords();

        expect(count).toBe(3); // neg1, neg2, neg3
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "INTENT_TYPES",
            "Negative",
            ["neg1", "neg2", "neg3"]
        );
    });
});
