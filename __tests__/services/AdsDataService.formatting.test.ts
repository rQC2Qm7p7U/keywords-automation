
import { AdsDataService } from "../../src/services/AdsDataService";
import { SHEETS } from "../../src/Config";
import { ISheetRepository } from "../../src/repositories/SheetRepository";

// Mock Structure
jest.mock("../../src/Structure", () => ({
    applyAdsDataFormulas: jest.fn()
}));

describe("AdsDataService - Formatting Rules", () => {
    let mockRepo: jest.Mocked<ISheetRepository>;
    let service: AdsDataService;

    // Helper to expose private method for testing
    const testToAdsHeadline = (text: string, abbr: Set<string>, isHeadline: boolean) => {
        return (service as any).toAdsHeadline(text, abbr, isHeadline);
    };

    beforeAll(() => {
        (global as any).SpreadsheetApp = {
            getActiveSpreadsheet: jest.fn().mockReturnValue({
                getSheetByName: jest.fn().mockReturnValue({}),
            }),
        };
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
            getMapper: jest.fn(),
            getBackgrounds: jest.fn(),
            setBackgrounds: jest.fn(),
            clearColumnBackgrounds: jest.fn(),
            clearColumnValues: jest.fn()
        } as unknown as jest.Mocked<ISheetRepository>;

        service = new AdsDataService(mockRepo);
    });

    const abbrevs = new Set(["SEO", "USA", "PPC"]);

    test("Headline: Should be Title Case", () => {
        expect(testToAdsHeadline("cheap hotels in paris", abbrevs, true)).toBe("Cheap Hotels in Paris");
        expect(testToAdsHeadline("best seo services", abbrevs, true)).toBe("Best SEO Services");
        expect(testToAdsHeadline("buy iphone now", abbrevs, true)).toBe("Buy Iphone Now");
    });

    test("Headline: Should remove exclamation marks", () => {
        expect(testToAdsHeadline("Buy Now!", abbrevs, true)).toBe("Buy Now");
    });

    test("Description: Should not force Lowercase (Preserve case)", () => {
        expect(testToAdsHeadline("cheap hotels in paris", abbrevs, false)).toBe("Cheap hotels in paris");
        // "HOTELS" preserved because we only requested capitalizing start of sentences.
        expect(testToAdsHeadline("BEST CHEAP HOTELS", abbrevs, false)).toBe("BEST CHEAP HOTELS");
    });

    test("Description: Should capitalize start of new sentences", () => {
        expect(testToAdsHeadline("hotel in paris. great view. book now", abbrevs, false))
            .toBe("Hotel in paris. Great view. Book now");
        expect(testToAdsHeadline("first sentence? second sentence! third.", abbrevs, false))
            .toBe("First sentence? Second sentence! Third.");
    });

    test("Description: Should NOT force Abbreviations (User requested removal of other checks)", () => {
        // "seo" stays "seo" if not at start. "usa" stays "usa". 
        expect(testToAdsHeadline("best seo services in usa", abbrevs, false)).toBe("Best seo services in usa");
    });

    test("Description: Should allow exclamation marks", () => {
        expect(testToAdsHeadline("Buy Now!", abbrevs, false)).toBe("Buy Now!");
    });

    test("General: Should fix punctuation", () => {
        expect(testToAdsHeadline("hello,world", abbrevs, false)).toBe("Hello, world");
        expect(testToAdsHeadline("hello,, world", abbrevs, false)).toBe("Hello, world");
    });

    test("General: Should remove forbidden symbols", () => {
        expect(testToAdsHeadline("test@email <tag>", abbrevs, false)).toBe("Testemail tag");
    });
});
