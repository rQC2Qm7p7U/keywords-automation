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

        const settingsSheetName = this.configRepo.getSheetName("SETTINGS");
        const data = this.sheetRepo.getData(settingsSheetName); // Assumes [[A1, B1], [A2, B2]...]

        // Helper to find value by Key (Col A)
        const getValue = (key: string): string => {
            const row = data.find(r => r[0] === key);
            return row ? String(row[1]) : "";
        };

        const regionName = getValue("Region");

        const regionsSheet = this.configRepo.getSheetName("REGIONS");
        const regions = this.sheetRepo.getData(regionsSheet);
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

    processTaskResult(csvDataString: string): { success: boolean, message: string } {
        const csvData = Utilities.parseCsv(csvDataString);
        if (csvData.length === 0) {
            return { success: false, message: "Received CSV is empty" };
        }

        // Skip header row if present
        const csvRows = csvData.length > 1 ? csvData.slice(1) : [];

        if (csvRows.length === 0) {
            return { success: false, message: "Received CSV contains no data rows." };
        }

        const clustersSheetName = this.configRepo.getSheetName("CLUSTERS");
        const clustersMapper = this.sheetRepo.getMapper(clustersSheetName);

        const dataToWrite = csvRows.map(row => {
            const obj: Record<string, any> = {};

            // Map CSV columns to Sheet Column Names (defined in Config.ts)
            // We rely on Arsenkin CSV structure being stable.
            obj["Keyword"] = row[0];            // Поисковые запросы
            obj["Group name"] = row[1];         // Название группы
            obj["Phrases in group"] = row[2];   // Фраз в группе
            obj["% Aggregators"] = row[3];      // % Агрегаторов
            obj["Main pages"] = row[4];         // Главных страниц
            obj["Toponym in query"] = row[5];   // Топоним в запросе
            obj["URLs group"] = row[6];         // URLs группы

            // Inject Negative
            obj["Negative"] = "";

            return clustersMapper.toArray(obj);
        });

        this.sheetRepo.setData(clustersSheetName, dataToWrite);
        return { success: true, message: "Clustering results saved to 'Clusters' sheet." };
    }
}
