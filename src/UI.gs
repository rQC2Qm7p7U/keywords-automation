/**
 * UI.gs
 * Handles all User Interface interactions, menus, and dialogs.
 */

/**
 * Creates the custom menu when the spreadsheet opens.
 */
function onOpen() {
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

