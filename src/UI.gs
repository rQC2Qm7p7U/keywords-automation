/**
 * UI.gs
 * Handles all User Interface interactions, menus, and dialogs.
 */

/**
 * Creates the custom menu when the spreadsheet opens.
 * Called from Code.gs onOpen.
 */
function createProjectMenu() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu(MENU.TITLE);
  
  MENU.ITEMS.forEach(function(item) {
    menu.addItem(item.caption, item.functionName);
  });
  
  menu.addToUi();
}

/**
 * Handles the "Create Structure" menu item click.
 * Shows a confirmation dialog before proceeding.
 */
function handleCreateStructure() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert(
    MESSAGES.UI.TITLE_WARNING,
    MESSAGES.WARNINGS.CREATE_STRUCTURE,
    ui.ButtonSet.YES_NO
  );
  
  if (response == ui.Button.YES) {
    createStructure();
  } else {
    // User clicked No or X
    // Do nothing
  }
}

/**
 * Handles the "Remove Duplicates" menu item click.
 * Processes "Raw Data" and "Clean Data" sheets.
 */
function handleRemoveDuplicates() {
  try {
    // 1. Process Raw Data
    var rawData = getSheetData(SHEETS.RAW_DATA);
    var rawResult = removeDuplicates(rawData);
    
    if (rawResult.removedCount > 0) {
      updateSheetData(SHEETS.RAW_DATA, rawResult.uniqueData);
    }
    
    // 2. Process Clean Data
    var cleanData = getSheetData(SHEETS.CLEAN_DATA);
    var cleanResult = removeDuplicates(cleanData);
    
    if (cleanResult.removedCount > 0) {
      updateSheetData(SHEETS.CLEAN_DATA, cleanResult.uniqueData);
    }
    
    // 3. Show Result
    var msg = MESSAGES.SUCCESS.DUPLICATES_REMOVED
      .replace("{0}", rawResult.removedCount)
      .replace("{1}", cleanResult.removedCount);
      
    SpreadsheetApp.getActiveSpreadsheet().toast(msg);
    
  } catch (e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert(MESSAGES.ERRORS.GENERAL + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Collect Negatives" menu item click.
 * Collects negatives from Raw/Clean data and updates Intent Types.
 */
function handleCollectNegatives() {
  try {
    var count = collectNegativeKeywords();
    SpreadsheetApp.getActiveSpreadsheet().toast("Собрано минус-слов: " + count);
  } catch (e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert("Ошибка: " + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Transfer Raw -> Clean" menu item click.
 */
function handleTransferRawToClean() {
  try {
    var count = transferRawToClean();
    SpreadsheetApp.getActiveSpreadsheet().toast("Перенесено строк: " + count);
  } catch (e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert("Ошибка: " + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Clean Keys from Negatives" menu item click.
 */
function handleCleanKeysFromNegatives() {
  try {
    var count = cleanKeysFromNegatives();
    SpreadsheetApp.getActiveSpreadsheet().toast("Удалено ключей: " + count);
  } catch (e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert("Ошибка: " + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Run Clustering" menu item.
 */
function handleRunClustering() {
  try {
    if (typeof runClustering === 'function') {
      runClustering();
    } else {
      throw new Error("Функция runClustering не найдена.");
    }
  } catch (e) {
    console.error(e);
    SpreadsheetApp.getUi().alert("Ошибка при запуске кластеризации: " + e.message);
  }
}

/**
 * Handles the "Set Arsenkin Token" menu item.
 * Prompts user for token and saves it securely.
 */
function handleSetArsenkinToken() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    "Установка API токена",
    "Введите ваш API токен от Arsenkin Tools:",
    ui.ButtonSet.OK_CANCEL
  );

  var button = result.getSelectedButton();
  var text = result.getResponseText();

  if (button == ui.Button.OK) {
    try {
      setApiToken(text);
      ui.alert("Токен успешно сохранен в PropertiesService.");
    } catch (e) {
      ui.alert("Ошибка при сохранении токена: " + e.message);
    }
  }
}
