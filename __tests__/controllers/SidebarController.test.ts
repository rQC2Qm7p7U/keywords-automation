
// Define Mock Instances Upfront
const mockStateRepo = {
    getProperty: jest.fn(),
    setProperty: jest.fn(),
};
const mockConfigRepo = {
    getRegions: jest.fn(),
};
const mockAdsService = {
    prepareAdsData: jest.fn(),
};

// Mock Dependencies with Factories
jest.mock("../../src/repositories/StateRepository", () => ({
    StateRepository: jest.fn(() => mockStateRepo)
}));
jest.mock("../../src/repositories/ConfigRepository", () => ({
    ConfigRepository: jest.fn(() => mockConfigRepo)
}));
jest.mock("../../src/repositories/SheetRepository"); // Pass through, or mock class if needed
jest.mock("../../src/services/AdsDataService", () => ({
    AdsDataService: jest.fn(() => mockAdsService)
}));

import { getSettings, saveSettings, getRegions, prepareAdsData } from "../../src/controllers/SidebarController";

describe("SidebarController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("getSettings returns token from StateRepository", () => {
        // Setup return value on the instance
        mockStateRepo.getProperty.mockReturnValue("test_token");

        const settings = getSettings();
        expect(settings.arsenkinToken).toBe("test_token");
    });

    test("saveSettings saves token to StateRepository", () => {
        saveSettings({ arsenkinToken: "new_token" });
        expect(mockStateRepo.setProperty).toHaveBeenCalledWith("ARSENKIN_API_TOKEN", "new_token");
    });

    test("getRegions delegates to ConfigRepository", () => {
        mockConfigRepo.getRegions.mockReturnValue([["RegionA", "1"]]);
        const regions = getRegions();
        expect(regions).toEqual([["RegionA", "1"]]);
    });

    test("prepareAdsData delegates to AdsDataService", () => {
        prepareAdsData();
        expect(mockAdsService.prepareAdsData).toHaveBeenCalled();
    });
});
