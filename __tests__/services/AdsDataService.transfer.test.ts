
import { AdsDataService } from "../../src/services/AdsDataService";
import { SHEETS } from "../../src/Config";
import { MockSheetRepository } from "../mocks/MockSheetRepository";

describe("AdsDataService - Transfer Clusters to Ads Data", () => {
    let mockRepo: MockSheetRepository;
    let service: AdsDataService;

    beforeEach(() => {
        mockRepo = new MockSheetRepository();
        service = new AdsDataService(mockRepo);

        // Setup Settings
        mockRepo.setData(SHEETS.SETTINGS, [
            ["Campaign Name", "Test Campaign"],
            ["Target URL", "https://example.com"]
        ]);

        // Setup Intent Types (Abbreviations)
        mockRepo.setData(SHEETS.INTENT_TYPES, [
            ["", "", "", "", "SEO"],
            ["", "", "", "", "USA"]
        ], ["Transactional", "Branded", "Commercial", "Local", "Abbreviations", "Negative"]);
    });

    test("should transfer clusters to ads data correctly", () => {
        // Setup Clusters Data
        mockRepo.setData(SHEETS.CLUSTERS, [
            ["buy iphone", "Group Alpha"],
            ["seo services", "Group Beta"]
        ], ["Keyword", "Group name"]);

        const result = service.transferClustersToAdsData();

        expect(result).toContain("Transferred 2 rows");

        const adsData = mockRepo.getData(SHEETS.ADS_DATA);
        expect(adsData.length).toBe(2);

        // Verify Row 1
        // Campaign | Ad Group | Keyword | Keyword for Headline 1 ... Headline 1
        expect(adsData[0][0]).toBe("Test Campaign");
        expect(adsData[0][1]).toBe("Group Alpha");
        expect(adsData[0][2]).toBe("buy iphone");
        expect(adsData[0][3]).toBe("buy iphone");
        expect(adsData[0][5]).toBe("Buy Iphone"); // Headline 1 (Formatted)

        // Verify Row 2 (Abbreviation Check)
        expect(adsData[1][1]).toBe("Group Beta");
        expect(adsData[1][2]).toBe("seo services");
        expect(adsData[1][5]).toBe("SEO Services"); // "seo" -> "SEO"
    });

    test("should use auto-generated group name if Group name is empty", () => {
        mockRepo.setData(SHEETS.CLUSTERS, [
            ["cheap laptop", ""] // Empty Group Name
        ], ["Keyword", "Group name"]);

        service.transferClustersToAdsData();
        const adsData = mockRepo.getData(SHEETS.ADS_DATA);

        expect(adsData[0][1]).toBe("Cheap Laptop"); // Fallback to Title Case Keyword
    });
});
