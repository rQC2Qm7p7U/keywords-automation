import { ISheetRepository } from "../repositories/SheetRepository";
import { IConfigRepository } from "../repositories/ConfigRepository";

export class CleanupService {
    private sheetRepo: ISheetRepository;
    private configRepo: IConfigRepository;

    constructor(sheetRepo: ISheetRepository, configRepo: IConfigRepository) {
        this.sheetRepo = sheetRepo;
        this.configRepo = configRepo;
    }

    // Helper to parse numbers
    private parseNumber(value: any): number {
        if (value === null || value === undefined || value === "") return 0;
        if (typeof value === 'number') return value;

        let str = String(value).trim();

        // Handle "< 10" or similar
        if (str.startsWith("<")) {
            str = str.replace("<", "").trim();
        }

        str = str.replace(/\s+/g, '');

        if (str.includes(',') && str.includes('.')) {
            if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
                str = str.replace(/\./g, '').replace(',', '.');
            } else {
                str = str.replace(/,/g, '');
            }
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }

        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    // Helper to escape regex
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    transferRawToClean(): number {
        const rawSheetName = this.configRepo.getSheetName("RAW_DATA");
        const cleanSheetName = this.configRepo.getSheetName("CLEAN_DATA");

        // Initialize Mappers
        const rawMapper = this.sheetRepo.getMapper(rawSheetName);
        const cleanMapper = this.sheetRepo.getMapper(cleanSheetName);

        // 1. Get Raw Data
        const rawData = this.sheetRepo.getData(rawSheetName);
        if (!rawData || rawData.length === 0) return 0;

        const cleanData: any[] = [];
        const rawSearches: number[] = [];
        const rawComp: number[] = [];
        const rawBidLow: number[] = [];
        const rawBidHigh: number[] = [];

        rawData.forEach(row => {
            // Use index-based access for Raw Data to be robust against Header changes (e.g. user pasted GKP data with headers)
            // Config order: Keyword(0), Currency(1), Searches(2), ..., Comp Index(6), Bid Low(7), Bid High(8)
            const keyword = row[0];

            // Parse numbers using indices
            const searches = this.parseNumber(row[2]);
            const comp = this.parseNumber(row[6]);
            const bidLow = this.parseNumber(row[7]);
            const bidHigh = this.parseNumber(row[8]);

            rawSearches.push(searches);
            rawComp.push(comp);
            rawBidLow.push(bidLow);
            rawBidHigh.push(bidHigh);

            // Construct Clean Data Object
            const cleanObj: Record<string, any> = {};
            cleanObj["Keyword"] = keyword;
            cleanObj["Negative"] = ""; // Initialize as empty
            cleanObj["Avg. monthly searches"] = searches;
            cleanObj["Competition index"] = comp;
            cleanObj["Bid Low"] = bidLow;
            cleanObj["Bid High"] = bidHigh;

            // Convert to Array using Clean Mapper (handles order)
            cleanData.push(cleanMapper.toArray(cleanObj));
        });

        this.sheetRepo.setData(cleanSheetName, cleanData);

        // Update Raw Data columns with parsed numbers
        // Note: setColumnValues uses getColumnIndex which is now dynamic
        this.sheetRepo.setColumnValues(rawSheetName, "Avg. monthly searches", rawSearches);
        this.sheetRepo.setColumnValues(rawSheetName, "Competition index", rawComp);
        this.sheetRepo.setColumnValues(rawSheetName, "Bid Low", rawBidLow);
        this.sheetRepo.setColumnValues(rawSheetName, "Bid High", rawBidHigh);

        this.sheetRepo.clearColumnBackgrounds(cleanSheetName, "Negative");

        return cleanData.length;
    }

    removeDuplicates(sheetName: string): number {
        const data = this.sheetRepo.getData(sheetName);
        if (!data || data.length === 0) return 0;

        const headers = this.sheetRepo.getHeaders(sheetName);
        const keywordIdx = headers.indexOf("Keyword");

        if (keywordIdx === -1) {
            // Fallback or Error? If we want to be strict:
            throw new Error(`Column 'Keyword' not found in ${sheetName} for duplicate removal.`);
        }

        const seen = new Set();
        const uniqueData: any[] = [];
        let removedCount = 0;

        data.forEach(row => {
            // Use dynamic index
            const val = row[keywordIdx];
            const keyword = String(val === undefined || val === null ? "" : val).trim().toLowerCase();

            if (keyword && seen.has(keyword)) {
                removedCount++;
            } else {
                if (keyword) seen.add(keyword); // Only add if not empty? Or treat empty as same? 
                // Original logic added empty keys too? 
                // "String(row[0]).trim().toLowerCase()" -> if empty string, it's "".
                // If we have multiple empty rows, they are duplicates.
                // Let's keep original behavior:
                seen.add(keyword);
                uniqueData.push(row);
            }
        });

        if (removedCount > 0) {
            this.sheetRepo.setData(sheetName, uniqueData);
        }
        return removedCount;
    }

