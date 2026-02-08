import { StateRepository } from "../repositories/StateRepository";
import { ConfigRepository } from "../repositories/ConfigRepository";

const stateRepo = new StateRepository();
const configRepo = new ConfigRepository();

export function getSettings() {
    return {
        arsenkinToken: stateRepo.getProperty("ARSENKIN_API_TOKEN") || "",
        // Add other settings here
    };
}

export function saveSettings(settings: { arsenkinToken: string }) {
    if (settings.arsenkinToken) {
        stateRepo.setProperty("ARSENKIN_API_TOKEN", settings.arsenkinToken);
    }
    return { success: true };
}

export function getRegions() {
    return configRepo.getRegions();
}
