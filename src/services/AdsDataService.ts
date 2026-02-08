import { ISheetRepository } from "../repositories/SheetRepository";
import { SHEETS, COLUMNS } from "../Config";
import { SheetDataMapper } from "../utils/SheetDataMapper";

export class AdsDataService {
    private sheetRepo: ISheetRepository;

    constructor(sheetRepo: ISheetRepository) {
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
        const targetUrl = getValue("Target URL", "");

        // Settings are mapped to "Max Headline Length" etc.
        // But the previous formulas used 30, 90, 15. The Logic in `generateAdsRow` doesn't strictly truncate yet, 
        // but if we want to add truncation logic we can use these values. 
        // For now, I'll pass them if needed, or just Campaign Name which is the most visible dynamic one.

        // Initialize Mappers
        const cleanMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.CLEAN_DATA);
        const adsMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.ADS_DATA);

        // Fetch Keywords from Clean Data
        const cleanData = this.sheetRepo.getData(SHEETS.CLEAN_DATA);
        if (!cleanData || cleanData.length === 0) {
            throw new Error("No data in Clean Data sheet");
        }

        // Fetch Abbreviations from "Intent Types"
        // Use getColumnValues to dynamically find the "Abbreviations" column
        const abbrevValues = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        abbrevValues.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });

        // Process Data
        const processedRows = cleanData.map(row => {
            // Use Mapper to get Keyword safely
            const rowObj = cleanMapper.toObject(row);
            const keyword = String(rowObj["Keyword"] || "");

            if (!keyword) return null;

            const adsObj = this.generateAdsRow(keyword, abbreviations, campaignName, targetUrl);
            return adsMapper.toArray(adsObj);
        }).filter(r => r !== null);

        // Write to Ads Data Sheet
        this.sheetRepo.clearContent(SHEETS.ADS_DATA);
        if (processedRows.length > 0) {
            this.sheetRepo.setData(SHEETS.ADS_DATA, processedRows);
        }
    }

    /**
     * Generates a single row object for Ads Data sheet.
     */
    private generateAdsRow(keyword: string, abbreviations: Set<string>, campaignName: string, targetUrl: string): Record<string, any> {
        // 1. Campaign Name
        const campaign = campaignName;

        // 2. Ad Group (Use Keyword as Ad Group for SKAGs? Or Generic?)
        const adGroup = this.toTitleCase(keyword, abbreviations);

        // 3. Keyword (The original keyword)
        const originalKeyword = keyword;

        // 4. Keyword for Headlines (Same as original initially)
        const keywordForHeadline = keyword;

        const rowObj: Record<string, any> = {};

        rowObj["Campaign"] = campaign;
        rowObj["Ad Group"] = adGroup;
        rowObj["Keyword"] = originalKeyword;
        rowObj["Keyword for Headline 1"] = keywordForHeadline;
        rowObj["Final URL"] = targetUrl;

        // 5. Headlines 1-15 (Ads Case)
        // Headline 1 is special? Currently it just uses the transformed keyword.
        // If we want H1 to be the keyword transformed:
        rowObj["Headline 1"] = this.toAdsHeadline(keyword, abbreviations);

        // For others, if we had source data we would transform it. 
        // Currently we don't have distinct sources for H2-H15 in Clean Data. 
        // The user request implies "This MUST be in strict columns... Implement this".
        // Use loop to ensure keys exist and are formatted IF data existed. 
        // Since we only have 'keyword', we can't populate H2-H15 with unique data yet. 
        // BUT, IF we had a logic to fill them (e.g. from synonyms), we would use it.
        // For now, I will explicitly set them to empty string OR transform if I had a source.
        // The prompt says: "This should be in columns Headline 1-15... Implement this in code".
        // It likely means: "Ensure the transformation logic Is Applied to these columns".
        // Since I only have `keyword`, I will just loop to creating the keys, maybe empty?
        // Wait, "Reference logic" implies we want the *capability*. 
        // Actually, if I look at `toAdsHeadline` it returns a string.
        // I will just implement the LOOP structure so it's ready. 
        // And I will ensure `rowObj` has these keys. 
        const HEADLINE_COUNT = 15;
        for (let i = 2; i <= HEADLINE_COUNT; i++) {
            // Currently empty, but ready for logic. 
            // If user wants them filled, they need to say with what.
            rowObj[`Headline ${i}`] = "";
        }

        // 6. Descriptions 1-4
        const DESCRIPTION_COUNT = 4;
        for (let i = 1; i <= DESCRIPTION_COUNT; i++) {
            rowObj[`Description ${i}`] = "";
        }

        return rowObj;
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