    collectNegativeKeywords(): number {
        const rawSheet = this.configRepo.getSheetName("RAW_DATA");
        const cleanSheet = this.configRepo.getSheetName("CLEAN_DATA");
        const clustersSheet = this.configRepo.getSheetName("CLUSTERS");
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");

        // Get Negatives from Raw, Clean, and Clusters
        const rawNegs = this.sheetRepo.getColumnValues(rawSheet, "Negative");
        const cleanNegs = this.sheetRepo.getColumnValues(cleanSheet, "Negative");
        const clustersNegs = this.sheetRepo.getColumnValues(clustersSheet, "Negative");
        const existingNegs = this.sheetRepo.getColumnValues(intentSheet, "Negative");

        const allNegatives = new Set<string>();

        const addIfValid = (val: any) => {
            if (val) {
                const str = String(val).trim().toLowerCase();
                if (str) {
                    // Split by comma or semicolon
                    const parts = str.split(/[;,]/);
                    parts.forEach(part => {
                        const cleanPart = part.trim();
                        if (cleanPart) allNegatives.add(cleanPart);
                    });
                }
            }
        };

        rawNegs.forEach(addIfValid);
        cleanNegs.forEach(addIfValid);
        clustersNegs.forEach(addIfValid);
        existingNegs.forEach(addIfValid);

        const sortedNegatives = Array.from(allNegatives).sort();

        // Update Intent Types
        this.sheetRepo.setColumnValues(intentSheet, "Negative", sortedNegatives);

        this.highlightNegativesInSheet(rawSheet, allNegatives);
        this.highlightNegativesInSheet(cleanSheet, allNegatives);
        this.highlightNegativesInSheet(clustersSheet, allNegatives);

        return sortedNegatives.length;
    }

    cleanKeysFromNegatives(): number {
        const cleanSheet = this.configRepo.getSheetName("CLEAN_DATA");
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");

        const negValues = this.sheetRepo.getColumnValues(intentSheet, "Negative");
        const negativeWords = negValues.map(v => String(v).trim().toLowerCase()).filter(v => v);

        if (negativeWords.length === 0) return 0;

        const cleanData = this.sheetRepo.getData(cleanSheet);
        if (!cleanData) return 0;

        const headers = this.sheetRepo.getHeaders(cleanSheet);
        const keywordIdx = headers.indexOf("Keyword");
        if (keywordIdx === -1) throw new Error("Keyword column not found");

        const filteredData: any[] = [];
        let removedCount = 0;

        const matchers = negativeWords.map(word => ({
            text: word,
            regex: new RegExp("\\b" + this.escapeRegExp(word) + "\\b", "i")
        }));

        cleanData.forEach(row => {
            const keyword = String(row[keywordIdx]).trim();
            const lowerKeyword = keyword.toLowerCase();
            let isNegative = false;

            for (const matcher of matchers) {
                if (lowerKeyword.includes(matcher.text)) {
                    if (matcher.regex.test(keyword)) {
                        isNegative = true;
                        break;
                    }
                }
            }

            if (isNegative) removedCount++;
            else filteredData.push(row);
        });

        if (removedCount > 0) {
            this.sheetRepo.setData(cleanSheet, filteredData);
            this.sheetRepo.clearColumnBackgrounds(cleanSheet, "Negative");
        }

        return removedCount;
    }

    private highlightNegativesInSheet(sheetName: string, negativeSet: Set<string>): void {
        const values = this.sheetRepo.getColumnValues(sheetName, "Negative");
        if (!values || values.length === 0) return;

        const backgrounds = this.sheetRepo.getBackgrounds(sheetName, "Negative");
        if (!backgrounds || backgrounds.length !== values.length) return;

        let changed = false;

        for (let i = 0; i < values.length; i++) {
            const val = String(values[i]).trim().toLowerCase();

            if (val && negativeSet.has(val)) {
                if (backgrounds[i][0] !== "#00ff00") {
                    backgrounds[i][0] = "#00ff00"; // Green
                    changed = true;
                }
            }
        }

        if (changed) {
            this.sheetRepo.setBackgrounds(sheetName, "Negative", backgrounds);
        }
    }
}
