import { ClusterService } from "../../src/services/ClusterService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { IArsenkinRepository } from "../../src/repositories/ArsenkinRepository";
import { IConfigRepository } from "../../src/repositories/ConfigRepository";
import { IStateRepository } from "../../src/repositories/StateRepository";

// Mocks
const mockSheetRepo = {
    getData: jest.fn(),
    setData: jest.fn(),
    getColumnValues: jest.fn(),
    getHeaders: jest.fn()
} as unknown as ISheetRepository;

const mockArsenkinRepo = {
    fetchTask: jest.fn(),
    checkTaskStatus: jest.fn(),
    getTaskResult: jest.fn()
} as unknown as IArsenkinRepository;

const mockConfigRepo = {
    getSheetName: jest.fn(),
    getProjectName: jest.fn(),
    getApiUrl: jest.fn()
} as unknown as IConfigRepository;

const mockStateRepo = {
    getProperty: jest.fn(),
    setProperty: jest.fn()
} as unknown as IStateRepository;

describe("ClusterService", () => {
    let service: ClusterService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ClusterService(mockArsenkinRepo, mockSheetRepo, mockConfigRepo, mockStateRepo);

        // Setup default mock returns
        (mockConfigRepo.getSheetName as jest.Mock).mockImplementation((key) => key); // Return Key as Name
        (mockConfigRepo.getProjectName as jest.Mock).mockReturnValue("TestProject");
    });

    test("runClustering should throw if API Token is missing", () => {
        (mockStateRepo.getProperty as jest.Mock).mockReturnValue(null); // Missing Token

        expect(() => service.runClustering()).toThrow("API Token not set");
    });

    test("runClustering should succeed with valid data", () => {
        (mockStateRepo.getProperty as jest.Mock).mockImplementation((key) => {
            if (key === "ARSENKIN_API_TOKEN") return "valid_token";
            return null;
        });

        (mockSheetRepo.getColumnValues as jest.Mock).mockImplementation((sheetDoc, col) => {
            if (sheetDoc === "SETTINGS") return ["", "", "Moscow"];
            if (sheetDoc === "CLEAN_DATA") return ["keyword1", "keyword2"];
            return [];
        });
        (mockSheetRepo.getData as jest.Mock).mockReturnValue([["Moscow", 213]]);
        (mockArsenkinRepo.fetchTask as jest.Mock).mockReturnValue({ task_id: 12345 });

        const result = service.runClustering();

        expect(result.status).toBe("STARTED");
        expect(result.taskId).toBe(12345);
        expect(mockStateRepo.setProperty).toHaveBeenCalledWith("LAST_TASK_ID", "12345");
    });
});
