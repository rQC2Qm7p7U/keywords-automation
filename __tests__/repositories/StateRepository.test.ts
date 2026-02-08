
import { StateRepository } from "../../src/repositories/StateRepository";

// Mock PropertiesService
const mockProperties = {
    getProperty: jest.fn(),
    setProperty: jest.fn(),
    deleteProperty: jest.fn(),
};

const mockScriptProperties = {
    getScriptProperties: jest.fn(() => mockProperties),
};

global.PropertiesService = mockScriptProperties as any;

describe("StateRepository", () => {
    let repo: StateRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new StateRepository();
    });

    test("getProperty calls script properties", () => {
        (mockProperties.getProperty as jest.Mock).mockReturnValue("value");
        expect(repo.getProperty("key")).toBe("value");
        expect(mockProperties.getProperty).toHaveBeenCalledWith("key");
    });

    test("setProperty calls script properties", () => {
        repo.setProperty("key", "value");
        expect(mockProperties.setProperty).toHaveBeenCalledWith("key", "value");
    });

    test("deleteProperty calls script properties", () => {
        repo.deleteProperty("key");
        expect(mockProperties.deleteProperty).toHaveBeenCalledWith("key");
    });
});
