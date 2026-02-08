import { SheetRepository } from "../repositories/SheetRepository";
import { SHEETS, COLUMNS } from "../Config";

export class AdsDataService {
    private sheetRepo: SheetRepository;

    constructor(sheetRepo: SheetRepository) {
        this.sheetRepo = sheetRepo;
    }

    /**
     * Main function to prepare Ads Data.
     * Reads Keywords -> Processes them -> Writes to Ads Data sheet.
     */
    /**
     * Main function to prepare Ads Data.
     * Reads Keywords -> Processes them -> Writes to Ads Data sheet.
     */
    prepareAdsData() {
        // Fetch Settings
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const getValue = (key: string, defaultVal: string) => {
            const row = settingsData.find(r => r[0] === key);
            return row ? String(row[1]) : defaultVal;
        };

        const campaignName = getValue("Campaign Name", "Keywords Automation");

        // Settings are mapped to "Max Headline Length" etc.
        // But the previous formulas used 30, 90, 15. The Logic in `generateAdsRow` doesn't strictly truncate yet, 
        // but if we want to add truncation logic we can use these values. 
        // For now, I'll pass them if needed, or just Campaign Name which is the most visible dynamic one.

        // Fetch Keywords from Clean Data
        const cleanData = this.sheetRepo.getData(SHEETS.CLEAN_DATA);
        if (!cleanData || cleanData.length === 0) {
            throw new Error("No data in Clean Data sheet");
        }

        // Fetch Abbreviations from "Intent Types"
        const intentData = this.sheetRepo.getData(SHEETS.INTENT_TYPES);
        const abbreviations = this.extractAbbreviations(intentData);

        // Process Data
        const processedRows = cleanData.map(row => {
            const keyword = String(row[0]); // Assumes Keyword is 1st column
            if (!keyword) return null;

            return this.generateAdsRow(keyword, abbreviations, campaignName);
        }).filter(r => r !== null);

        // Write to Ads Data Sheet
        this.sheetRepo.clearContent(SHEETS.ADS_DATA);
        if (processedRows.length > 0) {
            this.sheetRepo.setData(SHEETS.ADS_DATA, processedRows, 2, 1);
        }
    }

    /**
     * Extracts abbreviations from Intent Types sheet.
     * Assumes "Abbreviations" is a specific column.
     */
    private extractAbbreviations(data: any[][]): Set<string> {
        const abbrevs = new Set<string>();
        // Find column index for "Abbreviations" in COLUMNS.INTENT_TYPES
        // COLUMNS is an array of strings.
        const colIndex = COLUMNS.INTENT_TYPES.indexOf("Abbreviations");
        if (colIndex === -1) return abbrevs;

        for (const row of data) {
            if (row[colIndex]) {
                abbrevs.add(String(row[colIndex]).toUpperCase());
            }
        }
        return abbrevs;
    }

    /**
     * Generates a single row for Ads Data sheet.
     */
    private generateAdsRow(keyword: string, abbreviations: Set<string>, campaignName: string): any[] {
        // 1. Campaign Name
        const campaign = campaignName;

        // 2. Ad Group (Use Keyword as Ad Group for SKAGs? Or Generic?)
        // User didn't specify. Let's use the Keyword itself as Ad Group for now (common practice).
        const adGroup = this.toTitleCase(keyword, abbreviations);

        // 3. Keyword (The original keyword)
        const originalKeyword = keyword;

        // 4. Keyword for Headlines (Same as original initially)
        const keywordForHeadline = keyword;

        // 5. Headlines (CamelCase with Abbreviation logic)
        const h1 = this.toAdsHeadline(keyword, abbreviations);

        // Construct the full 49-column row based on COLUMNS.ADS_DATA order
        // "Campaign", "Ad Group", "Keyword", 
        // "Keyword for Headline 1", "Len",
        // "Headline 1", "Len 1", ...

        const row = new Array(COLUMNS.ADS_DATA.length).fill("");

        // Mapping (Indices based on Config.ts)
        row[0] = campaign;      // Campaign
        row[1] = adGroup;       // Ad Group
        row[2] = originalKeyword; // Keyword
        row[3] = keywordForHeadline; // Keyword for HL1
        // Len cols are formulas, leave empty.

        row[5] = h1; // Headline 1

        row[48] = campaign; // Last column Campaign

        return row;
    }

    /**
     * Converts text to Title Case / Ads Case.
      * First letter capitalized.
     * Prepositions < 2 chars kept lowercase(unless first word).
     * Abbreviations kept as is (if found in abbrev set).
     */
    private toAdsHeadline(text: string, abbreviations: Set<string>): string {
        const words = text.split(/\s+/);

        return words.map((word, index) => {
            const upperWord = word.toUpperCase();

            // 1. Check Abbreviation
            if (abbreviations.has(upperWord)) {
                return upperWord;
            }

            // 2. Keep Existing ALL CAPS (if > 1 char to avoid keeping single 'A' as 'A' if it should be 'a'?)
            if (word === upperWord && word.length > 1) {
                return upperWord;
            }

            // 3. Check Preposition (length < 2, e.g. "v", "u", "po"?)
            if (word.length < 2 && index !== 0) {
                return word.toLowerCase();
            }

            // 4. Standard Title Case (First Upper, rest lower)
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(" ");
    }

    private toTitleCase(str: string, abbreviations: Set<string>) {
        return this.toAdsHeadline(str, abbreviations);
    }
}
