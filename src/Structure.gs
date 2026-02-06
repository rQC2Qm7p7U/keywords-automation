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
  
  // 3. Delete all old sheets
  // We do this loop carefully because we can't delete the only sheet in a spreadsheet.
  // Since we already created 'Intent Types', we can safely delete the others.
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    // Just in case the new sheet has the same name as an old one (though insertSheet usually handles this by appending a number, 
    // but here we want to ensure we keep the NEW one we just made).
    // Actually, simple logic: delete everything that is NOT the intentSheet we just created.
    if (sheet.getSheetId() !== intentSheet.getSheetId()) {
      ss.deleteSheet(sheet);
    }
  }
  
  // 4. Ensure "Intent Types" is at the first position
  ss.setActiveSheet(intentSheet);
  ss.moveActiveSheet(1);
  
  // Show success message
  SpreadsheetApp.getActiveSpreadsheet().toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}
