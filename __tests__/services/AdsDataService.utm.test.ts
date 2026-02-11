
import { AdsDataService } from "../../src/services/AdsDataService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";

// Mock Structure since it's imported in AdsDataService
jest.mock("../../src/Structure", () => ({
    applyAdsDataFormulas: jest.fn()
}));

describe("AdsDataService - UTM Generation (No Transliteration)", () => {
    let mockRepo: jest.Mocked<ISheetRepository>;
    let service: AdsDataService;

    const testConstructFinalUrl = (baseUrl: string, settings: Record<string, string>, keyword: string) => {
        return (service as any).constructFinalUrl(baseUrl, settings);
    };

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

    test("Should pass {keyword} through without modification/transliteration", () => {
        const settings = {
            source: "google",
            medium: "cpc",
            campaign: "{campaignid}",
            content: "{creative}",
            term: "{keyword}", // The placeholder
            device: "{device}"
        };
        const keyword = "Купить слона"; // Only Cyrillic to test transliteration removal

        const url = testConstructFinalUrl("https://example.com", settings, keyword);

        // Expectation: utm_term={keyword} (literal), NOT transliterated
        expect(url).toContain("utm_term={keyword}");
        expect(url).not.toContain("kupit"); // Part of transliteration of "Купить"
    });

    test("Should handle static values correctly", () => {
        const settings = {
            source: "google",
            medium: "cpc",
            campaign: "my_campaign",
            content: "banner_1",
            term: "some_term",
            device: "m"
        };
        const keyword = "anything";

        const url = testConstructFinalUrl("https://example.com", settings, keyword);

        expect(url).toContain("utm_source=google");
        expect(url).toContain("utm_campaign=my_campaign");
        expect(url).toContain("utm_term=some_term");
    });

    test("Should respect settings with other placeholders", () => {
        const settings = {
            source: "google",
            medium: "cpc",
            campaign: "{campaignid}",
            content: "{creative}",
            term: "{keyword}",
            device: "{device}"
        };
        const keyword = "test";

        const url = testConstructFinalUrl("https://example.com", settings, keyword);

        expect(url).toContain("utm_campaign={campaignid}");
        expect(url).toContain("utm_content={creative}");
        expect(url).toContain("device={device}");
    });
});
