import { ISheetRepository } from "../repositories/SheetRepository";
import { SHEETS, COLUMNS } from "../Config";
import { MESSAGES } from "../Messages";
import { SheetDataMapper } from "../utils/SheetDataMapper";
import { applyAdsDataFormulas } from "../Structure";

// Words that stay lowercase in Title Case (except at start of text)
const IGNORED_WORDS = new Set([
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or", "a", "an", "the"
]);

export class AdsDataService {
    private sheetRepo: ISheetRepository;

    constructor(sheetRepo: ISheetRepository) {
        this.sheetRepo = sheetRepo;
    }

    /**
     * Reads a setting value from Settings sheet data.
     */
    private getSettingsValue(settingsData: any[][], key: string, defaultVal: string): string {
        const row = settingsData.find(r => r[0] === key);
        return row ? String(row[1]) : defaultVal;
    }

    /**
     * Loads UTM settings from Settings sheet data.
     */
    private loadUtmSettings(settingsData: any[][]): Record<string, string> {
        const gv = (key: string, def: string) => this.getSettingsValue(settingsData, key, def);
        return {
            source: gv("UTM Source", "google"),
            medium: gv("UTM Medium", "cpc"),
            campaign: gv("UTM Campaign", "{campaignid}"),
            content: gv("UTM Content", "{creative}"),
            term: gv("UTM Term", "{keyword}"),
            device: gv("Device", "{device}")
        };
    }

    /**
     * Loads abbreviation set from Intent Types sheet.
     * Reused across formatAdsData, prepareAdsData, transferClustersToAdsData, processRange.
     */
    private loadAbbreviations(): Set<string> {
        const values = this.sheetRepo.getColumnValues(SHEETS.INTENT_TYPES, "Abbreviations");
        const abbreviations = new Set<string>();
        values.forEach(v => {
            if (v) abbreviations.add(String(v).toUpperCase());
        });
        return abbreviations;
    }

