import { API } from "../Config";

export interface IArsenkinRepository {
    fetchTask(taskName: string, fileData: string, regionId: number, token: string): any;
    checkTaskStatus(taskId: number, token: string): any;
    getTaskResult(taskId: number, token: string): any;
}

export class ArsenkinRepository implements IArsenkinRepository {
    private fetchWithRetry(url: string, options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions, retries: number = 3): GoogleAppsScript.URL_Fetch.HTTPResponse {
        let attempt = 0;
        let lastError;

        while (attempt <= retries) {
            try {
                const response = UrlFetchApp.fetch(url, options);
                const code = response.getResponseCode();

                if (code >= 200 && code < 300) return response;

                if (code >= 400 && code < 500 && code !== 429) {
                    throw new Error(`Client Error (${code}): ${response.getContentText()}`);
                }

                throw new Error(`Server/Rate Limit Error (${code})`);

            } catch (e: any) {
                if (e.message && e.message.startsWith("Client Error")) {
                    throw e;
                }

                lastError = e;
                attempt++;
                if (attempt > retries) break;

                const sleepTime = Math.pow(2, attempt - 1) * 1000;
                console.warn(`[Arsenkin] Fetch Failed (Attempt ${attempt}): ${(e as Error).message}. Retrying in ${sleepTime}ms...`);
                Utilities.sleep(sleepTime);
            }
        }

        throw lastError as Error;
    }

    /**
     * Creates a clustering task via Arsenkin API.
     * Payload format per official docs: https://arsenkin.ru/tools/api/
     */
    fetchTask(taskName: string, fileData: string, regionId: number, token: string): any {
        const queries = fileData.split("\n").filter(q => q.trim().length > 0);

        const payload = {
            "tools_name": "clustering",
            "data": {
                "queries": queries,
                "group": "hard",
                "count": 3,
                "se": 2,           // Google = 2
                "region": regionId,
                "depth": 10,
                "main": true
            }
        };

        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "post",
            "contentType": "application/json",
            "headers": {
                "Authorization": "Bearer " + token
            },
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        const response = this.fetchWithRetry(API.ARSENKIN.BASE_URL, options);
        try {
            return JSON.parse(response.getContentText());
        } catch (e) {
            throw new Error("Invalid JSON response from Arsenkin API");
        }
    }

    checkTaskStatus(taskId: number, token: string): any {
        const payload = {
            "task_id": taskId
        };

        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "post",
            "contentType": "application/json",
            "headers": { "Authorization": "Bearer " + token },
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        const response = this.fetchWithRetry(API.ARSENKIN.CHECK_URL, options);
        try {
            return JSON.parse(response.getContentText());
        } catch (e) {
            throw new Error("Failed to parse status check response");
        }
    }

    getTaskResult(taskId: number, token: string): any {
        const payload = {
            "task_id": taskId
        };

        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "post",
            "contentType": "application/json",
            "headers": { "Authorization": "Bearer " + token },
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        const response = this.fetchWithRetry(API.ARSENKIN.RESULT_URL, options);
        return response.getContentText();
    }
}
