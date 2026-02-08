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
                    // Client error: Do not retry
                    throw new Error(`Client Error (${code}): ${response.getContentText()}`);
                }

                throw new Error(`Server/Rate Limit Error (${code})`);

            } catch (e: any) {
                // If it's a Client Error, rethrow immediately
                if (e.message && e.message.startsWith("Client Error")) {
                    throw e;
                }

                lastError = e;
                attempt++;
                if (attempt > retries) break;

                const sleepTime = Math.pow(2, attempt - 1) * 1000;
                console.warn(`Fetch Failed (Attempt ${attempt}): ${(e as Error).message}. Retrying in ${sleepTime}ms...`);
                Utilities.sleep(sleepTime);
            }
        }

        throw lastError as Error;
    }

    fetchTask(taskName: string, fileData: string, regionId: number, token: string): any {
        const payload = {
            "method": "clustering/create",
            "task_name": taskName,
            "region": regionId,
            "txt": fileData
        };

        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "post",
            "contentType": "application/json",
            "headers": {
                "Authorization": "Bearer " + token,
                "mode": "cors"
            },
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        // We assume API global is available or we could inject Config. 
        // Using global API for now as per Config.ts
        const response = this.fetchWithRetry(API.ARSENKIN.BASE_URL, options);
        try {
            return JSON.parse(response.getContentText());
        } catch (e) {
            throw new Error("Invalid JSON response from Arsenkin API");
        }
    }

    checkTaskStatus(taskId: number, token: string): any {
        const url = `${API.ARSENKIN.CHECK_URL}?task_id=${taskId}`;
        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "get",
            "headers": { "Authorization": "Bearer " + token },
            "muteHttpExceptions": true
        };

        const response = this.fetchWithRetry(url, options);
        try {
            return JSON.parse(response.getContentText());
        } catch (e) {
            throw new Error("Failed to parse status check response");
        }
    }

    getTaskResult(taskId: number, token: string): any {
        const url = `${API.ARSENKIN.RESULT_URL}?task_id=${taskId}`;
        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "get",
            "headers": { "Authorization": "Bearer " + token },
            "muteHttpExceptions": true
        };

        const response = this.fetchWithRetry(url, options);
        return response.getContentText();
    }
}
