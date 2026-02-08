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
    prepareAdsData() {
        // 1. Get Keywords from "Clean Data" (or Raw? User said "after Keywords appear in column Keyword")
        // Usually we take from Clean Data or the active sheet. 
        // Let's assume we take from "Clean Data" for now, or we can make it flexible.
        // The user requirement says "This table will work so: 1. After keywords appear in Keyword column..."
        // This implies the user might copy-paste them OR we pull them.
        // Let's implement a "Pull from Clean Data" feature for the button.

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

            return this.generateAdsRow(keyword, abbreviations);
        }).filter(r => r !== null);

        // Write to Ads Data Sheet
        // We append or overwrite? Usually overwrite or append.
        // Let's clear and overwrite to be safe/clean for "Prepare" action.
        this.sheetRepo.clearContent(SHEETS.ADS_DATA);
        // Re-write headers? clearContent usually accepts "startRow".
        // SheetRepository.clearContent might clear everything.
        // Let's check SheetRepository validation.

        // Actually, usually we want to append. But for a "Preparation" tool, a fresh start is often better.
        // Let's write from row 2.
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
    private generateAdsRow(keyword: string, abbreviations: Set<string>): any[] {
        // 1. Campaign Name (User said "Table Name" - assume Project Name or Sheet Name)
        const campaign = "Keywords Automation"; // Or pass as arg

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
        // Len cols are formulas, leave empty or 0? 
        // If we write values, formulas might be overwritten if not carefully handled.
        // Wait, Structure.ts puts formulas in Row 2 with ARRAYFORMULA.
        // If we write data into Row 2+, will it break ArrayFormula?
        // Google Sheets ArrayFormula usually expands *down*. 
        // BUT we must NOT write into the "Len" columns. We should write "" (empty string) into them.

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
                return upperWord; // Keep as ABBREV
            }

            // 2. Check Preposition (length < 2, e.g. "v", "u", "po"?)
            // User said "prepositions < 2 chars". So length 1?
            // "состоящих менее чем из двух символов" => Length < 2. So Length == 1.
            if (word.length < 2 && index !== 0) {
                return word.toLowerCase();
            }

            // 3. Standard Title Case (First Upper, rest lower)
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(" ");
    }

    private toTitleCase(str: string, abbreviations: Set<string>) {
        return this.toAdsHeadline(str, abbreviations);
    }
}
