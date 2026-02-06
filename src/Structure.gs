/**
 * Structure.gs
 * Contains the logic for managing the spreadsheet structure.
 */

/**
 * Deletes all existing sheets and creates the new structure.
 * This is a destructive operation.
 */
function createStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  // 1. Create a temporary sheet to ensure the spreadsheet is never empty
  // We use a timestamp to ensure uniqueness
  var tempSheetName = "Temp_Setup_" + new Date().getTime();
  var tempSheet = ss.insertSheet(tempSheetName);
  
  // 2. Delete ALL other sheets (including old "Intent Types" and "Raw Data")
  // This clears the workspace completely and avoids name collisions
  for (var i = 0; i < sheets.length; i++) {
    ss.deleteSheet(sheets[i]);
  }
  
  // 3. Create the new "Intent Types" sheet
  var intentSheet = ss.insertSheet(SHEETS.INTENT_TYPES);
  
  // Setup columns for "Intent Types"
  var headers = COLUMNS.INTENT_TYPES;
  intentSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  intentSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  intentSheet.setFrozenRows(1);
  protectHeaderRow(intentSheet);
  
  // 4. Create "Raw Data" sheet
  var rawDataSheet = ss.insertSheet(SHEETS.RAW_DATA);
  
  // Setup columns for "Raw Data"
  var rawHeaders = COLUMNS.RAW_DATA;
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight("bold");
  rawDataSheet.setFrozenRows(1);
  protectHeaderRow(rawDataSheet);
  
  // 5. Create "Clean Data" sheet
  var cleanDataSheet = ss.insertSheet(SHEETS.CLEAN_DATA);
  
  // Setup columns for "Clean Data"
  var cleanHeaders = COLUMNS.CLEAN_DATA;
  cleanDataSheet.getRange(1, 1, 1, cleanHeaders.length).setValues([cleanHeaders]);
  cleanDataSheet.getRange(1, 1, 1, cleanHeaders.length).setFontWeight("bold");
  cleanDataSheet.setFrozenRows(1);
  protectHeaderRow(cleanDataSheet);

  // 6. Delete the temporary sheet
  ss.deleteSheet(tempSheet);
  
  // 7. Ensure correct order and active sheet
  // Position "Intent Types" at index 1
  intentSheet.activate();
  ss.moveActiveSheet(1);
  
  // Position "Raw Data" at index 2
  rawDataSheet.activate();
  ss.moveActiveSheet(2);
  
  // Position "Clean Data" at index 3
  cleanDataSheet.activate();
  ss.moveActiveSheet(3);
  
  // Switch back to the main sheet
  intentSheet.activate();
  
  // Show success message
  ss.toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}

/**
 * Protects the first row (headers) of the given sheet.
 * Only the owner will be able to edit it.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to protect.
 */
function protectHeaderRow(sheet) {
  var protection = sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect();
  protection.setDescription('Protected Headers');
  
  // Remove all editors except the script owner/runner
  var me = Session.getEffectiveUser();
  protection.addEditor(me);
  protection.removeEditors(protection.getEditors());
  
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}
