/**
 * UI.gs
 * Handles all User Interface interactions, menus, and dialogs.
 */

/**
 * Creates the custom menu when the spreadsheet opens.
 * Called from Code.gs onOpen.
 */
function createProjectMenu() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu(MENU.TITLE);
  
  MENU.ITEMS.forEach(item => {
    menu.addItem(item.caption, item.functionName);
  });
  
  menu.addToUi();
}

/**
 * Handles the "Create Structure" menu item click.
 * Shows a confirmation dialog before proceeding.
 */
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

/**
 * Handles the "Remove Duplicates" menu item click.
 * Processes "Raw Data" and "Clean Data" sheets.
 */
function handleRemoveDuplicates() {
  try {
    // 1. Process Raw Data
    const rawData = getSheetData(SHEETS.RAW_DATA);
    const rawResult = removeDuplicates(rawData);
    
    if (rawResult.removedCount > 0) {
      updateSheetData(SHEETS.RAW_DATA, rawResult.uniqueData);
    }
    
    // 2. Process Clean Data
    const cleanData = getSheetData(SHEETS.CLEAN_DATA);
    const cleanResult = removeDuplicates(cleanData);
    
    if (cleanResult.removedCount > 0) {
      updateSheetData(SHEETS.CLEAN_DATA, cleanResult.uniqueData);
    }
    
    // 3. Show Result
    const msg = MESSAGES.SUCCESS.DUPLICATES_REMOVED
      .replace("{0}", rawResult.removedCount)
      .replace("{1}", cleanResult.removedCount);
      
    SpreadsheetApp.getActiveSpreadsheet().toast(msg);
    
  } catch (e) {
    const ui = SpreadsheetApp.getUi();
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
    const count = collectNegativeKeywords();
    SpreadsheetApp.getActiveSpreadsheet().toast(`Собрано минус-слов: ${count}`);
  } catch (e) {
    const ui = SpreadsheetApp.getUi();
    ui.alert("Ошибка: " + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Transfer Raw -> Clean" menu item click.
 */
function handleTransferRawToClean() {
  try {
    const count = transferRawToClean();
    SpreadsheetApp.getActiveSpreadsheet().toast(`Перенесено строк: ${count}`);
  } catch (e) {
    const ui = SpreadsheetApp.getUi();
    ui.alert("Ошибка: " + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Clean Keys from Negatives" menu item click.
 */
function handleCleanKeysFromNegatives() {
  try {
    const count = cleanKeysFromNegatives();
    SpreadsheetApp.getActiveSpreadsheet().toast(`Удалено ключей: ${count}`);
  } catch (e) {
    const ui = SpreadsheetApp.getUi();
    ui.alert("Ошибка: " + e.message);
    console.error(e);
  }
}

/**
 * Handles the "Run Clustering" menu item.
 */
function handleRunClustering() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (typeof runClustering !== 'function') {
      throw new Error("Функция runClustering не найдена.");
    }
    
    // Initial Run
    let result = runClustering(false);
    
    // Check for Confirmation needed
    if (result && result.status === "WAITING_CONFIRMATION") {
      const response = ui.alert(
        "Внимание", 
        `${result.message} Продолжить?`, 
        ui.ButtonSet.YES_NO
      );
      
      if (response == ui.Button.YES) {
        result = runClustering(true);
      } else {
        return; // Cancelled
      }
    }
    
    // Handle Final Results
    if (result && result.status === "SUCCESS") {
       ui.alert("Успешно", "Готово! Результаты в листе Clusters.", ui.ButtonSet.OK);
    } else if (result && result.status === "TIMEOUT") {
       ui.alert("Тайм-аут", result.message, ui.ButtonSet.OK);
    }

  } catch (e) {
    console.error(e);
    ui.alert("Ошибка при запуске кластеризации: " + e.message);
  }
}

/**
 * Handles the "Check Last Task" menu item.
 */
function handleCheckLastTask() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (typeof manuallyCheckLastTask !== 'function') {
      throw new Error("Функция manuallyCheckLastTask не найдена.");
    }
    
    const result = manuallyCheckLastTask();
    
    if (result) {
      if (result.status === "SUCCESS") {
        ui.alert("Успешно", result.message, ui.ButtonSet.OK);
      } else if (result.status === "PROCESSING") {
        ui.alert("Статус", result.message, ui.ButtonSet.OK);
      } else {
         ui.alert("Результат", result.message, ui.ButtonSet.OK);
      }
    }
    
  } catch (e) {
    console.error(e);
    ui.alert("Ошибка: " + e.message);
  }
}

/**
 * Handles the "Set Arsenkin Token" menu item.
 * Prompts user for token and saves it securely.
 */
function handleSetArsenkinToken() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    "Установка API токена",
    "Введите ваш API токен от Arsenkin Tools:",
    ui.ButtonSet.OK_CANCEL
  );

  const button = result.getSelectedButton();
  const text = result.getResponseText();

  if (button == ui.Button.OK) {
    try {
      setApiToken(text);
      ui.alert("Токен успешно сохранен в PropertiesService.");
    } catch (e) {
      ui.alert("Ошибка при сохранении токена: " + e.message);
    }
  }
}
