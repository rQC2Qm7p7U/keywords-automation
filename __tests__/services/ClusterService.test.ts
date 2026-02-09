
import { ClusterService } from "../../src/services/ClusterService";
import { ISheetRepository } from "../../src/repositories/SheetRepository";
import { IArsenkinRepository } from "../../src/repositories/ArsenkinRepository";
import { IConfigRepository } from "../../src/repositories/ConfigRepository";
import { IStateRepository } from "../../src/repositories/StateRepository";

// Mock global Utilities for CSV parsing
global.Utilities = {
    parseCsv: jest.fn(),
} as any;

describe("ClusterService", () => {
    let service: ClusterService;
    let mockSheetRepo: jest.Mocked<ISheetRepository>;
    let mockArsenkinRepo: jest.Mocked<IArsenkinRepository>;
    let mockConfigRepo: jest.Mocked<IConfigRepository>;
    let mockStateRepo: jest.Mocked<IStateRepository>;
    let mockMapper: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockMapper = {
            toArray: jest.fn(),
            fromArray: jest.fn(),
            toObject: jest.fn(),
        };

        mockSheetRepo = {
            getData: jest.fn(),
            setData: jest.fn(),
            getColumnValues: jest.fn(),
            getHeaders: jest.fn(),
            getMapper: jest.fn(),
            clearContent: jest.fn(),
            appendData: jest.fn(),
            setColumnValues: jest.fn(),
            clearColumnBackgrounds: jest.fn(),
            protectHeaderRow: jest.fn(),
            getBackgrounds: jest.fn(),
            setBackgrounds: jest.fn(),
            setCellValue: jest.fn(),
        } as unknown as jest.Mocked<ISheetRepository>;

        mockArsenkinRepo = {
            fetchTask: jest.fn(),
            checkTaskStatus: jest.fn(),
            getTaskResult: jest.fn()
        } as unknown as jest.Mocked<IArsenkinRepository>;

        mockConfigRepo = {
            getSheetName: jest.fn(),
            getProjectName: jest.fn(),
            getApiUrl: jest.fn()
        } as unknown as jest.Mocked<IConfigRepository>;

        mockStateRepo = {
            getProperty: jest.fn(),
            setProperty: jest.fn()
        } as unknown as jest.Mocked<IStateRepository>;

        // Defaults
        mockConfigRepo.getSheetName.mockImplementation((key) => key);
        mockConfigRepo.getProjectName.mockReturnValue("TestProject");
        mockSheetRepo.getMapper.mockReturnValue(mockMapper);

        service = new ClusterService(mockArsenkinRepo, mockSheetRepo, mockConfigRepo, mockStateRepo);
    });

    describe("runClustering", () => {
        test("should throw if API Token is missing", () => {
            mockStateRepo.getProperty.mockReturnValue(null);
            expect(() => service.runClustering()).toThrow("API Token not set");
        });

        test("should throw if no keywords found", () => {
            mockStateRepo.getProperty.mockReturnValue("valid_token");
            // Settings Mock
            mockSheetRepo.getData.mockReturnValue([["Region", "Moscow"]]);
            // Regions Mock
            mockSheetRepo.getData.mockReturnValueOnce([["Region", "Moscow"]]) // First call for Settings
                .mockReturnValueOnce([["Moscow", "213"]]); // Second call for Regions

            mockSheetRepo.getColumnValues.mockReturnValue([]); // Empty keywords

            expect(() => service.runClustering()).toThrow("No keywords found");
        });

        test("should succeed with valid data", () => {
            mockStateRepo.getProperty.mockReturnValue("valid_token");

            // Mock Settings & Regions logic
            // getSettings calls getData(SETTINGS) then getData(REGIONS)
            mockSheetRepo.getData.mockReturnValueOnce([["Region", "Moscow"]]);
            mockSheetRepo.getData.mockReturnValueOnce([["Moscow", "213"]]);

            // getColumnValues for keywords
            mockSheetRepo.getColumnValues.mockReturnValue(["keyword1", "keyword2"]);

            mockArsenkinRepo.fetchTask.mockReturnValue({ task_id: 12345 });

            const result = service.runClustering();

            expect(result.status).toBe("STARTED");
            expect(result.taskId).toBe(12345);
            expect(mockStateRepo.setProperty).toHaveBeenCalledWith("LAST_TASK_ID", "12345");
        });
    });

    describe("checkLastTask", () => {
        test("returns NO_ID if no task id saved", () => {
            // Mock Token being present so getSettings passes
            mockStateRepo.getProperty.mockReturnValue("valid_token");
            // Mock Settings call
            mockSheetRepo.getData.mockReturnValueOnce([["Region", "Moscow"]]);
            mockSheetRepo.getData.mockReturnValueOnce([["Moscow", "213"]]);

            // Now mock the specific call for LAST_TASK_ID to return null
            // Since we have multiple calls to getProperty (Token, then TaskID), we need implementation mocking
            mockStateRepo.getProperty.mockImplementation((key) => {
                if (key === "ARSENKIN_API_TOKEN") return "valid_token";
                if (key === "LAST_TASK_ID") return null;
                return null;
            });

            expect(service.checkLastTask()).toEqual({ status: "NO_ID", message: "No active task found" });
        });

        test("returns PROCESSING if status is not 2", () => {
            mockStateRepo.getProperty.mockReturnValue("123"); // Token
            mockStateRepo.getProperty.mockReturnValueOnce("123") // Token call inside getSettings? 
            // Wait, getSettings is called first. 
            // In checkLastTask: const { token } = this.getSettings();
            // So mocks need to aligned.

            // Adjust mocks for getSettings
            mockStateRepo.getProperty.mockReturnValue("valid_token"); // For Token
            mockStateRepo.getProperty.mockImplementation((key) => {
                if (key === "ARSENKIN_API_TOKEN") return "valid_token";
                if (key === "LAST_TASK_ID") return "999";
                return null;
            });

            // We need to mock getData for settings/regions again because getSettings is called
            mockSheetRepo.getData.mockReturnValueOnce([["Region", "Moscow"]]);
            mockSheetRepo.getData.mockReturnValueOnce([["Moscow", "213"]]);

            mockArsenkinRepo.checkTaskStatus.mockReturnValue({ data: { status_id: 1 } }); // Processing

            const result = service.checkLastTask();
            expect(result.status).toBe("PROCESSING");
        });

        test("returns FINISHED and data if status is 2", () => {
            mockStateRepo.getProperty.mockImplementation((key) => {
                if (key === "ARSENKIN_API_TOKEN") return "valid_token";
                if (key === "LAST_TASK_ID") return "999";
                return null;
            });

            mockSheetRepo.getData.mockReturnValueOnce([["Region", "Moscow"]]);
            mockSheetRepo.getData.mockReturnValueOnce([["Moscow", "213"]]);

            mockArsenkinRepo.checkTaskStatus.mockReturnValue({ data: { status_id: 2 } });
            mockArsenkinRepo.getTaskResult.mockReturnValue("CSV_CONTENT");

            const result = service.checkLastTask();
            expect(result.status).toBe("FINISHED");
            expect(result.data).toBe("CSV_CONTENT");
        });
    });

    describe("processTaskResult", () => {
        test("handles empty CSV", () => {
            (global.Utilities.parseCsv as jest.Mock).mockReturnValue([]);
            const result = service.processTaskResult("");
            expect(result.success).toBe(false);
            expect(result.message).toContain("empty");
        });

        test("handles CSV with only headers", () => {
            (global.Utilities.parseCsv as jest.Mock).mockReturnValue([["Header1"]]);
            const result = service.processTaskResult("Header1");
            expect(result.success).toBe(false);
            expect(result.message).toContain("no data rows");
        });

        test("successfully processes valid CSV", () => {
            const mockCsv = [
                ["H_Key", "H_Group", "H_Phrases", "H_Agg", "H_Main", "H_Topo", "H_URL"], // Header
                ["k1", "g1", "p1", "10%", "main1", "top1", "url1"] // Row 1
            ];
            (global.Utilities.parseCsv as jest.Mock).mockReturnValue(mockCsv);

            mockMapper.toArray.mockReturnValue(["MappedRow"]);

            const result = service.processTaskResult("csv_string");

            expect(result.success).toBe(true);
            expect(mockSheetRepo.setData).toHaveBeenCalledWith("CLUSTERS", [["MappedRow"]]);

            // Verify mapping args
            expect(mockMapper.toArray).toHaveBeenCalledWith(expect.objectContaining({
                "Keyword": "k1",
                "Group name": "g1",
                "% Aggregators": "10%",
                "Avg. monthly searches": ""
            }));
        });
    });
});
