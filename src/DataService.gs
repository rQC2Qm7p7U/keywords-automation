/**
 * DataService.gs
 * Domain logic for data migration and formatting.
 */

/**
 * Transfers data from Raw Data to Clean Data and formats both sheets.
 * Mappings:
 * - Keyword -> Keyword
 * - Avg. monthly searches -> Avg. monthly searches
 * - Competition index -> Competition index
 * - Bid Low -> Bid Low
 * - Bid High -> Bid High
 * 
 * Also formats number columns:
 * - Avg. monthly searches, Competition index: Integer
 * - Bid Low, Bid High: Decimal (0.00)
 */
function transferRawToClean() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = ss.getSheetByName(SHEETS.RAW_DATA);
  var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!rawSheet || !cleanSheet) {
    throw new Error("One or more sheets not found.");
  }
  
  // 1. Get Raw Data
  var rawData = getSheetData(SHEETS.RAW_DATA);
  if (!rawData || rawData.length === 0) {
    return 0;
  }
  
  // Column Indices (Config based)
  var rawIdx = {
    keyword: COLUMNS.RAW_DATA.indexOf("Keyword"),
    searches: COLUMNS.RAW_DATA.indexOf("Avg. monthly searches"),
    compIndex: COLUMNS.RAW_DATA.indexOf("Competition index"),
    bidLow: COLUMNS.RAW_DATA.indexOf("Bid Low"),
    bidHigh: COLUMNS.RAW_DATA.indexOf("Bid High")
  };
  
  // Prepare data for Clean Sheet
  var cleanData = [];
  
  // Regex to detect commas in numbers (for US locale consistency)
  // We want to replace comma with dot if it looks like a decimal separator
  
  rawData.forEach(function(row) {
    var keyword = row[rawIdx.keyword];
    var searches = parseNumber(row[rawIdx.searches]);
    var compIndex = parseNumber(row[rawIdx.compIndex]);
    var bidLow = parseNumber(row[rawIdx.bidLow]);
    var bidHigh = parseNumber(row[rawIdx.bidHigh]);
    
    // Structure matches CLEAN_DATA columns:
    // "Keyword", "Avg. monthly searches", "Competition index", "Bid Low", "Bid High", "Negative"
    // We leave Negative empty/undefined here as it's handled separately
    var newRow = [
      keyword,
      searches,
      compIndex,
      bidLow,
      bidHigh,
      "" // Empty Negative column
    ];
    
    cleanData.push(newRow);
    
    // Update the original row array with parsed values for Raw Data update
    // We need to preserve other columns in Raw Data if any, but valid Raw Data has fixed columns.
    // Let's create a new row for Raw Data with parsed numbers.
    // Config: "Keyword", "Currency", "Avg. monthly searches", ...
    // Indices:
    // keyword (0), searches (2), compIndex (6), bidLow (7), bidHigh (8) - Wait, let's check COLUMNS.RAW_DATA
    
    // Actually, let's just update the specific columns in Raw Data to avoid messing up others?
    // Or just write back the whole row if we have all data.
    // getSheetData returns all columns.
    
    // Let's update the row object reference (which is an array) directly with valid numbers
    row[rawIdx.searches] = searches;
    row[rawIdx.compIndex] = compIndex;
    row[rawIdx.bidLow] = bidLow;
    row[rawIdx.bidHigh] = bidHigh;
  });
  
  // 2. Write to Clean Sheet
  // Use SheetsService to helper
  updateSheetData(SHEETS.CLEAN_DATA, cleanData);
  
  // 3. Update Raw Sheet with parsed numbers (to fix formatting)
  // We reused the 'rawData' array objects, modifying them in place above.
  updateSheetData(SHEETS.RAW_DATA, rawData);
  
  // 4. Format Sheets (Raw and Clean)
  formatSheetColumns(rawSheet, SHEETS.RAW_DATA);
  formatSheetColumns(cleanSheet, SHEETS.CLEAN_DATA);
  
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
  
  var cols = (sheetName === SHEETS.RAW_DATA) ? COLUMNS.RAW_DATA : COLUMNS.CLEAN_DATA;
  
  // Helper to get range for a column
  var getColRange = function(colName) {
    var idx = cols.indexOf(colName);
    if (idx === -1) return null;
    return sheet.getRange(2, idx + 1, lastRow - 1, 1);
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
