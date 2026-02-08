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
    prepareAdsData() {
        // Fetch Settings
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const getValue = (key: string, defaultVal: string) => {
            const row = settingsData.find(r => r[0] === key);
            return row ? String(row[1]) : defaultVal;
        };

        const campaignName = getValue("Campaign Name", "Keywords Automation");
        const targetUrl = getValue("Target URL", "");

        // Initialize Mappers
        const cleanMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.CLEAN_DATA);
        const adsMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.ADS_DATA);

        // Fetch Keywords from Clean Data
        const cleanData = this.sheetRepo.getData(SHEETS.CLEAN_DATA);
        if (!cleanData || cleanData.length === 0) {
            throw new Error("No data in Clean Data sheet");
        }

        // Fetch Abbreviations from "Intent Types"
        const abbrevValues = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        abbrevValues.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });

        // Process Data
        const processedRows = cleanData.map(row => {
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

        // 2. Ad Group (Use Keyword)
        const adGroup = this.toTitleCase(keyword, abbreviations);

        // 3. Keyword (The original keyword)
        const originalKeyword = keyword;

        // 4. Keyword for Headlines
        const keywordForHeadline = keyword;

        const rowObj: Record<string, any> = {};

        rowObj["Campaign"] = campaign;
        rowObj["Ad Group"] = adGroup;
        rowObj["Keyword"] = originalKeyword;
        rowObj["Keyword for Headline 1"] = keywordForHeadline;
        rowObj["Final URL"] = targetUrl;

        // 5. Headlines 1-15 (Ads Case)
        // Headline 1 is special? Currently it just uses the transformed keyword.
        rowObj["Headline 1"] = this.toAdsHeadline(keyword, abbreviations);

        const HEADLINE_COUNT = 15;
        for (let i = 2; i <= HEADLINE_COUNT; i++) {
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
     * Prepositions < 2 chars kept lowercase(unless first word), plus specific list.
     * Abbreviations kept as is (if found in abbrev set).
     */
    private toAdsHeadline(text: string, abbreviations: Set<string>): string {
        const words = text.split(/\s+/);
        // Common prepositions to keep lowercase (unless first word)
        const IGNORED_WORDS = new Set([
            "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or", "a", "an", "the"
        ]);

        return words.map((word, index) => {
            const upperWord = word.toUpperCase();
            const lowerWord = word.toLowerCase();

            // 1. Check Abbreviation
            if (abbreviations.has(upperWord)) {
                return upperWord;
            }

            // 2. Keep Existing ALL CAPS (if > 1 char) 
            if (word === upperWord && word.length > 1) {
                return upperWord;
            }

            // 3. Smart Lowercase for Prepositions
            // If it's NOT the first word AND it's in the ignored list OR length < 2 (legacy check)
            if (index !== 0 && (IGNORED_WORDS.has(lowerWord) || word.length < 2)) {
                return lowerWord;
            }

            // 4. Standard Title Case (First Upper, rest lower)
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(" ");
    }

    private toTitleCase(str: string, abbreviations: Set<string>) {
        return this.toAdsHeadline(str, abbreviations);
    }

    /**
     * Formats existing Ads Data sheet (Headlines/Descriptions) to Ads Case.
     * Useful for manual edits.
     * Optimization: Writes ONLY changed columns to preserve formulas in other columns.
     * Returns a summary message string.
     */
    formatAdsData(): string {
        const sheetName = SHEETS.ADS_DATA;
        const data = this.sheetRepo.getData(sheetName);
        if (!data || data.length === 0) {
            return "No data in Ads Data sheet.";
        }

        const headers = this.sheetRepo.getHeaders(sheetName);

        // 1. Identify columns to format
        const targetIndices: number[] = [];
        headers.forEach((h, i) => {
            if (h.startsWith("Headline ") || h.startsWith("Description ")) {
                targetIndices.push(i);
            }
        });

        if (targetIndices.length === 0) return "No Headline/Description columns found.";

        // 2. Load Abbreviations
        const abbrevValues = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        abbrevValues.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });

        // 3. Process Data & Collect Column Updates
        // Map of ColumnIndex -> Array of new values (only for changed columns)
        const columnUpdates = new Map<number, string[]>();
        let cellsUpdatedCount = 0;

        targetIndices.forEach(colIdx => {
            const newColumnValues: string[] = [];
            let columnChanged = false;

            data.forEach(row => {
                let val = "";
                if (colIdx < row.length) {
                    val = String(row[colIdx]);
                }

                if (!val) {
                    newColumnValues.push("");
                    return;
                }

                const formattedVal = this.toAdsHeadline(val, abbreviations);
                if (formattedVal !== val) {
                    columnChanged = true;
                    cellsUpdatedCount++;
                    newColumnValues.push(formattedVal);
                } else {
                    newColumnValues.push(val);
                }
            });

            if (columnChanged) {
                columnUpdates.set(colIdx, newColumnValues);
            }
        });

        // 4. Write back ONLY changed columns
        if (columnUpdates.size > 0) {
            columnUpdates.forEach((values, colIdx) => {
                const colName = headers[colIdx];
                this.sheetRepo.setColumnValues(sheetName, colName, values);
            });

            return `Formatted ${cellsUpdatedCount} cells in ${columnUpdates.size} columns.`;
        } else {
            return "No formatting changes needed.";
        }
    }
}
