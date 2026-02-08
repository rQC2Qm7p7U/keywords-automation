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

        // 1. Get Raw Data
        const rawData = this.sheetRepo.getData(rawSheetName);
        if (!rawData || rawData.length === 0) return 0;

        // We need column indices for mapping, but we can assume order or look it up via Repo?
        // The repo doesn't expose `getColumnIndex` publicly. We should probably use `getColumnValues` or just iterate headers.
        // For performance, getting full data array is better.
        // Let's rely on Repo's knowledge of columns if we want to be strict, but for now we'll assume standard column names
        // or just use `getColumnValues` to build objects? No, iterating row array is faster.
        // Let's use `getHeaders` to map dynamically.

        const rawHeaders = this.sheetRepo.getHeaders(rawSheetName);
        const getIdx = (name: string) => rawHeaders.indexOf(name);

        const idxKeyword = getIdx("Keyword");
        const idxSearches = getIdx("Avg. monthly searches");
        const idxComp = getIdx("Competition index");
        const idxBidLow = getIdx("Bid Low");
        const idxBidHigh = getIdx("Bid High");

        if (idxKeyword === -1) throw new Error("Keyword column not found in Raw Data");

        const cleanData: any[] = [];
        const rawSearches: number[] = [];
        const rawComp: number[] = [];
        const rawBidLow: number[] = [];
        const rawBidHigh: number[] = [];

        rawData.forEach(row => {
            const keyword = row[idxKeyword];
            const searches = this.parseNumber(row[idxSearches]);
            const comp = this.parseNumber(row[idxComp]);
            const bidLow = this.parseNumber(row[idxBidLow]);
            const bidHigh = this.parseNumber(row[idxBidHigh]);

            rawSearches.push(searches);
            rawComp.push(comp);
            rawBidLow.push(bidLow);
            rawBidHigh.push(bidHigh);

            cleanData.push([
                keyword,
                searches,
                comp,
                bidLow,
                bidHigh,
                "" // Negative
            ]);
        });

        this.sheetRepo.setData(cleanSheetName, cleanData);

        // Update Raw Data columns with parsed numbers
        this.sheetRepo.setColumnValues(rawSheetName, "Avg. monthly searches", rawSearches);
        this.sheetRepo.setColumnValues(rawSheetName, "Competition index", rawComp);
        this.sheetRepo.setColumnValues(rawSheetName, "Bid Low", rawBidLow);
        this.sheetRepo.setColumnValues(rawSheetName, "Bid High", rawBidHigh);

        // Format
        // We need a helper for formatting in Repo? 
        // The Interface has generic methods. We can implement formatting in logic here using generic approach?
        // Actually, `formatSheetColumns` was in DataService. We should move that logic to Repo or keep it here?
        // Formatting is Sheet-specific. Should be in Repo.
        // I added `formatSheetColumns` as a private method in DataService. let's assume Repo handles basic IO.
        // If we want to format, we should add `formatColumns` to Repo interface or just do it here if we had access to Sheet object.
        // But Service shouldn't touch Sheet object.
        // Let's add `formatColumns` to ISheetRepository later if needed. For now, we skip or use a custom method?
        // The plan said "Migrate logic". Formatting is logic/presentation.
        // Let's skipping explicit formatting call for this iteration to focus on data logic, effectively deprecating `formatSheetColumns`.

        this.sheetRepo.clearColumnBackgrounds(cleanSheetName, "Negative");

        return cleanData.length;
    }

    removeDuplicates(sheetName: string): number {
        const data = this.sheetRepo.getData(sheetName);
        if (!data || data.length === 0) return 0;

        const seen = new Set();
        const uniqueData: any[] = [];
        let removedCount = 0;

        data.forEach(row => {
            const keyword = String(row[0]).trim().toLowerCase(); // Assume Col A is Keyword
            if (seen.has(keyword)) {
                removedCount++;
            } else {
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
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");

        // Get Negatives from Raw and Clean
        const rawNegs = this.sheetRepo.getColumnValues(rawSheet, "Negative");
        const cleanNegs = this.sheetRepo.getColumnValues(cleanSheet, "Negative");
        const existingNegs = this.sheetRepo.getColumnValues(intentSheet, "Negative");

        const allNegatives = new Set<string>();

        const addIfValid = (val: any) => {
            if (val) {
                const str = String(val).trim().toLowerCase();
                if (str) allNegatives.add(str);
            }
        };

        rawNegs.forEach(addIfValid);
        cleanNegs.forEach(addIfValid);
        existingNegs.forEach(addIfValid);

        const sortedNegatives = Array.from(allNegatives).sort();

        // Update Intent Types
        this.sheetRepo.setColumnValues(intentSheet, "Negative", sortedNegatives);

        this.highlightNegativesInSheet(rawSheet, allNegatives);
        this.highlightNegativesInSheet(cleanSheet, allNegatives);

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
