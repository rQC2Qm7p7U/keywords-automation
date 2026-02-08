import { CONFIG, SHEETS } from "../Config";

export interface IConfigRepository {
    getSheetName(key: "RAW_DATA" | "CLEAN_DATA" | "INTENT_TYPES" | "CLUSTERS" | "SETTINGS" | "REGIONS"): string;
    getProjectName(): string;
    getApiUrl(endpoint: "BASE_URL" | "CHECK_URL" | "RESULT_URL"): string;
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
}
