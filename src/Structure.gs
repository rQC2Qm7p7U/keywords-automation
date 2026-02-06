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
  
  // 1. Create the new "Intent Types" sheet first
  var intentSheet = ss.insertSheet(SHEETS.INTENT_TYPES);
  
  // 2. Setup columns for "Intent Types"
  var headers = COLUMNS.INTENT_TYPES;
  intentSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers (bold, frozen)
  intentSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  intentSheet.setFrozenRows(1);
  
  // 3. Create "Raw Data" sheet
  var rawDataSheet = ss.insertSheet(SHEETS.RAW_DATA, 1); // Index 1 is the second position (0-indexed)
  
  // 4. Setup columns for "Raw Data"
  var rawHeaders = COLUMNS.RAW_DATA;
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  
  // Format headers for Raw Data
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight("bold");
  rawDataSheet.setFrozenRows(1);

  // 5. Delete all old sheets
  // We do this loop carefully because we can't delete the only sheet in a spreadsheet.
  // Since we already created 'Intent Types' and 'Raw Data', we can safely delete the others.
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    // Delete everything that is NOT the new sheets we just created.
    if (sheet.getSheetId() !== intentSheet.getSheetId() && sheet.getSheetId() !== rawDataSheet.getSheetId()) {
      ss.deleteSheet(sheet);
    }
  }
  
  // 6. Ensure "Intent Types" is at the first position and Active
  ss.setActiveSheet(intentSheet);
  ss.moveActiveSheet(1);
  
  // Ensure "Raw Data" is at the second position
  // (It should already be there due to insertion at index 1, but this ensures it)
  rawDataSheet.activate();
  ss.moveActiveSheet(2);
  
  // Switch back to the main sheet
  ss.setActiveSheet(intentSheet);
  
  // Show success message
  
  // Show success message
  SpreadsheetApp.getActiveSpreadsheet().toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}
