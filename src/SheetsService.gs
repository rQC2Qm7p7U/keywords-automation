/**
 * SheetsService.gs
 * Handles all interactions with the SpreadsheetApp API.
 * Follows the infrastructure layer pattern.
 */

/**
 * Gets all data from a sheet, excluding the header row.
 *
 * @param {string} sheetName - The name of the sheet.
 * @return {Array<Array<string>>} The data values. Returns empty array if sheet not found or empty.
 */
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    console.warn("Sheet not found: " + sheetName);
    return [];
  }
  
  var lastRow = sheet.getLastRow();
  // If only header exists (1 row) or empty (0 rows), return empty
  if (lastRow <= 1) {
    return [];
  }
  
  var lastCol = sheet.getLastColumn();
  
  // Safety check to ensure we don't try to get a range with 0 columns
  if (lastCol === 0) {
    return [];
  }
  
  // Get range from row 2 to last row
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

/**
 * Overwrites the sheet data (preserving headers) with new data.
 *
 * @param {string} sheetName - The name of the sheet.
 * @param {Array<Array<string>>} data - The new data to write.
 */
function updateSheetData(sheetName, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error("Sheet not found: " + sheetName);
  }
  
  // 1. Clear existing content (from row 2 onwards)
  // We use max rows and columns to ensure everything is cleared
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();
  
  if (maxRows > 1) {
    // Clear everything below header
    sheet.getRange(2, 1, maxRows - 1, maxCols).clearContent();
  }
  
  // 2. Write new data
  if (data && data.length > 0) {
    // Check if we need to add rows
    var neededRows = data.length + 1; // +1 for header
    if (neededRows > maxRows) {
      sheet.insertRowsAfter(maxRows, neededRows - maxRows);
    }
    
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}
