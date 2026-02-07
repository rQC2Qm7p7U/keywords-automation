/**
 * DataService.gs
 * Domain logic for data migration and formatting.
 */

/**
 * Transfers data from Raw Data to Clean Data and formats both sheets.
 * Optimized to reduce sheet rewrites.
 */
function transferRawToClean() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = ss.getSheetByName(SHEETS.RAW_DATA);
  var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!rawSheet || !cleanSheet) {
    throw new Error("One or more sheets not found.");
  }
  
  // 1. Get Raw Data (Full read needed for transfer as we mapping rows)
  var rawData = getSheetData(SHEETS.RAW_DATA);
  if (!rawData || rawData.length === 0) {
    return 0;
  }
  
  // Column Indices (Config based usage)
  var rawIdx = {
    keyword: getColumnIndex(SHEETS.RAW_DATA, "Keyword"),
    searches: getColumnIndex(SHEETS.RAW_DATA, "Avg. monthly searches"),
    compIndex: getColumnIndex(SHEETS.RAW_DATA, "Competition index"),
    bidLow: getColumnIndex(SHEETS.RAW_DATA, "Bid Low"),
    bidHigh: getColumnIndex(SHEETS.RAW_DATA, "Bid High")
  };
  
  // Prepare data arrays
  var cleanData = [];
  
  // Arrays for updating Raw Data columns in batch (Optimized)
  var rawSearches = [];
  var rawCompIndex = [];
  var rawBidLow = [];
  var rawBidHigh = [];
  
  rawData.forEach(function(row) {
    var keyword = row[rawIdx.keyword];
    
    // Parse values
    var searches = parseNumber(row[rawIdx.searches]);
    var compIndex = parseNumber(row[rawIdx.compIndex]);
    var bidLow = parseNumber(row[rawIdx.bidLow]);
    var bidHigh = parseNumber(row[rawIdx.bidHigh]);
    
    // Collect for Raw Data update
    rawSearches.push(searches);
    rawCompIndex.push(compIndex);
    rawBidLow.push(bidLow);
    rawBidHigh.push(bidHigh);
    
    // Structure matches CLEAN_DATA columns
    var newRow = [
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
 * Parses a value to number, replacing commas with dots.
 * Returns 0 if invalid or empty.
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  
  if (typeof value === 'number') return value;
  
  var str = String(value).trim();
  // Replace comma with dot
  str = str.replace(/,/g, '.');
  // Remove non-numeric chars except dot and minus? 
  // Actually, usually currency symbols or spaces might be present
  // For safety, let's just try parsing the modified string
  // If it has spaces (e.g. "1 000"), remove them
  str = str.replace(/\s/g, '');
  
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Applies number formatting to specific columns in a sheet.
 */
function formatSheetColumns(sheet, sheetName) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // Helper to get range for a column
  var getColRange = function(colName) {
    var colIndex = getColumnIndex(sheetName, colName);
    if (colIndex === -1) return null;
    return sheet.getRange(2, colIndex + 1, lastRow - 1, 1);
  };
  
  // Integer Format: "# ##0" (assuming thousand separator is desired for consistency)
  var intFormat = "0"; 
  // Decimal Format: "# ##0.00"
  var decimalFormat = "# ##0.00";
  
  var rangeSearches = getColRange("Avg. monthly searches");
  if (rangeSearches) rangeSearches.setNumberFormat(intFormat);
  
  var rangeComp = getColRange("Competition index");
  if (rangeComp) rangeComp.setNumberFormat(intFormat);
  
  var rangeBidLow = getColRange("Bid Low");
  if (rangeBidLow) rangeBidLow.setNumberFormat(decimalFormat);
  
  var rangeBidHigh = getColRange("Bid High");
  if (rangeBidHigh) rangeBidHigh.setNumberFormat(decimalFormat);
}
