import { SheetRepository } from "./repositories/SheetRepository";
import { ArsenkinRepository } from "./repositories/ArsenkinRepository";
import { ConfigRepository } from "./repositories/ConfigRepository";
import { StateRepository } from "./repositories/StateRepository";
import { CleanupService } from "./services/CleanupService";
import { ClusterService } from "./services/ClusterService";

import { createProjectMenu } from "./UI";
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

// Expose to Global Scope for GAS
(globalThis as any).onOpen = onOpen;
(globalThis as any).handleCreateStructure = handleCreateStructure;
(globalThis as any).handleRemoveDuplicates = handleRemoveDuplicates;
(globalThis as any).handleCollectNegatives = handleCollectNegatives;
(globalThis as any).handleTransferRawToClean = handleTransferRawToClean;
(globalThis as any).handleCleanKeysFromNegatives = handleCleanKeysFromNegatives;
(globalThis as any).handleRunClustering = handleRunClustering;
(globalThis as any).handleCheckLastTask = handleCheckLastTask;
(globalThis as any).handleSetArsenkinToken = handleSetArsenkinToken;


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
      sheetRepo.setData(configRepo.getSheetName("CLUSTERS"), csvData);
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
