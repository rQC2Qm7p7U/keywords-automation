import { SheetRepository } from "./repositories/SheetRepository";
import { ArsenkinRepository } from "./repositories/ArsenkinRepository";
import { ConfigRepository } from "./repositories/ConfigRepository";
import { StateRepository } from "./repositories/StateRepository";
import { CleanupService } from "./services/CleanupService";
import { ClusterService } from "./services/ClusterService";
import { AdsDataService } from "./services/AdsDataService";
import { getSettings, saveSettings, getRegions, prepareAdsData } from "./controllers/SidebarController";
import { createProjectMenu, handleOpenSidebar } from "./UI";
import { createStructure } from "./Structure";
import { SHEETS } from "./Config";
import { MESSAGES } from "./Messages";

// --- Lock Helper ---
// Wraps a callback in a DocumentLock to prevent concurrent writes.
const LOCK_TIMEOUT_MS = 15000;

function withLock<T>(fn: () => T): T {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new Error(MESSAGES.ERRORS.LOCK_BUSY);
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
      MESSAGES.SUCCESS.NEGATIVES_COLLECTED.replace("{0}", String(stats.total)),
    ];
    if (newCount > 0) {
      parts.push(MESSAGES.SUCCESS.NEGATIVES_NEW
        .replace("{0}", String(newCount))
        .replace("{1}", String(stats.fromRaw))
        .replace("{2}", String(stats.fromClean))
        .replace("{3}", String(stats.fromClusters)));
    }
    if (stats.existing > 0) {
      parts.push(MESSAGES.SUCCESS.NEGATIVES_EXISTING.replace("{0}", String(stats.existing)));
    }
    if (newCount === 0) {
      parts.push(MESSAGES.SUCCESS.NEGATIVES_NONE_NEW);
    }
    SpreadsheetApp.getActiveSpreadsheet().toast(parts.join("\n"));
  });
}

// 4. Transfer Raw -> Clean
function handleTransferRawToClean() {
  withLock(() => {
    const count = cleanupService.transferRawToClean();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      MESSAGES.SUCCESS.TRANSFER_COMPLETE.replace("{0}", String(count))
    );
  });
}

// 5. Clean Keys from Negatives
function handleCleanKeysFromNegatives() {
  withLock(() => {
    const { cleanRemoved, clustersRemoved } = cleanupService.cleanKeysFromNegatives();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      MESSAGES.SUCCESS.NEGATIVES_CLEANED
        .replace("{0}", String(cleanRemoved))
        .replace("{1}", String(clustersRemoved))
    );
  });
}

// 6. Run Clustering
function handleRunClustering() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    MESSAGES.UI.TITLE_CLUSTERING,
    MESSAGES.UI.CONFIRM_CLUSTERING,
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    try {
      withLock(() => {
        const result = clusterService.runClustering();
        ui.alert(
          MESSAGES.UI.TITLE_SUCCESS,
          MESSAGES.SUCCESS.TASK_STARTED
            .replace("{0}", String(result.taskId))
            .replace("{1}", result.message),
          ui.ButtonSet.OK
        );
      });
    } catch (e: any) {
      ui.alert(MESSAGES.UI.TITLE_ERROR, e.message, ui.ButtonSet.OK);
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
        ui.alert(
          processResult.success ? MESSAGES.UI.TITLE_SUCCESS : MESSAGES.UI.TITLE_STATUS,
          processResult.message,
          ui.ButtonSet.OK
        );
      } else {
        ui.alert(
          MESSAGES.UI.TITLE_STATUS,
          MESSAGES.SUCCESS.TASK_STATUS
            .replace("{0}", result.status)
            .replace("{1}", result.progress || "?"),
          ui.ButtonSet.OK
        );
      }
    });
  } catch (e: any) {
    ui.alert(MESSAGES.UI.TITLE_ERROR, e.message, ui.ButtonSet.OK);
  }
}

// 8. Set Arsenkin Token
function handleSetArsenkinToken() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(MESSAGES.UI.TITLE_TOKEN);
  if (result.getSelectedButton() == ui.Button.OK) {
    const token = result.getResponseText();
    stateRepo.setProperty("ARSENKIN_API_TOKEN", token);
    ui.alert(MESSAGES.UI.TOKEN_SAVED);
  }
}

// 9. Prepare Ads Data (from sidebar)
function handlePrepareAdsData() {
  prepareAdsData();
}

// 10. Format Ads Data (CamelCase + Abbreviations)
function handleFormatAdsData() {
  withLock(() => {
    const adsService = new AdsDataService(sheetRepo);
    const msg = adsService.formatAdsData();
    SpreadsheetApp.getActiveSpreadsheet().toast(msg);
  });
}

// 11. Transfer Clusters -> Ads Data
function handleTransferClustersToAdsData() {
  try {
    withLock(() => {
      const adsService = new AdsDataService(sheetRepo);
      const msg = adsService.transferClustersToAdsData();
      SpreadsheetApp.getActiveSpreadsheet().toast(msg);
    });
  } catch (e: any) {
    SpreadsheetApp.getUi().alert(MESSAGES.UI.TITLE_ERROR, e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// 12. onEdit Trigger — auto-formats Ads Data edits
function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() === SHEETS.ADS_DATA) {
    const adsService = new AdsDataService(sheetRepo);
    try {
      adsService.processRange(e.range);
    } catch (err) {
      console.error("[Main] onEdit Error:", err);
    }
  }
}

// --- Exports ---
export {
  onOpen,
  onEdit,
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

