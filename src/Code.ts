import { SheetRepository } from "./repositories/SheetRepository";
import { ArsenkinRepository } from "./repositories/ArsenkinRepository";
import { ConfigRepository } from "./repositories/ConfigRepository";
import { StateRepository } from "./repositories/StateRepository";
import { CleanupService } from "./services/CleanupService";
import { ClusterService } from "./services/ClusterService";
import { AdsDataService } from "./services/AdsDataService";

import { createProjectMenu, handleOpenSidebar } from "./UI";
import { createStructure } from "./Structure";
import { CONFIG, SHEETS } from "./Config";
import { MESSAGES } from "./Messages";

// --- Lock Helper ---
// Wraps a callback in a DocumentLock to prevent concurrent writes.
// Timeout: 15s — enough for batch operations, prevents indefinite waits.
const LOCK_TIMEOUT_MS = 15000;

function withLock<T>(fn: () => T): T {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new Error("Операция заблокирована: другой пользователь сейчас работает с таблицей. Попробуйте через несколько секунд.");
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

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
    withLock(() => createStructure());
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
  handlePrepareAdsData,
  handleFormatAdsData,
  handleTransferClustersToAdsData
};

import { prepareAdsData } from "./controllers/SidebarController";

function handlePrepareAdsData() {
  prepareAdsData();
}

/**
 * 8. Format Ads Data (CamelCase + Abbreviations)
 */
function handleFormatAdsData() {
  withLock(() => {
    const adsService = new AdsDataService(sheetRepo);
    const msg = adsService.formatAdsData();
    SpreadsheetApp.getActiveSpreadsheet().toast(msg);
  });
}

/**
 * 9. Transfer Clusters -> Ads Data
 */
function handleTransferClustersToAdsData() {
  try {
    withLock(() => {
      const adsService = new AdsDataService(sheetRepo);
      const msg = adsService.transferClustersToAdsData();
      SpreadsheetApp.getActiveSpreadsheet().toast(msg);
    });
  } catch (e: any) {
    SpreadsheetApp.getUi().alert("Error", e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}


// 2. Remove Duplicates
function handleRemoveDuplicates() {
  withLock(() => {
    const raw = cleanupService.removeDuplicates(SHEETS.RAW_DATA);
    const clean = cleanupService.removeDuplicates(SHEETS.CLEAN_DATA);

    let msg: string;
    if (raw.removed === 0 && clean.removed === 0) {
      msg = MESSAGES.SUCCESS.NO_DUPLICATES
        .replace("{0}", String(raw.remaining))
        .replace("{1}", String(clean.remaining));
    } else {
      msg = MESSAGES.SUCCESS.DUPLICATES_REMOVED
        .replace("{0}", String(raw.removed))
        .replace("{1}", String(clean.removed))
        .replace("{2}", String(raw.remaining))
        .replace("{3}", String(clean.remaining));
    }
    SpreadsheetApp.getActiveSpreadsheet().toast(msg);
  });
}

// 3. Collect Negatives
function handleCollectNegatives() {
  withLock(() => {
    const stats = cleanupService.collectNegativeKeywords();
    const newCount = stats.fromRaw + stats.fromClean + stats.fromClusters;
    const parts = [
      `Минус-слова собраны: ${stats.total} уникальных`,
    ];
    if (newCount > 0) {
      parts.push(`Новых: ${newCount} (Raw: ${stats.fromRaw}, Clean: ${stats.fromClean}, Clusters: ${stats.fromClusters})`);
    }
    if (stats.existing > 0) {
      parts.push(`Уже были в Intent Types: ${stats.existing}`);
    }
    if (newCount === 0) {
      parts.push("Новых минус-слов не найдено.");
    }
    SpreadsheetApp.getActiveSpreadsheet().toast(parts.join("\n"));
  });
}

// 4. Transfer Raw -> Clean
function handleTransferRawToClean() {
  withLock(() => {
    const count = cleanupService.transferRawToClean();
    SpreadsheetApp.getActiveSpreadsheet().toast(`Transferred ${count} rows.`);
  });
}

// 5. Clean Keys
function handleCleanKeysFromNegatives() {
  withLock(() => {
    const { cleanRemoved, clustersRemoved } = cleanupService.cleanKeysFromNegatives();
    SpreadsheetApp.getActiveSpreadsheet().toast(`Removed negatives: ${cleanRemoved} from Clean, ${clustersRemoved} from Clusters.`);
  });
}

// 6. Run Clustering
function handleRunClustering() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Start Clustering?', 'This will send data to Arsenkin.ru. Continue?', ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    try {
      withLock(() => {
        const result = clusterService.runClustering();
        ui.alert('Task Started', `ID: ${result.taskId}\nMsg: ${result.message}`, ui.ButtonSet.OK);
      });
    } catch (e: any) {
      ui.alert('Error', e.message, ui.ButtonSet.OK);
    }
  }
}

// 7. Check Task
function handleCheckLastTask() {
  const ui = SpreadsheetApp.getUi();
  try {
    withLock(() => {
      const result = clusterService.checkLastTask();

      if (result.status === "FINISHED") {
        const processResult = clusterService.processTaskResult(result.data);
        ui.alert(processResult.success ? "Success" : "Info", processResult.message, ui.ButtonSet.OK);
      } else {
        ui.alert("Status", `Current Status: ${result.status} (Progress: ${result.progress || '?'})`, ui.ButtonSet.OK);
      }
    });
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

/**
 * 9. onEdit Trigger for Ads Data Formatting
 * Automatically formats pasted/edited text in Ads Data sheet.
 */
function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() === SHEETS.ADS_DATA) {
    const adsService = new AdsDataService(sheetRepo);
    // Wrap in try-catch to prevent silent failures disrupting the user significantly
    // though simple triggers fail silently anyway.
    try {
      adsService.processRange(e.range);
    } catch (err) {
      console.error("onEdit Error in AdsDataService:", err);
    }
  }
}
