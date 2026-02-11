import { ISheetRepository } from "../repositories/SheetRepository";
import { SHEETS, COLUMNS } from "../Config";
import { SheetDataMapper } from "../utils/SheetDataMapper";
import { applyAdsDataFormulas } from "../Structure";

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
     * Transfers data from Clusters sheet to Ads Data sheet.
     * Mapping:
     * - Group name -> Ad Group
     * - Keyword -> Keyword
     * - Keyword -> Keyword for Headline 1 (and Headline 1 via transformation)
     */
    transferClustersToAdsData() {
        // Fetch Settings
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const getValue = (key: string, defaultVal: string) => {
            const row = settingsData.find(r => r[0] === key);
            return row ? String(row[1]) : defaultVal;
        };

        const campaignName = getValue("Campaign Name", "Keywords Automation");
        const targetUrl = getValue("Target URL", "");

        // Fetch UTM Settings
        const utmSettings = {
            source: getValue("UTM Source", "google"),
            medium: getValue("UTM Medium", "cpc"),
            campaign: getValue("UTM Campaign", "{campaignid}"),
            content: getValue("UTM Content", "{creative}"),
            term: getValue("UTM Term", "{keyword}"),
            device: getValue("Device", "{device}")
        };

        // Initialize Mappers
        const clustersMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.CLUSTERS);
        const adsMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.ADS_DATA);

        // Fetch Data from Clusters
        const clustersData = this.sheetRepo.getData(SHEETS.CLUSTERS);
        if (!clustersData || clustersData.length === 0) {
            throw new Error("No data in Clusters sheet");
        }

        // Fetch Abbreviations
        const abbrevValues = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        abbrevValues.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });

        // Process Data
        const processedRows = clustersData.map(row => {
            const rowObj = clustersMapper.toObject(row);
            const keyword = String(rowObj["Keyword"] || "");
            const groupName = String(rowObj["Group name"] || "");

            if (!keyword) return null;

            // Use Group Name from Clusters as Ad Group, or fallback to auto-generated if empty (unlikely)
            const adGroup = groupName || this.toTitleCase(keyword, abbreviations);

            const adsObj = this.generateAdsRow(keyword, abbreviations, campaignName, targetUrl, adGroup, utmSettings);
            return adsMapper.toArray(adsObj);
        }).filter(r => r !== null);

        // Write to Ads Data Sheet
        this.sheetRepo.clearContent(SHEETS.ADS_DATA);
        if (processedRows.length > 0) {
            this.sheetRepo.setData(SHEETS.ADS_DATA, processedRows);
        }

        // Re-apply Formulas and Validations
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const adsSheet = ss.getSheetByName(SHEETS.ADS_DATA);
        if (adsSheet) {
            applyAdsDataFormulas(adsSheet!);
        }

        return `Transferred ${processedRows.length} rows from Clusters to Ads Data.`;
    }

    /**
     * Main function to prepare Ads Data (Legacy: from Clean Data).
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

        const cleanMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.CLEAN_DATA);
        const adsMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.ADS_DATA);

        // Fetch UTM Settings
        const utmSettings = {
            source: getValue("UTM Source", "google"),
            medium: getValue("UTM Medium", "cpc"),
            campaign: getValue("UTM Campaign", "{campaignid}"),
            content: getValue("UTM Content", "{creative}"),
            term: getValue("UTM Term", "{keyword}"),
            device: getValue("Device", "{device}")
        };

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

            // Generate Ad Group from Keyword (Legacy behavior)
            const adGroup = this.toTitleCase(keyword, abbreviations);

            const adsObj = this.generateAdsRow(keyword, abbreviations, campaignName, targetUrl, adGroup, utmSettings);
            return adsMapper.toArray(adsObj);
        }).filter(r => r !== null);

        // Write to Ads Data Sheet
        this.sheetRepo.clearContent(SHEETS.ADS_DATA);
        if (processedRows.length > 0) {
            this.sheetRepo.setData(SHEETS.ADS_DATA, processedRows);
        }

        // Re-apply Formulas and Validations
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const adsSheet = ss.getSheetByName(SHEETS.ADS_DATA);
        if (adsSheet) {
            applyAdsDataFormulas(adsSheet!);
        }
    }

    /**
     * Generates a single row object for Ads Data sheet.
     */
    private generateAdsRow(
        keyword: string,
        abbreviations: Set<string>,
        campaignName: string,
        targetUrl: string,
        adGroupInput: string,
        utmSettings: Record<string, string>
    ): Record<string, any> {
        // 1. Campaign Name
        const campaign = campaignName;

        // 2. Ad Group (Use Input or generate)
        const adGroup = adGroupInput || this.toTitleCase(keyword, abbreviations);

        // 3. Keyword (The original keyword)
        const originalKeyword = keyword;

        // 4. Keyword for Headlines
        const keywordForHeadline = keyword;

        const rowObj: Record<string, any> = {};

        rowObj["Campaign"] = campaign;
        rowObj["Ad Group"] = adGroup;
        rowObj["Keyword"] = originalKeyword;
        rowObj["Keyword for Headline 1"] = keywordForHeadline;
        const finalUrl = this.constructFinalUrl(targetUrl, utmSettings);

        rowObj["Campaign"] = campaign;
        rowObj["Ad Group"] = adGroup;
        rowObj["Keyword"] = originalKeyword;
        rowObj["Keyword for Headline 1"] = keywordForHeadline;
        rowObj["Final URL"] = finalUrl;

        // 5. Headlines 1-15 (Ads Case)
        // Headline 1 is special? Currently it just uses the transformed keyword.
        // Pass true for isHeadline to enforce strict rules (e.g. no !)
        rowObj["Headline 1"] = this.toAdsHeadline(keyword, abbreviations, true);

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
     * Converts text to Title Case (Headlines) or Sentence Case (Descriptions) and applies Google Ads cleaning rules.
     * @param text Text to transform
     * @param abbreviations Set of abbreviations to keep
     * @param isHeadline If true, applies strict Headline rules (no "!", Title Case). If false (Description), applies Sentence Case.
     */
    private toAdsHeadline(text: string, abbreviations: Set<string>, isHeadline: boolean = true): string {
        let cleaned = text;

        // --- Common Cleaning Rules (Symbols & Spacing) ---

        // 1. Remove Forbidden Symbols (@ < >) - Requested for Description too
        cleaned = cleaned.replace(/[@<>]/g, "");

        // 2. Headlines: No Exclamation Marks
        if (isHeadline) {
            cleaned = cleaned.replace(/!/g, "");
        }

        // 3. Remove Duplicate Punctuation (e.g. ",,")
        cleaned = cleaned.replace(/([,?!:;])\1+/g, '$1');

        // 4. Fix Punctuation Spacing: Comma/Exclam/Question/Colon/Semi-colon followed by non-space
        cleaned = cleaned.replace(/([,?!:;])(?=[^\s])/g, '$1 ');

        // 5. Spacing (Collapse multiple spaces and trim)
        cleaned = cleaned.replace(/\s+/g, " ").trim();

        // --------------------------------

        const words = cleaned.split(/\s+/);

        const IGNORED_WORDS = new Set([
            "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or", "a", "an", "the"
        ]);

        let isNewSentence = true;

        return words.map((word, index) => {
            const upperWord = word.toUpperCase();
            const lowerWord = word.toLowerCase();

            // --- DIFFERENT PATHS FOR HEADLINE VS DESCRIPTION ---

            if (isHeadline) {
                // --- HEADLINE LOGIC (Rich Formatting) ---

                // 1. Check Abbreviation
                const coreWordMatch = word.match(/^([^\w]*)([\w\d'-]+)([^\w]*)$/);
                const coreWord = coreWordMatch ? coreWordMatch[2] : word;
                const coreUpper = coreWord.toUpperCase();

                if (abbreviations.has(coreUpper) || abbreviations.has(upperWord)) {
                    if (abbreviations.has(upperWord)) return upperWord;
                    return word.replace(coreWord, coreUpper);
                }

                // 2. Keep Existing ALL CAPS
                if (word === upperWord && word.length > 1) {
                    return upperWord;
                }

                // 3. Smart Lowercase
                if (index !== 0 && (IGNORED_WORDS.has(lowerWord) || word.length < 2)) {
                    return lowerWord;
                }

                // 4. Title Case
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

            } else {
                // --- DESCRIPTION LOGIC (Strict: Caps + Spacing/Symbols only) ---
                // "Удалить другие проверки или преобразования"
                // Meaning: Don't touch case unless it's the start of a sentence.
                // Don't force lower, don't force upper (abbrevs).

                let retWord = word;
                const shouldCapitalize = index === 0 || isNewSentence;

                if (shouldCapitalize) {
                    // Force first letter Upper. 
                    // Should we force rest lower? "Hotel" or "HoTeL"?
                    // User said "Заглавная буква в каждом новом предложении".
                    // Usually implies fixing the start.
                    // If input is "cheap hotels", output "Cheap hotels".
                    // If input is "USA hotels", output "USA hotels" (preserve case of 'USA'?).
                    // If I do `word.charAt(0).toUpperCase() + word.slice(1)`, "uSA" -> "USA". "hotels" -> "Hotels".
                    // But if it's "hotels", we want "Hotels" (at start).
                    // If it's midway "hotels", we leave it "hotels"?
                    // Wait, user didn't explicitly say "Leave other words as is", but "Remove other transformations".
                    // Transformations usually implies "making lower" or "making title".
                    // So I should probably PRESERVE existing casing for non-start words?
                    // And only enforce Capital at start.

                    retWord = word.charAt(0).toUpperCase() + word.slice(1);
                } else {
                    // Not start of sentence. Leave as is?
                    // Previous logic forced `toLowerCase()`.
                    // If I remove `toLowerCase()`, "Cheap HOTELS" -> "Cheap HOTELS".
                    // User might want this.
                    retWord = word;
                }

                // Update state for NEXT word
                if (/[.!?]+$/.test(word)) {
                    isNewSentence = true;
                } else {
                    isNewSentence = false;
                }

                return retWord;
            }
        }).join(" ");
    }

    private toTitleCase(str: string, abbreviations: Set<string>) {
        return this.toAdsHeadline(str, abbreviations, true);
    }

    /**
     * Constructs the Final URL with UTM parameters.
     */
    private constructFinalUrl(baseUrl: string, settings: Record<string, string>): string {
        let url = baseUrl.trim();
        if (!url) return "";

        // 1. Clean Base URL
        // Remove duplicate protocols (simple check)
        url = url.replace(/^(https?:\/\/)(https?:\/\/)+/i, '$1');
        // Remove hash
        url = url.split('#')[0];

        // 2. Prepare UTM Params
        const params: string[] = [];

        const addParam = (key: string, val: string) => {
            if (!val) return;
            // Clean value: remove #, =, & (user request)
            let cleanVal = val.replace(/[#=&]/g, "");
            // Lowercase (user request: "Перевод в нижний регистр") -> Applied to VALUES or whole URL?
            // "Перевод в нижний регистр" usually applies to the parameter values to avoid case fragmentation in analytics.
            cleanVal = cleanVal.toLowerCase();
            params.push(`${key}=${cleanVal}`);
        };

        // Resolve placeholders (if any specific logic needed, otherwise just pass through)
        // User requested removing transliteration for {keyword}, so we just pass the value as is.
        // Google Ads will replace {keyword} dynamically.
        const resolvePlaceholder = (val: string | undefined) => {
            return val || "";
        };

        addParam("utm_source", resolvePlaceholder(settings.source));
        addParam("utm_medium", resolvePlaceholder(settings.medium));
        addParam("utm_campaign", resolvePlaceholder(settings.campaign));
        addParam("utm_content", resolvePlaceholder(settings.content));
        addParam("utm_term", resolvePlaceholder(settings.term));
        addParam("device", resolvePlaceholder(settings.device));

        // 3. Append to URL
        if (params.length > 0) {
            const separator = url.includes("?") ? "&" : "?";
            // Ensure no double ?? or && (simple check)
            if (url.endsWith("?") || url.endsWith("&")) {
                url += params.join("&");
            } else {
                url += separator + params.join("&");
            }
        }

        return url;
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

        // 1. Identify columns
        const targetIndices: number[] = [];
        let keywordForHeadline1Index = -1;

        headers.forEach((h, i) => {
            if (h === "Keyword for Headline 1") {
                keywordForHeadline1Index = i;
            }
            if (h === "Final URL") {
                targetIndices.push(i);
            }
            if (h.startsWith("Headline ") || h.startsWith("Description ")) {
                targetIndices.push(i);
            }
        });

        // We also need "Keyword" column to generate UTM
        const keywordIndex = headers.indexOf("Keyword");
        if (keywordIndex === -1) return "Keyword column not found.";

        if (targetIndices.length === 0) return "No target columns found.";

        // 2. Fetch Settings for UTM
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const getValue = (key: string, defaultVal: string) => {
            const row = settingsData.find(r => r[0] === key);
            return row ? String(row[1]) : defaultVal;
        };

        const targetUrl = getValue("Target URL", "");
        const utmSettings = {
            source: getValue("UTM Source", "google"),
            medium: getValue("UTM Medium", "cpc"),
            campaign: getValue("UTM Campaign", "{campaignid}"),
            content: getValue("UTM Content", "{creative}"),
            term: getValue("UTM Term", "{keyword}"),
            device: getValue("Device", "{device}")
        };

        // 2. Load Abbreviations
        const abbrevValues = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        abbrevValues.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });

        // 3. Process Data & Collect Column Updates
        const columnUpdates = new Map<number, string[]>();
        let cellsUpdatedCount = 0;

        targetIndices.forEach(colIdx => {
            const newColumnValues: string[] = [];
            let columnChanged = false;
            const colName = headers[colIdx];
            const isHeadline = colName.startsWith("Headline");
            const isFinalUrl = colName === "Final URL";

            data.forEach(row => {
                let rawVal = "";
                const keyword = (keywordIndex < row.length) ? String(row[keywordIndex]) : "";

                // SPECIAL LOGIC: Headline 1 comes from "Keyword for Headline 1"
                if (colName === "Headline 1" && keywordForHeadline1Index !== -1 && keywordForHeadline1Index < row.length) {
                    rawVal = String(row[keywordForHeadline1Index]);
                } else if (colIdx < row.length) {
                    // Otherwise read from itself
                    rawVal = String(row[colIdx]);
                }

                if (isFinalUrl) {
                    // Generate URL
                    // Only generate if we have a keyword (required for utm_term usually)
                    if (!keyword) {
                        newColumnValues.push("");
                        return;
                    }
                    const newUrl = this.constructFinalUrl(targetUrl, utmSettings);

                    // Compare?
                    if (newUrl !== rawVal) {
                        columnChanged = true;
                        cellsUpdatedCount++;
                        newColumnValues.push(newUrl);
                    } else {
                        newColumnValues.push(rawVal);
                    }
                    return;
                }

                if (!rawVal) {
                    newColumnValues.push("");
                    return;
                }

                // Apply formatting & cleaning
                const formattedVal = this.toAdsHeadline(rawVal, abbreviations, isHeadline);

                // Compare with CURRENT value in the cell (to see if we need to update)
                let currentCellVal = "";
                if (colIdx < row.length) {
                    currentCellVal = String(row[colIdx]);
                }

                if (formattedVal !== currentCellVal) {
                    columnChanged = true;
                    cellsUpdatedCount++;
                    newColumnValues.push(formattedVal);
                } else {
                    newColumnValues.push(currentCellVal);
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

    /**
     * Processes a specific range of edits (for onEdit trigger).
     * Automatically formats Headlines and Descriptions in the edited range.
     * @param range The edited range from the event object
     */
    processRange(range: GoogleAppsScript.Spreadsheet.Range): void {
        const sheet = range.getSheet();
        if (sheet.getName() !== SHEETS.ADS_DATA) return;

        const startRow = range.getRow();
        const numRows = range.getNumRows();
        const startCol = range.getColumn();
        const numCols = range.getNumColumns();

        // Optimization: Check if range intersects with Headlines/Descriptions
        // Headlines/Descriptions usually start from Col 6 (Headline 1) onwards.
        // Let's get headers to be sure.
        // We can't cache headers easily in onEdit without PropertiesService, so we just check columns roughly or read headers.
        // Reading headers (row 1) is fast.
        const lastCol = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];

        const targetIndices: number[] = [];
        const isHeadlineMap = new Map<number, boolean>(); // ColIndex -> isHeadline

        // Identify which columns in the edited range are relevant
        for (let c = 0; c < numCols; c++) {
            const colIdx = startCol + c; // 1-based
            if (colIdx > headers.length) continue;

            const header = headers[colIdx - 1]; // 0-based
            if (header && (header.startsWith("Headline") || header.startsWith("Description"))) {
                targetIndices.push(colIdx);
                isHeadlineMap.set(colIdx, header.startsWith("Headline"));
            }
        }

        if (targetIndices.length === 0) return; // Edited range has no relevant columns

        // Load Abbreviations (Once per edit)
        // We can't inject repositories easily in onEdit if we use simple triggers vs installable.
        // But here we are inside the Service which has sheetRepo.
        // Note: usage in onEdit context requires the service to be initialized with a repo.
        const abbrevValues = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        abbrevValues.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });

        // Read values ONLY for the edited range
        // Logic: specific relevant columns? Or just the whole block?
        // Reading the whole block is easier for mapping back.
        const values = range.getValues(); // 2D array [row][col] relative to range
        const newValues = values.map((row, rIdx) => {
            return row.map((cellVal, cIdx) => {
                const colAbsIndex = startCol + cIdx; // 1-based absolute column index

                if (!isHeadlineMap.has(colAbsIndex)) {
                    return cellVal; // Pass through unchanged
                }

                const isHeadline = isHeadlineMap.get(colAbsIndex) || false;
                const text = String(cellVal || "");

                if (!text) return "";

                // Apply formatting
                const newText = this.toAdsHeadline(text, abbreviations, isHeadline);
                return newText;
            });
        });

        // Write back
        // Optimization: check if anything actually changed?
        // JSON.stringify compare or just write. Writing is costlier.
        let changed = false;
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                if (values[r][c] !== newValues[r][c]) {
                    changed = true;
                    break;
                }
            }
            if (changed) break;
        }

        if (changed) {
            range.setValues(newValues);
        }
    }
}
