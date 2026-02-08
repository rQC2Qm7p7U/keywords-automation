import { SheetRepository } from "./repositories/SheetRepository";
import { ArsenkinRepository } from "./repositories/ArsenkinRepository";
import { ConfigRepository } from "./repositories/ConfigRepository";
import { StateRepository } from "./repositories/StateRepository";
import { CleanupService } from "./services/CleanupService";
import { ClusterService } from "./services/ClusterService";

import { createProjectMenu, handleOpenSidebar } from "./UI";
import { createStructure } from "./Structure";
import { CONFIG, SHEETS } from "./Config";
import { MESSAGES } from "./Messages";

// --- Composition Root ---
const sheetRepo = new SheetRepository();
const arsenkinRepo = new ArsenkinRepository();
const configRepo = new ConfigRepository();
const stateRepo = new StateRepository();

const cleanupService = new CleanupService(sheetRepo, configRepo);
const clusterService = new ClusterService(arsenkinRepo, sheetRepo, configRepo, stateRepo);

// --- Menu Functions (Exposed Globals) ---

// Trigger
function onOpen(e: GoogleAppsScript.Events.SheetsOnOpen) {
  createProjectMenu();
}

// 1. Create Structure
function handleCreateStructure() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    MESSAGES.UI.TITLE_WARNING,
    MESSAGES.WARNINGS.CREATE_STRUCTURE,
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    createStructure();
  }
}

import { getSettings, saveSettings, getRegions } from "./controllers/SidebarController";

// Export functions for the library bundle
export {
  onOpen,
  handleOpenSidebar,
  handleCreateStructure,
  handleRemoveDuplicates,
  handleCollectNegatives,
  handleTransferRawToClean,
  handleCleanKeysFromNegatives,
  handleRunClustering,
  handleCheckLastTask,
  handleSetArsenkinToken,
  saveSettings,
  getRegions,
  handlePrepareAdsData
};

import { prepareAdsData } from "./controllers/SidebarController";

function handlePrepareAdsData() {
  prepareAdsData();
}


// 2. Remove Duplicates
function handleRemoveDuplicates() {
  const removedRaw = cleanupService.removeDuplicates(SHEETS.RAW_DATA);
  const removedClean = cleanupService.removeDuplicates(SHEETS.CLEAN_DATA);

  const msg = MESSAGES.SUCCESS.DUPLICATES_REMOVED
    .replace("{0}", String(removedRaw))
    .replace("{1}", String(removedClean));
  SpreadsheetApp.getActiveSpreadsheet().toast(msg);
}

// 3. Collect Negatives
function handleCollectNegatives() {
  const count = cleanupService.collectNegativeKeywords();
  SpreadsheetApp.getActiveSpreadsheet().toast(`Completed. Unique negatives: ${count}`);
}

// 4. Transfer Raw -> Clean
function handleTransferRawToClean() {
  const count = cleanupService.transferRawToClean();
  SpreadsheetApp.getActiveSpreadsheet().toast(`Transferred ${count} rows.`);
}

// 5. Clean Keys
function handleCleanKeysFromNegatives() {
  const removed = cleanupService.cleanKeysFromNegatives();
  SpreadsheetApp.getActiveSpreadsheet().toast(`Removed ${removed} rows containing negatives.`);
}

// 6. Run Clustering
function handleRunClustering() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Start Clustering?', 'This will send data to Arsenkin.ru. Continue?', ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    try {
      const result = clusterService.runClustering();
      ui.alert('Task Started', `ID: ${result.taskId}\nMsg: ${result.message}`, ui.ButtonSet.OK);
    } catch (e: any) {
      ui.alert('Error', e.message, ui.ButtonSet.OK);
    }
  }
}

