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
        const intentSheetName = this.configRepo.getSheetName("INTENT_TYPES");

        // Initialize Mappers
        const rawMapper = this.sheetRepo.getMapper(rawSheetName);
        const cleanMapper = this.sheetRepo.getMapper(cleanSheetName);

        // 1. Get Raw Data
        const rawData = this.sheetRepo.getData(rawSheetName);
        if (!rawData || rawData.length === 0) return 0;

        // 2. Optimization: Pre-fetch Existing Data for Deduplication
        const existingCleanKeywords = new Set<string>(
            this.sheetRepo.getColumnValues(cleanSheetName, "Keyword")
                .map(k => String(k || "").trim().toLowerCase())
                .filter(k => k)
        );

        // 3. Optimization: Pre-compile Negative Matchers
        const negValues = this.sheetRepo.getColumnValues(intentSheetName, "Negative");
        const negativeWords = negValues.map(v => String(v).trim().toLowerCase()).filter(v => v);

        const boundary = "(^|[^a-zA-Z0-9а-яА-ЯёЁ])";
        const boundaryEnd = "([^a-zA-Z0-9а-яА-ЯёЁ]|$)";

        const matchers = negativeWords.map(word => ({
            text: word,
            regex: new RegExp(boundary + this.escapeRegExp(word) + boundaryEnd, "i")
        }));

        const cleanData: any[] = [];
        const rawSearches: number[] = [];
        const rawComp: number[] = [];
        const rawBidLow: number[] = [];
        const rawBidHigh: number[] = [];

        // Track duplicates within the current batch
        const currentBatchSeen = new Set<string>();

        rawData.forEach(row => {
            const rawObj = rawMapper.toObject(row);
            const keyword = String(rawObj["Keyword"] || "").trim();

            // Parse numbers
            let searches = this.parseNumber(rawObj["Avg. monthly searches"]);
            let comp = this.parseNumber(rawObj["Competition index"]);
            let bidLow = this.parseNumber(rawObj["Bid Low"]);
            let bidHigh = this.parseNumber(rawObj["Bid High"]);

            // Format numbers
            searches = Math.round(searches);
            comp = parseFloat(comp.toFixed(2));
            bidLow = parseFloat(bidLow.toFixed(2));
            bidHigh = parseFloat(bidHigh.toFixed(2));

            // Store for Raw Data update (in-place fix - we update ALL raw rows)
            rawSearches.push(searches);
            rawComp.push(comp);
            rawBidLow.push(bidLow);
            rawBidHigh.push(bidHigh);

            // --- FILTERING LOGIC ---

            // 1. Empty Keyword
            if (!keyword) return;

            const lowerKeyword = keyword.toLowerCase();

            // 2. Duplicate Check (Global & Local)
            if (existingCleanKeywords.has(lowerKeyword) || currentBatchSeen.has(lowerKeyword)) {
                return;
            }

            // 3. Low Search Volume
            if (searches <= 0) return;

            // 4. Negative Keyword Check
            let isNegative = false;
            // Only check if we have matchers
            if (matchers.length > 0) {
                // Optimization: Simple 'includes' check before regex
                for (const matcher of matchers) {
                    if (lowerKeyword.includes(matcher.text)) {
                        if (matcher.regex.test(keyword)) {
                            isNegative = true;
                            break;
                        }
                    }
                }
            }
            if (isNegative) return;

            // Mark as seen for this batch
            currentBatchSeen.add(lowerKeyword);

            // Construct Clean Data Object
            const cleanObj: Record<string, any> = {};
            cleanObj["Keyword"] = keyword;
            cleanObj["Negative"] = ""; // Initialize as empty
            cleanObj["Avg. monthly searches"] = searches;
            cleanObj["Competition index"] = comp;
            cleanObj["Bid Low"] = bidLow;
            cleanObj["Bid High"] = bidHigh;

            // Convert to Array using Clean Mapper
            cleanData.push(cleanMapper.toArray(cleanObj));
        });

        // 4. Append Valid Data
        if (cleanData.length > 0) {
            this.sheetRepo.appendData(cleanSheetName, cleanData);
        }

        // 5. Update Raw Data columns (formatting fix)
        this.sheetRepo.setColumnValues(rawSheetName, "Avg. monthly searches", rawSearches);
        this.sheetRepo.setColumnValues(rawSheetName, "Competition index", rawComp);
        this.sheetRepo.setColumnValues(rawSheetName, "Bid Low", rawBidLow);
        this.sheetRepo.setColumnValues(rawSheetName, "Bid High", rawBidHigh);

        // Note: We do NOT clear backgrounds in Clean Data because we are appending

        return cleanData.length;
    }

    removeDuplicates(sheetName: string): { removed: number; remaining: number } {
        const data = this.sheetRepo.getData(sheetName);
        if (!data || data.length === 0) return { removed: 0, remaining: 0 };

        const headers = this.sheetRepo.getHeaders(sheetName);
        const keywordIdx = headers.indexOf("Keyword");

        if (keywordIdx === -1) {
            throw new Error(`Column 'Keyword' not found in ${sheetName} for duplicate removal.`);
        }

        const seen = new Set();
        const uniqueData: any[] = [];
        let removedCount = 0;

        data.forEach(row => {
            const val = row[keywordIdx];
            const keyword = String(val === undefined || val === null ? "" : val).trim().toLowerCase();

            // Skip empty rows — they are not useful data
            if (!keyword) {
                removedCount++;
                return;
            }

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
        return { removed: removedCount, remaining: uniqueData.length };
    }

    /**
     * Aggregates unique negative keywords from all source sheets.
     * Returns stats with per-source breakdown.
     */
    collectNegativeKeywords(): { total: number; fromRaw: number; fromClean: number; fromClusters: number; existing: number } {
        const rawSheet = this.configRepo.getSheetName("RAW_DATA");
        const cleanSheet = this.configRepo.getSheetName("CLEAN_DATA");
        const clusterSheet = this.configRepo.getSheetName("CLUSTERS");
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");

        // Get Negatives from Raw, Clean, Clusters and Intent Types
        const rawNegs = this.sheetRepo.getColumnValues(rawSheet, "Negative");
        const cleanNegs = this.sheetRepo.getColumnValues(cleanSheet, "Negative");
        const clusterNegs = this.sheetRepo.getColumnValues(clusterSheet, "Negative");
        const existingNegs = this.sheetRepo.getColumnValues(intentSheet, "Negative");

        // Parse each source into its own Set for per-source counting
        const parseValues = (values: any[]): Set<string> => {
            const result = new Set<string>();
            values.forEach(val => {
                if (!val) return;
                const str = String(val).trim().toLowerCase();
                if (!str) return;
                str.split(/[;,]/).forEach(part => {
                    const cleanPart = part.trim();
                    if (cleanPart) result.add(cleanPart);
                });
            });
            return result;
        };

        const existingSet = parseValues(existingNegs);
        const rawSet = parseValues(rawNegs);
        const cleanSet = parseValues(cleanNegs);
        const clusterSet = parseValues(clusterNegs);

        // Merge all into one set
        const allNegatives = new Set<string>(existingSet);
        rawSet.forEach(w => allNegatives.add(w));
        cleanSet.forEach(w => allNegatives.add(w));
        clusterSet.forEach(w => allNegatives.add(w));

        // Count new negatives per source (words not in existingSet)
        let fromRaw = 0, fromClean = 0, fromClusters = 0;
        rawSet.forEach(w => { if (!existingSet.has(w)) fromRaw++; });
        cleanSet.forEach(w => { if (!existingSet.has(w) && !rawSet.has(w)) fromClean++; });
        clusterSet.forEach(w => { if (!existingSet.has(w) && !rawSet.has(w) && !cleanSet.has(w)) fromClusters++; });

        const sortedNegatives = Array.from(allNegatives).sort();

        // Update Intent Types
        this.sheetRepo.clearColumnValues(intentSheet, "Negative");
        this.sheetRepo.setColumnValues(intentSheet, "Negative", sortedNegatives);

        // Reset old highlights before applying new ones.
        // Without this, stale green/yellow backgrounds persist after removing a negative.
        this.sheetRepo.clearColumnBackgrounds(rawSheet, "Negative");
        this.sheetRepo.clearColumnBackgrounds(cleanSheet, "Negative");
        this.sheetRepo.clearColumnBackgrounds(clusterSheet, "Negative");
        this.clearIntentTypesConflictBackgrounds(intentSheet);

        this.highlightNegativesInSheet(rawSheet, allNegatives);
        this.highlightNegativesInSheet(cleanSheet, allNegatives);
        this.highlightNegativesInSheet(clusterSheet, allNegatives);

        this.highlightConflictsInIntentTypes(sortedNegatives);

        return {
            total: sortedNegatives.length,
            fromRaw,
            fromClean,
            fromClusters,
            existing: existingSet.size
        };
    }

    cleanKeysFromNegatives(): { cleanRemoved: number, clustersRemoved: number } {
        const cleanSheetName = this.configRepo.getSheetName("CLEAN_DATA");
        const clusterSheetName = this.configRepo.getSheetName("CLUSTERS");
        const intentSheetName = this.configRepo.getSheetName("INTENT_TYPES");

        // Prepare Matchers
        const negValues = this.sheetRepo.getColumnValues(intentSheetName, "Negative");
        const negativeWords = negValues.map(v => String(v).trim().toLowerCase()).filter(v => v);

        // Pre-compile regexes for performance
        const boundary = "(^|[^a-zA-Z0-9а-яА-ЯёЁ])";
        const boundaryEnd = "([^a-zA-Z0-9а-яА-ЯёЁ]|$)";

        const matchers = negativeWords.map(word => ({
            text: word,
            regex: new RegExp(boundary + this.escapeRegExp(word) + boundaryEnd, "i")
        }));

        // Clean "Clean Data" (Check searches: YES, Dedupe: YES via Set logic in Helper)
        const cleanRemoved = this.cleanSheetHelper(cleanSheetName, matchers, true, true);

        // Clean "Clusters" (Check searches: NO, Dedupe: NO - strictly removing negatives)
        const clustersRemoved = this.cleanSheetHelper(clusterSheetName, matchers, false, false);

        return { cleanRemoved, clustersRemoved };
    }

    /**
     * Helper to clean a sheet based on Negative Keywords.
     * @param sheetName Target Sheet Name
     * @param matchers Compiled regex matchers for negatives
     * @param checkSearches Whether to filter by "Avg. monthly searches" <= 0
     * @param checkDuplicates Whether to deduplicate within the sheet
     */
    private cleanSheetHelper(sheetName: string, matchers: { text: string, regex: RegExp }[], checkSearches: boolean, checkDuplicates: boolean): number {
        const data = this.sheetRepo.getData(sheetName);
        if (!data || data.length === 0) return 0;

        const headers = this.sheetRepo.getHeaders(sheetName);
        const keywordIdx = headers.indexOf("Keyword");
        if (keywordIdx === -1) return 0; // Or throw error

        const searchesIdx = headers.indexOf("Avg. monthly searches");

        const filteredData: any[] = [];
        let removedCount = 0;
        const seenKeywords = new Set<string>();

        data.forEach(row => {
            const keyword = String(row[keywordIdx] || "").trim();

            // 1. Remove empty keywords
            if (!keyword) {
                removedCount++;
                return;
            }

            const lowerKeyword = keyword.toLowerCase();

            // 2. Remove duplicate keywords (Optional)
            if (checkDuplicates) {
                if (seenKeywords.has(lowerKeyword)) {
                    removedCount++;
                    return;
                }
                seenKeywords.add(lowerKeyword);
            }

            // 3. Remove rows with 0 or empty Avg. searches (Optional)
            if (checkSearches && searchesIdx !== -1) {
                const searches = this.parseNumber(row[searchesIdx]);
                if (searches <= 0) {
                    removedCount++;
                    return;
                }
            }

            // 4. Remove negatives
            let isNegative = false;
            // Only checks regular expressions if matchers exist
            if (matchers.length > 0) {
                for (const matcher of matchers) {
                    if (lowerKeyword.includes(matcher.text)) {
                        if (matcher.regex.test(keyword)) {
                            isNegative = true;
                            break;
                        }
                    }
                }
            }

            if (isNegative) {
                removedCount++;
            } else {
                filteredData.push(row);
            }
        });

        if (removedCount > 0) {
            this.sheetRepo.setData(sheetName, filteredData);
            // Only clear backgrounds if "Negative" column exists (it usually does for these sheets)
            if (headers.includes("Negative")) {
                this.sheetRepo.clearColumnBackgrounds(sheetName, "Negative");
            }
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

            const parts = val.split(/[;,]/);
            let hasMatch = false;
            let allMatched = true;

            for (const part of parts) {
                const cleanPart = part.trim();
                if (!cleanPart) continue;

                if (negativeSet.has(cleanPart)) {
                    hasMatch = true;
                } else {
                    allMatched = false;
                }
            }

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

    /**
     * Resets backgrounds on all non-Negative columns of Intent Types.
     * This clears stale yellow conflict highlights before re-applying.
     */
    private clearIntentTypesConflictBackgrounds(intentSheet: string): void {
        const headers = this.sheetRepo.getHeaders(intentSheet);
        headers.forEach(header => {
            if (header === "Negative") return; // Negative column is cleared separately
            this.sheetRepo.clearColumnBackgrounds(intentSheet, header);
        });
    }

    private highlightConflictsInIntentTypes(negatives: string[]): void {
        const intentSheet = this.configRepo.getSheetName("INTENT_TYPES");
        const headers = this.sheetRepo.getHeaders(intentSheet);
        if (headers.length === 0) return;

        const negSet = new Set(negatives);
        const matchers = negatives.map(word => ({
            text: word,
            regex: new RegExp("\\b" + this.escapeRegExp(word) + "\\b", "i")
        }));

        headers.forEach(header => {
            if (header === "Negative") return;

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
