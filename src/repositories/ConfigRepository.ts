import { CONFIG, SHEETS, API } from "../Config";

export interface IConfigRepository {
    getSheetName(key: "RAW_DATA" | "CLEAN_DATA" | "INTENT_TYPES" | "CLUSTERS" | "SETTINGS" | "REGIONS"): string;
    getProjectName(): string;
    getApiUrl(endpoint: "BASE_URL" | "CHECK_URL" | "RESULT_URL"): string;
    getRegions(): Promise<string[][]>;
}

export class ConfigRepository implements IConfigRepository {
    getSheetName(key: "RAW_DATA" | "CLEAN_DATA" | "INTENT_TYPES" | "CLUSTERS" | "SETTINGS" | "REGIONS"): string {
        return SHEETS[key];
    }

    getProjectName(): string {
        return CONFIG.PROJECT_NAME;
    }

    getApiUrl(endpoint: "BASE_URL" | "CHECK_URL" | "RESULT_URL"): string {
        return API.ARSENKIN[endpoint];
    }

    async getRegions(): Promise<string[][]> {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEETS.REGIONS);
        if (!sheet) return [];
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];
        return sheet.getRange(2, 1, lastRow - 1, 2).getValues().map(row => [String(row[0]), String(row[1])]);
    }
}
