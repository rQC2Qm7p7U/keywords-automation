import { IArsenkinRepository } from "../repositories/ArsenkinRepository";
import { ISheetRepository } from "../repositories/SheetRepository";
import { IConfigRepository } from "../repositories/ConfigRepository";
import { IStateRepository } from "../repositories/StateRepository";

export class ClusterService {
    private arsenkinRepo: IArsenkinRepository;
    private sheetRepo: ISheetRepository;
    private configRepo: IConfigRepository;
    private stateRepo: IStateRepository;

    constructor(
        arsenkinRepo: IArsenkinRepository,
        sheetRepo: ISheetRepository,
        configRepo: IConfigRepository,
        stateRepo: IStateRepository
    ) {
        this.arsenkinRepo = arsenkinRepo;
        this.sheetRepo = sheetRepo;
        this.configRepo = configRepo;
        this.stateRepo = stateRepo;
    }

    private getSettings(): { token: string, region: number } {
        const token = this.stateRepo.getProperty("ARSENKIN_API_TOKEN");
        if (!token) throw new Error("API Token not set. Please set it in the menu.");

        const settingsSheet = this.configRepo.getSheetName("SETTINGS");

        // We only need Region now from Sheet
        const values = this.sheetRepo.getColumnValues(settingsSheet, "Value");

        // Structure.ts: 
        // Row 0 (Header)
        // Row 1 (B2): Search Engine
        // Row 2 (B3): Region Search
        // Row 3 (B4): Region Name
        const regionName = values[2];

        const regionsSheet = this.configRepo.getSheetName("REGIONS");
        const regions = this.sheetRepo.getData(regionsSheet); // Col A=Name, Col B=ID
        const found = regions.find(r => r[0] === regionName);

        let regionId = 213; // Default Moscow
        if (found) {
            regionId = Number(found[1]);
        }

        return { token: token, region: regionId };
    }

    runClustering(): any {
        const { token, region } = this.getSettings();
        const cleanSheet = this.configRepo.getSheetName("CLEAN_DATA");

        // 1. Get Keywords
        const keywords = this.sheetRepo.getColumnValues(cleanSheet, "Keyword");
        const validKeywords = keywords.filter(k => k && String(k).trim().length > 0);

        if (validKeywords.length === 0) throw new Error("No keywords found in Clean Data");

        // 2. Prepare Payload
        const projectName = this.configRepo.getProjectName();
        const taskName = `${projectName} - ${new Date().toLocaleString()}`;
        const fileData = validKeywords.join("\n");

        // 3. Create Task
        const response = this.arsenkinRepo.fetchTask(taskName, fileData, region, token);

        // 4. Save Task ID
        const taskId = response.data?.task_id || response.task_id; // Check API response structure
        if (taskId) {
            this.stateRepo.setProperty("LAST_TASK_ID", String(taskId));
            return { status: "STARTED", taskId: taskId, message: "Task started successfully" };
        } else {
            throw new Error("Failed to start task: " + JSON.stringify(response));
        }
    }

    checkLastTask(): any {
        const { token } = this.getSettings();
        const taskId = this.stateRepo.getProperty("LAST_TASK_ID");

        if (!taskId) return { status: "NO_ID", message: "No active task found" };

        const statusResp = this.arsenkinRepo.checkTaskStatus(Number(taskId), token);
        const statusId = statusResp.data?.status_id;

        if (statusId === 2) {
            // Complete! Fetch Result.
            const resultResp = this.arsenkinRepo.getTaskResult(Number(taskId), token);
            return { status: "FINISHED", data: resultResp };
        }

        return { status: "PROCESSING", progress: statusId };
    }
}
