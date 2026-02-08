
// Define Mock Instances Upfront
const mockCleanupInstance = {
    removeDuplicates: jest.fn(),
    collectNegativeKeywords: jest.fn(),
    transferRawToClean: jest.fn(),
    cleanKeysFromNegatives: jest.fn(),
};

const mockClusterInstance = {
    runClustering: jest.fn(),
    checkLastTask: jest.fn(),
};

// Mock Dependencies with Factories
jest.mock("../../src/repositories/SheetRepository");
jest.mock("../../src/repositories/ArsenkinRepository");
jest.mock("../../src/repositories/ConfigRepository");
jest.mock("../../src/repositories/StateRepository");

jest.mock("../../src/services/CleanupService", () => ({
    CleanupService: jest.fn(() => mockCleanupInstance)
}));

jest.mock("../../src/services/ClusterService", () => ({
    ClusterService: jest.fn(() => mockClusterInstance)
}));

jest.mock("../../src/UI");
jest.mock("../../src/Structure");

import { CleanupService } from "../../src/services/CleanupService";
import { ClusterService } from "../../src/services/ClusterService";
import { createProjectMenu } from "../../src/UI";
import { createStructure } from "../../src/Structure";

import * as Code from "../../src/Code";

describe("Code.ts Entry Points", () => {
    // Mock GAS Globals
    const mockUi = {
        alert: jest.fn(),
        Button: { YES: "YES", NO: "NO", OK: "OK" },
        ButtonSet: { YES_NO: "YES_NO", OK: "OK" },
    };
    const mockSpreadsheet = {
        toast: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Globals
        global.SpreadsheetApp = {
            getUi: jest.fn(() => mockUi),
            getActiveSpreadsheet: jest.fn(() => mockSpreadsheet),
        } as any;

        global.Utilities = {
            parseCsv: jest.fn(),
        } as any;
    });

    test("onOpen creates menu", () => {
        Code.onOpen({} as any);
        expect(createProjectMenu).toHaveBeenCalled();
    });

    test("handleCreateStructure prompts user", () => {
        // User says YES
        mockUi.alert.mockReturnValue("YES");
        Code.handleCreateStructure();
        expect(createStructure).toHaveBeenCalled();
    });

    test("handleCreateStructure aborts if NO", () => {
        mockUi.alert.mockReturnValue("NO");
        Code.handleCreateStructure();
        expect(createStructure).not.toHaveBeenCalled();
    });

    test("handleRemoveDuplicates calls service", () => {
        mockCleanupInstance.removeDuplicates.mockReturnValue(5);

        Code.handleRemoveDuplicates();
        expect(mockCleanupInstance.removeDuplicates).toHaveBeenCalledTimes(2); // Raw and Clean
        expect(mockSpreadsheet.toast).toHaveBeenCalled();
    });

    test("handleRunClustering calls service", () => {
        mockUi.alert.mockReturnValue("YES"); // Confirm
        mockClusterInstance.runClustering.mockReturnValue({ taskId: 1, message: "ok" });

        Code.handleRunClustering();

        expect(mockClusterInstance.runClustering).toHaveBeenCalled();
        expect(mockUi.alert).toHaveBeenCalledWith(expect.stringContaining("Started"), expect.any(String), expect.any(String));
    });
});