    /**
     * Transfers data from Clusters sheet to Ads Data sheet.
     * Mapping: Group name -> Ad Group, Keyword -> Keyword + Headline 1.
     */
    transferClustersToAdsData() {
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const campaignName = this.getSettingsValue(settingsData, "Campaign Name", "Keywords Automation");
        const targetUrl = this.getSettingsValue(settingsData, "Target URL", "");
        const utmSettings = this.loadUtmSettings(settingsData);

        // Initialize Mappers
        const clustersMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.CLUSTERS);
        const adsMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.ADS_DATA);

        // Fetch Data from Clusters
        const clustersData = this.sheetRepo.getData(SHEETS.CLUSTERS);
        if (!clustersData || clustersData.length === 0) {
            throw new Error("No data in Clusters sheet");
        }

        const abbreviations = this.loadAbbreviations();

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

        this.reapplyAdsFormulas();

        return MESSAGES.SUCCESS.CLUSTERS_TRANSFERRED.replace("{0}", String(processedRows.length));
    }

    /**
     * Prepares Ads Data from Clean Data sheet.
     */
    prepareAdsData() {
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const campaignName = this.getSettingsValue(settingsData, "Campaign Name", "Keywords Automation");
        const targetUrl = this.getSettingsValue(settingsData, "Target URL", "");
        const utmSettings = this.loadUtmSettings(settingsData);

        const cleanMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.CLEAN_DATA);
        const adsMapper: SheetDataMapper = this.sheetRepo.getMapper(SHEETS.ADS_DATA);

        // Fetch Keywords from Clean Data
        const cleanData = this.sheetRepo.getData(SHEETS.CLEAN_DATA);
        if (!cleanData || cleanData.length === 0) {
            throw new Error("No data in Clean Data sheet");
        }

        const abbreviations = this.loadAbbreviations();

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

        this.reapplyAdsFormulas();
    }

    /**
     * Re-applies array formulas and conditional formatting to Ads Data.
     * Separated to avoid SpreadsheetApp calls scattered across methods.
     */
    private reapplyAdsFormulas(): void {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const adsSheet = ss.getSheetByName(SHEETS.ADS_DATA);
        if (adsSheet) {
            applyAdsDataFormulas(adsSheet);
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
        const rowObj: Record<string, any> = {
            "Campaign": campaignName,
            "Ad Group": adGroupInput || this.toTitleCase(keyword, abbreviations),
            "Keyword": keyword,
            "Keyword for Headline 1": keyword,
            "Final URL": this.constructFinalUrl(targetUrl, utmSettings),
            "Headline 1": this.toAdsHeadline(keyword, abbreviations, true),
        };

        // Headlines 2-15 (empty by default)
        for (let i = 2; i <= 15; i++) {
            rowObj[`Headline ${i}`] = "";
        }

        // Descriptions 1-4 (empty by default)
        for (let i = 1; i <= 4; i++) {
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
                // --- DESCRIPTION LOGIC ---
                // Only capitalize first word of each sentence. Preserve existing casing otherwise.
                const shouldCapitalize = index === 0 || isNewSentence;
                const retWord = shouldCapitalize
                    ? word.charAt(0).toUpperCase() + word.slice(1)
                    : word;

                // Track sentence boundaries for next word
                isNewSentence = /[.!?]+$/.test(word);

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
            return MESSAGES.ERRORS.NO_DATA.replace("{0}", sheetName);
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
        if (keywordIndex === -1) return MESSAGES.ERRORS.COLUMN_NOT_FOUND.replace("{0}", "Keyword");

        if (targetIndices.length === 0) return MESSAGES.ERRORS.COLUMN_NOT_FOUND.replace("{0}", "Headline/Description");

        // 2. Fetch Settings for UTM
        const settingsData = this.sheetRepo.getData(SHEETS.SETTINGS);
        const targetUrl = this.getSettingsValue(settingsData, "Target URL", "");
        const utmSettings = this.loadUtmSettings(settingsData);

        // 2. Load Abbreviations
        const abbreviations = this.loadAbbreviations();

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

            return MESSAGES.SUCCESS.FORMAT_COMPLETE
                .replace("{0}", String(cellsUpdatedCount))
                .replace("{1}", String(columnUpdates.size));
        } else {
            return MESSAGES.SUCCESS.FORMAT_NO_CHANGES;
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

        const lastCol = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];

        // --- 1. Check if "Keyword for Headline 1" was edited → update Headline 1 ---
        const kwForH1Idx = headers.indexOf("Keyword for Headline 1"); // 0-based
        const h1Idx = headers.indexOf("Headline 1"); // 0-based

        const kwForH1Edited = kwForH1Idx !== -1 && h1Idx !== -1
            && (kwForH1Idx + 1) >= startCol
            && (kwForH1Idx + 1) < startCol + numCols;

        // --- 2. Check if edited range touches any Headline/Description columns ---
        const targetIndices: number[] = [];
        const isHeadlineMap = new Map<number, boolean>();

        for (let c = 0; c < numCols; c++) {
            const colIdx = startCol + c; // 1-based
            if (colIdx > headers.length) continue;

            const header = headers[colIdx - 1]; // 0-based
            if (header && (header.startsWith("Headline") || header.startsWith("Description"))) {
                targetIndices.push(colIdx);
                isHeadlineMap.set(colIdx, header.startsWith("Headline"));
            }
        }

        // Nothing relevant was edited
        if (targetIndices.length === 0 && !kwForH1Edited) return;

        const abbreviations = this.loadAbbreviations();

        // --- 3. If "Keyword for Headline 1" was edited, update Headline 1 column ---
        if (kwForH1Edited) {
            const kwColInRange = kwForH1Idx + 1 - startCol; // 0-based offset within range
            const rangeValues = range.getValues();
            const h1Col = h1Idx + 1; // 1-based

            const h1Range = sheet.getRange(startRow, h1Col, numRows, 1);
            const h1Values = h1Range.getValues();
            let h1Changed = false;

            for (let r = 0; r < numRows; r++) {
                const kwText = String(rangeValues[r][kwColInRange] || "");
                if (!kwText) continue;
                const formatted = this.toAdsHeadline(kwText, abbreviations, true);
                if (formatted !== String(h1Values[r][0])) {
                    h1Values[r][0] = formatted;
                    h1Changed = true;
                }
            }

            if (h1Changed) {
                h1Range.setValues(h1Values);
            }
        }

        // --- 4. Format Headlines/Descriptions in the edited range ---
        if (targetIndices.length === 0) return;

        const values = range.getValues();
        const newValues = values.map((row, rIdx) => {
            return row.map((cellVal, cIdx) => {
                const colAbsIndex = startCol + cIdx;

                if (!isHeadlineMap.has(colAbsIndex)) {
                    return cellVal;
                }

                const isHeadline = isHeadlineMap.get(colAbsIndex) || false;
                const text = String(cellVal || "");
                if (!text) return "";

                return this.toAdsHeadline(text, abbreviations, isHeadline);
            });
        });

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
