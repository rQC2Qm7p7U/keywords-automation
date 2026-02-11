import { AdsDataService } from "../../src/services/AdsDataService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";

// Mock Structure
jest.mock("../../src/Structure", () => ({
    applyAdsDataFormulas: jest.fn()
}));

// Define Mock Interfaces to help Typescript
interface MockSheetRepo extends ISheetRepository {
    getData: jest.Mock;
    setData: jest.Mock;
    getHeaders: jest.Mock;
    getMapper: jest.Mock;
    clearContent: jest.Mock;
    getColumnValues: jest.Mock;
    setColumnValues: jest.Mock;
}

interface MockMapper {
    toArray: jest.Mock;
    fromArray: jest.Mock;
    toObject: jest.Mock;
}

describe("AdsDataService", () => {
    let service: AdsDataService;
    let mockSheetRepo: MockSheetRepo;
    let mockMapperClean: MockMapper;
    let mockMapperAds: MockMapper;

    beforeAll(() => {
        (global as any).SpreadsheetApp = {
            getActiveSpreadsheet: jest.fn().mockReturnValue({
                getSheetByName: jest.fn().mockReturnValue({}),
            }),
        };
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Initialize Mocks Freshly for each test
        mockMapperClean = {
            toArray: jest.fn(),
            fromArray: jest.fn(),
            toObject: jest.fn(),
        };

        mockMapperAds = {
            toArray: jest.fn(),
            fromArray: jest.fn(),
            toObject: jest.fn(),
        };

        mockSheetRepo = {
            getData: jest.fn(),
            setData: jest.fn(),
            getHeaders: jest.fn(),
            getMapper: jest.fn(),
            clearContent: jest.fn(),
            getColumnValues: jest.fn(),
            appendData: jest.fn(),
            setColumnValues: jest.fn(),
            clearColumnBackgrounds: jest.fn(),
            protectHeaderRow: jest.fn(),
            getBackgrounds: jest.fn(),
            setBackgrounds: jest.fn(),
            setCellValue: jest.fn(),
            clearColumnValues: jest.fn(),
        };

        // Setup Default Mock Returns
        mockSheetRepo.getMapper.mockImplementation((sheetName) => {
            if (sheetName === "Clean Data") return mockMapperClean;
            return mockMapperAds;
        });
        mockSheetRepo.getColumnValues.mockReturnValue([]);
        mockSheetRepo.getData.mockReturnValue([]); // Default empty

        mockMapperClean.toObject.mockReturnValue({});
        mockMapperAds.toArray.mockReturnValue([]);

        service = new AdsDataService(mockSheetRepo);
    });

    test("prepareAdsData successfully transforms keywords with abbreviations", () => {
        // 1. Mock Data Return
        mockSheetRepo.getData.mockImplementation((sheetName) => {
            if (sheetName === "Clean Data") return [["buy iphone 15 pro"]];
            if (sheetName === "Settings") return [
                ["Campaign Name", "Test Camp"],
                ["Target URL", "https://example.com"]
            ];
            return [];
        });

        mockSheetRepo.getColumnValues.mockReturnValue(["iPhone", "PRO"]); // Abbreviations

        // 2. Mock Mapper behavior
        mockMapperClean.toObject.mockReturnValue({ "Keyword": "buy iphone 15 pro" });
        mockMapperAds.toArray.mockImplementation((obj) => Object.values(obj));

        // 3. Execute
        service.prepareAdsData();

        // 4. Assertions
        expect(mockSheetRepo.getData).toHaveBeenCalledWith("Clean Data");

        const expectedObj = {
            "Campaign": "Test Camp",
            "Ad Group": "Buy IPHONE 15 PRO",
            "Keyword": "buy iphone 15 pro",
            "Keyword for Headline 1": "buy iphone 15 pro",
            "Headline 1": "Buy IPHONE 15 PRO",
            "Final URL": "https://example.com?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}&device={device}"
        };

        expect(mockMapperAds.toArray).toHaveBeenCalledWith(expect.objectContaining(expectedObj));
    });

    test("prepareAdsData handles prepositions correctly", () => {
        mockSheetRepo.getData.mockImplementation((sheetName) => {
            if (sheetName === "Clean Data") return [["tours in moscow"]];
            if (sheetName === "Settings") return [];
            return [];
        });

        mockMapperClean.toObject.mockReturnValue({ "Keyword": "tours in moscow" });

        service.prepareAdsData();

        expect(mockMapperAds.toArray).toHaveBeenCalledWith(expect.objectContaining({
            "Headline 1": "Tours in Moscow",
            "Headline 2": "",
            "Description 1": ""
        }));
    });

    test("prepareAdsData skips empty rows", () => {
        mockSheetRepo.getData.mockImplementation((sheetName) => {
            if (sheetName === "Clean Data") return [[""], ["valid"]];
            return [];
        });

        mockMapperClean.toObject.mockImplementation((row) => {
            if (row[0] === "valid") return { "Keyword": "valid" };
            return {}; // Missing keyword
        });

        service.prepareAdsData();

        expect(mockMapperAds.toArray).toHaveBeenCalledTimes(1);
    });

    test("prepareAdsData throws if Clean Data is empty", () => {
        mockSheetRepo.getData.mockReturnValue([]); // Empty

        expect(() => service.prepareAdsData()).toThrow("No data in Clean Data sheet");
    });

    test("formatAdsData updates headlines and descriptions correctly using column updates", () => {
        // 1. Mock Data
        // Col indices:
        // 0: Campaign, 1: Ad Group, 2: Keyword, 3: Keyword for Headline 1, 4: Len, 5: Headline 1, 6: Len 1, 7: Description 1
        mockSheetRepo.getData.mockReturnValue([
            ["Campaign 1", "Ad Group 1", "keyword 1", "source keyword 1", "", "old headline", "", "ugly description"]
        ]);
        mockSheetRepo.getHeaders.mockReturnValue([
            "Campaign", "Ad Group", "Keyword", "Keyword for Headline 1", "Len", "Headline 1", "Len 1", "Description 1"
        ]);

        // Mock Abbreviations
        mockSheetRepo.getColumnValues.mockReturnValue(["USA"]);

        // 2. Execute
        service.formatAdsData();

        // 3. Verify
        // Should NOT call setData (which overwrites everything)
        expect(mockSheetRepo.setData).not.toHaveBeenCalled();

        // Should call setColumnValues for "Headline 1" and "Description 1"
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledTimes(2);

        // Verify Headline 1 update - SHOULD COME FROM "source keyword 1"
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "Ads Data",
            "Headline 1",
            ["Source Keyword 1"]
        );
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "Ads Data",
            "Description 1",
            ["Ugly description"]
        );
    });

    test("formatAdsData respects abbreviations and ignored words", () => {
        mockSheetRepo.getData.mockReturnValue([
            ["key", "...", "...", "...", "...", "...", "visit usa in summer", "...", "..."]
        ]);
        mockSheetRepo.getHeaders.mockReturnValue([
            "Keyword", "A", "B", "C", "D", "E", "Headline 1", "F", "G"
        ]);
        mockSheetRepo.getColumnValues.mockReturnValue(["USA"]);

        service.formatAdsData();

        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "Ads Data",
            "Headline 1",
            ["Visit USA in Summer"] // 'in' should be lower
        );
    });

    test("toAdsHeadline cleans google ads violations", () => {
        // Direct method testing (private) or via public method
        // Using formatAdsData with mock data
        mockSheetRepo.getData.mockReturnValue([
            ["key", "...", "...", "...", "...", "...", "Buy Now!!!", "...", "Desc  Space"]
        ]);
        mockSheetRepo.getHeaders.mockReturnValue([
            "Keyword", "A", "B", "C", "D", "E", "Headline 1", "F", "Description 1"
        ]);
        mockSheetRepo.getColumnValues.mockReturnValue([]);

        service.formatAdsData();

        // Check calls. 
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledTimes(2);

        // Check Headline 1: "Buy Now!!!" -> "Buy Now" (No !)
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "Ads Data",
            "Headline 1",
            ["Buy Now"]
        );

        // Check Description 1: "Desc  Space" -> "Desc Space" (Spacing fix)
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "Ads Data",
            "Description 1",
            ["Desc Space"]
        );
    });

    test("toAdsHeadline fixes spacing and punctuation", () => {
        mockSheetRepo.getData.mockReturnValue([
            ["key", "...", "...", "...", "...", "...", "word,word  space", "...", "..."]
        ]);
        mockSheetRepo.getHeaders.mockReturnValue([
            "Keyword", "A", "B", "C", "D", "E", "Headline 1", "F", "G"
        ]);
        mockSheetRepo.getColumnValues.mockReturnValue([]);

        service.formatAdsData();

        // "word,word  space" -> "word, word space" -> "Word, Word Space"
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            "Ads Data",
            "Headline 1",
            ["Word, Word Space"]
        );
    });
});
