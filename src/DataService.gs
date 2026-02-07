/**
 * DataService.gs
 * Domain logic for data migration and formatting.
 * Handles parsing, formatting, and mathematical operations on data values.
 */

/**
 * Parses a numeric value from a string, handling various formats.
 * Prioritizes comma as decimal separator (European/Russian format).
 * @param {string|number} value - The input value to parse.
 * @return {number} The parsed number, or 0 if invalid.
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === 'number') return value;
  
  let str = String(value).trim();
  
  // Optimize: remove spaces (thousand separators)
  str = str.replace(/\s+/g, '');
  
  // Handle comma as decimal separator (common in RU/EU)
  // Logic: If both . and , exist, the last one is likely the decimal.
  // But for this specific project context (User provided examples like "1 000,50"), comma is decimal.
  
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.000,50 -> Remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,000.50 -> Remove commas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
     // Only comma -> Replace with dot
     str = str.replace(',', '.');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Transfers data from Raw Data to Clean Data and formats both sheets.
 * Optimized to reduce sheet rewrites.
 * @return {number} The number of rows transferred.
 */
function transferRawToClean() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName(SHEETS.RAW_DATA);
  const cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!rawSheet || !cleanSheet) {
    throw new Error("One or more sheets not found.");
  }
  
  // 1. Get Raw Data
  const rawData = getSheetData(SHEETS.RAW_DATA);
  if (!rawData || rawData.length === 0) {
    return 0;
  }
  
  // Column Indices
  const rawIdx = {
    keyword: getColumnIndex(SHEETS.RAW_DATA, "Keyword"),
    searches: getColumnIndex(SHEETS.RAW_DATA, "Avg. monthly searches"),
    compIndex: getColumnIndex(SHEETS.RAW_DATA, "Competition index"),
    bidLow: getColumnIndex(SHEETS.RAW_DATA, "Bid Low"),
    bidHigh: getColumnIndex(SHEETS.RAW_DATA, "Bid High")
  };
  
  // Prepare data arrays
  const cleanData = [];
  
  // Arrays for updating Raw Data columns in batch
  const rawSearches = [];
  const rawCompIndex = [];
  const rawBidLow = [];
  const rawBidHigh = [];
  
  rawData.forEach(row => {
    const keyword = row[rawIdx.keyword];
    
    // Parse values
    const searches = parseNumber(row[rawIdx.searches]);
    const compIndex = parseNumber(row[rawIdx.compIndex]);
    const bidLow = parseNumber(row[rawIdx.bidLow]);
    const bidHigh = parseNumber(row[rawIdx.bidHigh]);
    
    // Collect for Raw Data update
    rawSearches.push(searches);
    rawCompIndex.push(compIndex);
    rawBidLow.push(bidLow);
    rawBidHigh.push(bidHigh);
    
    // Structure matches CLEAN_DATA columns
    const newRow = [
      keyword,
      searches,
      compIndex,
      bidLow,
      bidHigh,
      "" // Empty Negative column
    ];
    
    cleanData.push(newRow);
  });
  
  // 2. Write to Clean Sheet
  updateSheetData(SHEETS.CLEAN_DATA, cleanData);
  
  // 3. Update Raw Sheet - OPTIMIZED to write only modified columns
  if (rawSearches.length > 0) {
    setColumnValues(SHEETS.RAW_DATA, "Avg. monthly searches", rawSearches);
    setColumnValues(SHEETS.RAW_DATA, "Competition index", rawCompIndex);
    setColumnValues(SHEETS.RAW_DATA, "Bid Low", rawBidLow);
    setColumnValues(SHEETS.RAW_DATA, "Bid High", rawBidHigh);
  }
  
  // 4. Format Sheets
  formatSheetColumns(rawSheet, SHEETS.RAW_DATA);
  formatSheetColumns(cleanSheet, SHEETS.CLEAN_DATA);
  
  // 5. Reset Backgrounds in Negative column of Clean Data
  clearColumnBackgroundByName(SHEETS.CLEAN_DATA, "Negative");
  
  return cleanData.length;
}

/**
 * Applies number formatting to specific columns in a sheet.
 * @param {Sheet} sheet - The Google Sheet object.
 * @param {string} sheetName - The name of the sheet (for looking up columns).
 */
function formatSheetColumns(sheet, sheetName) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // Helper to get range for a column
  const getColRange = (colName) => {
    const colIndex = getColumnIndex(sheetName, colName);
    if (colIndex === -1) return null;
    return sheet.getRange(2, colIndex + 1, lastRow - 1, 1);
  };
  
  // Integer Format: "# ##0"
  const intFormat = "0"; 
  // Decimal Format: "# ##0.00"
  const decimalFormat = "# ##0.00";
  
  const rangeSearches = getColRange("Avg. monthly searches");
  if (rangeSearches) rangeSearches.setNumberFormat(intFormat);
  
  const rangeComp = getColRange("Competition index");
  if (rangeComp) rangeComp.setNumberFormat(intFormat);
  
  const rangeBidLow = getColRange("Bid Low");
  if (rangeBidLow) rangeBidLow.setNumberFormat(decimalFormat);
  
  const rangeBidHigh = getColRange("Bid High");
  if (rangeBidHigh) rangeBidHigh.setNumberFormat(decimalFormat);
}