// 7. Check Task
function handleCheckLastTask() {
  const ui = SpreadsheetApp.getUi();
  try {
    const result = clusterService.checkLastTask();

    if (result.status === "FINISHED") {
      const csvData = Utilities.parseCsv(result.data);
      if (csvData.length > 0) {
        let dataToWrite: any[][] = [];

        // Arsenkin CSV Headers (Assumed based on previous hardcoding analysis)
        // 0: Keyword (Поисковые запросы)
        // 1: Group (Название группы)
        // 2: Phrases (Фраз в группе)
        // 3: % Agg (Агрегаторов)
        // 4: Main Pages (Главных страниц)
        // 5: Toponym (Топоним в запросе)
        // 6: URLs (URLs группы)

        // Skip header row if present (Arsenkin usually returns headers)
        const csvRows = csvData.length > 1 ? csvData.slice(1) : [];

        if (csvRows.length > 0) {
          const clustersMapper = sheetRepo.getMapper(configRepo.getSheetName("CLUSTERS"));

          dataToWrite = csvRows.map(row => {
            const obj: Record<string, any> = {};

            // Map CSV columns to Sheet Column Names (defined in Config.ts)
            // We rely on Arsenkin CSV structure being stable.
            // CSV col 0 (Поисковые запросы) -> Sheet "Keyword"
            obj["Keyword"] = row[0];
            // CSV col 1 (Название группы) -> Sheet "Group name"
            obj["Group name"] = row[1];
            // CSV col 2 (Фраз в группе) -> Sheet "Phrases in group"
            obj["Phrases in group"] = row[2];
            // CSV col 3 (% Агрегаторов) -> Sheet "% Aggregators"
            obj["% Aggregators"] = row[3];
            // CSV col 4 (Главных страниц) -> Sheet "Main pages"
            obj["Main pages"] = row[4];
            // CSV col 5 (Топоним в запросе) -> Sheet "Toponym in query"
            obj["Toponym in query"] = row[5];
            // CSV col 6 (URLs группы) -> Sheet "URLs group"
            obj["URLs group"] = row[6];

            // Inject Negative
            obj["Negative"] = "";

            return clustersMapper.toArray(obj);
          });

          sheetRepo.setData(configRepo.getSheetName("CLUSTERS"), dataToWrite);
        } else {
          // Only headers in CSV?
          ui.alert("Info", "Received CSV contains no data rows.", ui.ButtonSet.OK);
        }
      }
      ui.alert("Success", "Clustering results saved to 'Clusters' sheet.", ui.ButtonSet.OK);
    } else {
      ui.alert("Status", `Current Status: ${result.status} (Progress: ${result.progress || '?'})`, ui.ButtonSet.OK);
    }
  } catch (e: any) {
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}

// 8. Set Token
function handleSetArsenkinToken() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt("Enter Arsenkin API Token:");
  if (result.getSelectedButton() == ui.Button.OK) {
    // Save to Settings Sheet (Col B, Row 2 - hardcoded for now or use Repo lookup logic)
    // Structure.ts defines "API Token Status" in Row 9 (index 8).
    // Wait, ClusterService reads value from B2. Structure.ts says B2 is Search Engine.
    // ClusterService: `const apiKey = values[0]; // B2`
    // Settings Rows in Structure.ts:
    // Row 2: Search Engine
    // Row 3: Region Search
    // Row 4: Region
    // ...
    // Row 9: API Token Status (Value "Not Set")
    //
    // Where is the ACTUAL token?
    // ArsenkinClusters.ts (legacy) used getRange("B2").getValue();
    // But Structure.ts seems to have remapped B2 to Search Engine.
    // This is a Logic Mismatch between Legacy Service Logic and New Structure.
    // I should save it to PropertiesService (StateRepo) for security, AND maybe update Status in Sheet.
    // ClusterService `getSettings` tried to read from Sheet B2.
    // Best practice: Store Token in ScriptProperties (StateRepo).
    // Update ClusterService to read from StateRepo.

    const token = result.getResponseText();
    stateRepo.setProperty("ARSENKIN_API_TOKEN", token);

    // Update Status in Sheet
    // We can find "API Token Status" row?
    // Using simple hardcoded write to B9 for now if we assume Structure.ts order.
    // Or just Toast.
    ui.alert("Token saved securely in Script Properties.");
  }
}
