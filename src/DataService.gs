/**
 * DataService.gs
 * Domain logic for data migration and formatting.
 */

/**
 * Transfers data from Raw Data to Clean Data and formats both sheets.
 * Optimized to reduce sheet rewrites.
 */
function transferRawToClean() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName(SHEETS.RAW_DATA);
  const cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!rawSheet || !cleanSheet) {
    throw new Error("One or more sheets not found.");
  }
  
  // 1. Get Raw Data (Full read needed for transfer as we mapping rows)
  const rawData = getSheetData(SHEETS.RAW_DATA);
  if (!rawData || rawData.length === 0) {
    return 0;
  }
  
  // Column Indices (Config based usage)
  const rawIdx = {
    keyword: getColumnIndex(SHEETS.RAW_DATA, "Keyword"),
    searches: getColumnIndex(SHEETS.RAW_DATA, "Avg. monthly searches"),
    compIndex: getColumnIndex(SHEETS.RAW_DATA, "Competition index"),
    bidLow: getColumnIndex(SHEETS.RAW_DATA, "Bid Low"),
    bidHigh: getColumnIndex(SHEETS.RAW_DATA, "Bid High")
  };
  
  // Prepare data arrays
  const cleanData = [];
  
  // Arrays for updating Raw Data columns in batch (Optimized)
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
  
  // 2. Write to Clean Sheet (Full rewrite is okay here as it's a transfer/reset)
  updateSheetData(SHEETS.CLEAN_DATA, cleanData);
  
  // 3. Update Raw Sheet - OPTIMIZED to write only modified columns
  // We use setColumnValues helper logic
  if (rawSearches.length > 0) {
    setColumnValues(SHEETS.RAW_DATA, "Avg. monthly searches", rawSearches);
    setColumnValues(SHEETS.RAW_DATA, "Competition index", rawCompIndex);
    setColumnValues(SHEETS.RAW_DATA, "Bid Low", rawBidLow);
    setColumnValues(SHEETS.RAW_DATA, "Bid High", rawBidHigh);
  }
  
  // 4. Format Sheets (Raw and Clean)
  formatSheetColumns(rawSheet, SHEETS.RAW_DATA);
  formatSheetColumns(cleanSheet, SHEETS.CLEAN_DATA);
  
  // 5. Reset Backgrounds in Negative column of Clean Data
  clearColumnBackgroundByName(SHEETS.CLEAN_DATA, "Negative");
  
  return cleanData.length;
}

/**
 * Parses a value to number, handling Russian/European formats robustly.
 * Returns 0 if invalid or empty.
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  
  if (typeof value === 'number') return value;
  
  let str = String(value).trim();
  
  // Optimize: remove spaces (thousand separators)
  str = str.replace(/\s+/g, '');
  
  // Handle comma as decimal separator (common in RU/EU)
  // If we have both dot and comma, we need to decide which is which.
  // Assumption for this project: 
  // "1.000,50" -> 1000.50
  // "1,000.50" -> 1000.50
  // "1 000,50" -> 1000.50 (Handled by space removal above)
  
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
 * Applies number formatting to specific columns in a sheet.
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
  
  // Integer Format: "# ##0" (assuming thousand separator is desired for consistency)
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
