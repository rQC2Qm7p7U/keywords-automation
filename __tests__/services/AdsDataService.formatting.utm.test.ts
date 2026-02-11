import { AdsDataService } from "../../src/services/AdsDataService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { SHEETS } from "../../src/Config";

// Mock SheetRepository
const mockSheetRepo = {
    getData: jest.fn(),
    getMapper: jest.fn(),
    clearContent: jest.fn(),
    setData: jest.fn(),
    getColumnValues: jest.fn(),
    getHeaders: jest.fn(),
    setColumnValues: jest.fn()
};

describe("AdsDataService - formatAdsData UTM", () => {
    let service: AdsDataService;

    beforeEach(() => {
        service = new AdsDataService(mockSheetRepo as unknown as ISheetRepository);
        jest.clearAllMocks();
    });

    it("should update Final URL column when formatting ads data", () => {
        // Setup Mocks
        const headers = ["Campaign", "Ad Group", "Keyword", "Headline 1", "Final URL"];
        const data = [
            ["Camp1", "Grp1", "buy shoes", "Buy Shoes", ""] // Empty Final URL
        ];

        (mockSheetRepo.getData as jest.Mock).mockReturnValue(data);
        (mockSheetRepo.getHeaders as jest.Mock).mockReturnValue(headers);
        (mockSheetRepo.getColumnValues as jest.Mock).mockReturnValue([]); // No abbreviations

        // Mock Settings
        const settingsData = [
            ["Target URL", "https://site.com"],
            ["UTM Source", "google"],
            ["UTM Medium", "cpc"],
            ["UTM Term", "{keyword}"]
        ];
        (mockSheetRepo.getData as jest.Mock).mockImplementation((sheet) => {
            if (sheet === SHEETS.SETTINGS) return settingsData;
            if (sheet === SHEETS.ADS_DATA) return data;
            return [];
        });

        // Execute
        const result = service.formatAdsData();

        // Verify
        expect(mockSheetRepo.setColumnValues).toHaveBeenCalledWith(
            SHEETS.ADS_DATA,
            "Final URL",
            // Expect full URL with defaults as per mock settings (mock settings didn't override campaign/content/device, so they use defaults from code?)
            // Wait, in code `getValue` uses defaults if key not found.
            // In mock, I only provided Target, Source, Medium, Term.
            // Code defaults: campaign={campaignid}, content={creative}, device={device}.
            expect.arrayContaining(["https://site.com?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}&device={device}"])
        );
    });

    it("should not update Final URL if keyword is missing", () => {
        // Setup Mocks
        const headers = ["Campaign", "Ad Group", "Keyword", "Headline 1", "Final URL"];
        const data = [
            ["Camp1", "Grp1", "", "Header", ""]
        ];

        (mockSheetRepo.getData as jest.Mock).mockReturnValue(data);
        (mockSheetRepo.getHeaders as jest.Mock).mockReturnValue(headers);
        (mockSheetRepo.getColumnValues as jest.Mock).mockReturnValue([]);

        const settingsData = [["Target URL", "https://site.com"]];
        (mockSheetRepo.getData as jest.Mock).mockImplementation((sheet) => {
            if (sheet === SHEETS.SETTINGS) return settingsData;
            if (sheet === SHEETS.ADS_DATA) return data;
            return [];
        });

        service.formatAdsData();

        // Verify "Final URL" was set to empty strings or not changed?
        // Logic says: if !keyword, newColumnValues.push(""). 
        // If originally "", then no change.
        // setColumnValues is only called if changes exist.
        // Here, "Final URL" was "" and output is "". So no change.
        expect(mockSheetRepo.setColumnValues).not.toHaveBeenCalledWith(SHEETS.ADS_DATA, "Final URL", expect.any(Array));
    });
});
