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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    console.warn(`Sheet not found: ${sheetName}`);
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  // If only header exists (1 row) or empty (0 rows), return empty
  if (lastRow <= 1) {
    return [];
  }
  
  const lastCol = sheet.getLastColumn();
  
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  
  // 1. Clear existing content (from row 2 onwards)
  // We use max rows and columns to ensure everything is cleared
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  
  if (maxRows > 1) {
    // Clear everything below header
    sheet.getRange(2, 1, maxRows - 1, maxCols).clearContent();
  }
  
  // 2. Write new data
  if (data && data.length > 0) {
    // Check if we need to add rows
    const neededRows = data.length + 1; // +1 for header
    if (neededRows > maxRows) {
      sheet.insertRowsAfter(maxRows, neededRows - maxRows);
    }
    
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * Clears the background color of a specific column by name.
 * Looks up the column index from the sheet's configuration.
 *
 * @param {string} sheetName - The name of the sheet.
 * @param {string} colName - The name of the column header.
 */
function clearColumnBackgroundByName(sheetName, colName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return;
  
  const colIndex = getColumnIndex(sheetName, colName);
  if (colIndex === -1) return;
  
  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    // Column index + 1 for 1-based index
    sheet.getRange(2, colIndex + 1, maxRows - 1, 1).setBackground(null);
  }
}

/**
 * Gets the 0-based index of a column by name from the configuration.
 * 
 * @param {string} sheetName - Name of the sheet.
 * @param {string} colName - Name of the column.
 * @return {number} 0-based index or -1 if not found.
 */
function getColumnIndex(sheetName, colName) {
  let cols = null;
  if (sheetName === SHEETS.RAW_DATA) cols = COLUMNS.RAW_DATA;
  else if (sheetName === SHEETS.CLEAN_DATA) cols = COLUMNS.CLEAN_DATA;
  else if (sheetName === SHEETS.INTENT_TYPES) cols = COLUMNS.INTENT_TYPES;
  else if (sheetName === SHEETS.CLUSTERS) cols = COLUMNS.CLUSTERS;
  else if (sheetName === SHEETS.SETTINGS) cols = COLUMNS.SETTINGS;
  
  if (!cols) return -1;
  return cols.indexOf(colName);
}

/**
 * Gets values from a specific column, excluding header.
 * Optimized to read only required data.
 * 
 * @param {string} sheetName
 * @param {string} colName
 * @return {Array<any>} 1D array of values.
 */
function getColumnValues(sheetName, colName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const colIndex = getColumnIndex(sheetName, colName);
  if (colIndex === -1) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  // Get 2D array and flatten
  return sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues().map(r => r[0]);
}

/**
 * Sets values for a specific column, starting from row 2.
 * 
 * @param {string} sheetName
 * @param {string} colName
 * @param {Array<any>} values - 1D array of values.
 */
function setColumnValues(sheetName, colName, values) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  
  const colIndex = getColumnIndex(sheetName, colName);
  if (colIndex === -1) throw new Error(`Column not found: ${colName}`);
  
  if (!values || values.length === 0) return;
  
  // Check rows
  const maxRows = sheet.getMaxRows();
  const neededRows = values.length + 1;
  if (neededRows > maxRows) {
    sheet.insertRowsAfter(maxRows, neededRows - maxRows);
  }
  
  // Transform 1D to 2D
  const output = values.map(v => [v]);
  
  sheet.getRange(2, colIndex + 1, output.length, 1).setValues(output);
}
