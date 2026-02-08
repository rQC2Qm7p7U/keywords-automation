
import { ArsenkinRepository } from "../../src/repositories/ArsenkinRepository";

// Mock global API object if used in Repository (it is)
global.API = {
    ARSENKIN: {
        BASE_URL: "https://api.arsenkin.ru/base",
        CHECK_URL: "https://api.arsenkin.ru/check",
        RESULT_URL: "https://api.arsenkin.ru/result"
    }
} as any;

// Mock UrlFetchApp
const mockHttpResponse = {
    getResponseCode: jest.fn(),
    getContentText: jest.fn(),
};

global.UrlFetchApp = {
    fetch: jest.fn(),
} as any;

global.Utilities = {
    sleep: jest.fn(),
} as any;

// Mock console.warn to keep test output clean
global.console.warn = jest.fn();

describe("ArsenkinRepository", () => {
    let repo: ArsenkinRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new ArsenkinRepository();
        (global.UrlFetchApp.fetch as jest.Mock).mockReturnValue(mockHttpResponse);
    });

    test("fetchTask successfully sends request", () => {
        (mockHttpResponse.getResponseCode as jest.Mock).mockReturnValue(200);
        (mockHttpResponse.getContentText as jest.Mock).mockReturnValue('{"taskId": 123}');

        const result = repo.fetchTask("task1", "data", 1, "token");
        expect(result).toEqual({ taskId: 123 });
    });

    test("fetchTask retries on failure (500)", () => {
        (mockHttpResponse.getResponseCode as jest.Mock)
            .mockReturnValueOnce(500)
            .mockReturnValueOnce(200);
        (mockHttpResponse.getContentText as jest.Mock).mockReturnValue('{"taskId": 123}');

        const result = repo.fetchTask("task1", "data", 1, "token");
        expect(result).toEqual({ taskId: 123 });
        expect(global.UrlFetchApp.fetch).toHaveBeenCalledTimes(2);
    });

    test("fetchTask throws after max retries", () => {
        (mockHttpResponse.getResponseCode as jest.Mock).mockReturnValue(500);

        expect(() => repo.fetchTask("task1", "data", 1, "token")).toThrow("Server/Rate Limit Error (500)");
        // 1 initial + 3 retries = 4 calls
        expect(global.UrlFetchApp.fetch).toHaveBeenCalledTimes(4);
    });

    test("fetchTask throws immediately on 4xx error (non-429)", () => {
        (mockHttpResponse.getResponseCode as jest.Mock).mockReturnValue(400);
        (mockHttpResponse.getContentText as jest.Mock).mockReturnValue("Bad Request");

        expect(() => repo.fetchTask("task1", "data", 1, "token")).toThrow("Client Error (400): Bad Request");
        expect(global.UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
    });

    test("fetchTask throws on invalid JSON response", () => {
        (mockHttpResponse.getResponseCode as jest.Mock).mockReturnValue(200);
        (mockHttpResponse.getContentText as jest.Mock).mockReturnValue("INVALID JSON");

        expect(() => repo.fetchTask("task1", "data", 1, "token")).toThrow("Invalid JSON response from Arsenkin API");
    });

    test("checkTaskStatus handles parse error", () => {
        (mockHttpResponse.getResponseCode as jest.Mock).mockReturnValue(200);
        (mockHttpResponse.getContentText as jest.Mock).mockReturnValue("INVALID JSON");

        expect(() => repo.checkTaskStatus(123, "token")).toThrow("Failed to parse status check response");
    });
});
