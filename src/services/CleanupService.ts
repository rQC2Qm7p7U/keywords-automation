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
            const rawObj = rawMapper.toObject(row);
            const keyword = rawObj["Keyword"];

            // Skip if no keyword? 
            // if (!keyword) return; 

            // Parse numbers (using Column Names to access values)
            const searches = this.parseNumber(rawObj["Avg. monthly searches"]);
            const comp = this.parseNumber(rawObj["Competition index"]);
            const bidLow = this.parseNumber(rawObj["Bid Low"]);
            const bidHigh = this.parseNumber(rawObj["Bid High"]);

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
        const clusterSheet = this.configRepo.getSheetName("CLUSTERS");
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");

        // Get Negatives from Raw, Clean, Clusters and Intent Types
        const rawNegs = this.sheetRepo.getColumnValues(rawSheet, "Negative");
        const cleanNegs = this.sheetRepo.getColumnValues(cleanSheet, "Negative");
        const clusterNegs = this.sheetRepo.getColumnValues(clusterSheet, "Negative");
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
        clusterNegs.forEach(addIfValid);
        existingNegs.forEach(addIfValid);

        const sortedNegatives = Array.from(allNegatives).sort();

        // Update Intent Types
        this.sheetRepo.clearColumnValues(intentSheet, "Negative");
        this.sheetRepo.setColumnValues(intentSheet, "Negative", sortedNegatives);

        this.highlightNegativesInSheet(rawSheet, allNegatives);
        this.highlightNegativesInSheet(cleanSheet, allNegatives);
        this.highlightNegativesInSheet(clusterSheet, allNegatives);

        this.highlightConflictsInIntentTypes(sortedNegatives);

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

        const boundary = "(^|[^a-zA-Z0-9а-яА-ЯёЁ])";
        const boundaryEnd = "([^a-zA-Z0-9а-яА-ЯёЁ]|$)";

        const matchers = negativeWords.map(word => ({
            text: word,
            regex: new RegExp(boundary + this.escapeRegExp(word) + boundaryEnd, "i")
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

            if (!val) continue;

            // Split by comma or semicolon to check individual words
            const parts = val.split(/[;,]/);
            let hasMatch = false;
            let allMatched = true;

            for (const part of parts) {
                const cleanPart = part.trim();
                // If part is empty (e.g. trailing comma), skip it
                if (!cleanPart) continue;

                if (negativeSet.has(cleanPart)) {
                    hasMatch = true;
                } else {
                    allMatched = false;
                }
            }

            // Highlight if at least one part matched (it was collected)
            // Or should we require ALL? 
            // If "a, b" and "a" is collected, "b" is collected. 
            // Since negativeSet is the UNION of all these, 
            // if "b" is a valid word, it SHOULD be in negativeSet.
            // So if hasMatch is true, effectively all valid parts are in negativeSet.

            if (hasMatch && allMatched) {
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

    private highlightConflictsInIntentTypes(negatives: string[]): void {
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");
        const headers = this.sheetRepo.getHeaders(intentSheet);
        if (headers.length === 0) return;

        const negSet = new Set(negatives);
        // Pre-compile regexes for performance
        const matchers = negatives.map(word => ({
            text: word,
            regex: new RegExp("\\b" + this.escapeRegExp(word) + "\\b", "i")
        }));

        headers.forEach(header => {
            if (header === "Negative") return; // Skip Negative column itself

            const values = this.sheetRepo.getColumnValues(intentSheet, header);
            if (values.length === 0) return;

            const backgrounds = this.sheetRepo.getBackgrounds(intentSheet, header);
            let changed = false;

            for (let i = 0; i < values.length; i++) {
                const val = String(values[i]);
                if (!val) continue;

                const lowerVal = val.toLowerCase();
                let hasConflict = false;

                for (const matcher of matchers) {
                    if (lowerVal.includes(matcher.text)) {
                        if (matcher.regex.test(val)) {
                            hasConflict = true;
                            break;
                        }
                    }
                }

                if (hasConflict) {
                    if (backgrounds[i][0] !== "#ffff00") {
                        backgrounds[i][0] = "#ffff00"; // Yellow
                        changed = true;
                    }
                }
            }

            if (changed) {
                this.sheetRepo.setBackgrounds(intentSheet, header, backgrounds);
            }
        });
    }
}
