import { CONFIG, SHEETS } from "../Config";

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
        // In a real app, this might fetch from a sheet or hardcoded list.
        // For now, let's return a subset or read from the Regions sheet if it exists.
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEETS.REGIONS);
        if (!sheet) return [];
        // Assuming layout is Name | ID
        const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2);
        return range.getValues().map(row => [String(row[0]), String(row[1])]);
    }
}
