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
  
  // 4. Create "Raw Data" sheet
  var rawDataSheet = ss.insertSheet(SHEETS.RAW_DATA);
  
  // Setup columns for "Raw Data"
  var rawHeaders = COLUMNS.RAW_DATA;
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight("bold");
  rawDataSheet.setFrozenRows(1);

  // 5. Delete the temporary sheet
  ss.deleteSheet(tempSheet);
  
  // 6. Ensure correct order and active sheet
  // Position "Intent Types" at index 1
  intentSheet.activate();
  ss.moveActiveSheet(1);
  
  // Position "Raw Data" at index 2
  rawDataSheet.activate();
  ss.moveActiveSheet(2);
  
  // Switch back to the main sheet
  intentSheet.activate();
  
  // Show success message
  ss.toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}
