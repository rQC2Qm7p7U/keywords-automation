/**
 * IntentService.gs
 * Domain logic for Intent Types sheet operations.
 */

/**
 * Collects negative keywords from Raw and Clean Data sheets,
 * updates the Intent Types negative column, and highlights matches.
 */
function collectNegativeKeywords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Collect Negatives from Raw Data and Clean Data
  var rawData = getSheetData(SHEETS.RAW_DATA);
  var cleanData = getSheetData(SHEETS.CLEAN_DATA);
  
  // Helper to extract negatives from specific column index
  // We need to find the index of "Negative" column in each sheet's config
  // For simplicity and robustness, we'll find it dynamically from the config or header
  // adhering to the Config.gs structure.
  
  var rawNegativeIndex = COLUMNS.RAW_DATA.indexOf("Negative");
  var cleanNegativeIndex = COLUMNS.CLEAN_DATA.indexOf("Negative");
  
  var allNegatives = new Set();
  
  // Process Raw Data
  if (rawData && rawData.length > 0 && rawNegativeIndex !== -1) {
    rawData.forEach(function(row) {
      if (row[rawNegativeIndex]) {
        var val = String(row[rawNegativeIndex]).trim().toLowerCase();
        if (val) allNegatives.add(val);
      }
    });
  }
  
  // Process Clean Data
  if (cleanData && cleanData.length > 0 && cleanNegativeIndex !== -1) {
    cleanData.forEach(function(row) {
      if (row[cleanNegativeIndex]) {
        var val = String(row[cleanNegativeIndex]).trim().toLowerCase();
        if (val) allNegatives.add(val);
      }
    });
  }
  
  // Convert to array and sort A-Z
  var sortedNegatives = Array.from(allNegatives).sort();
  
  // 2. Update Intent Types "Negative" Column produces a single column array
  var intentSheet = ss.getSheetByName(SHEETS.INTENT_TYPES);
  if (!intentSheet) {
    throw new Error("Sheet not found: " + SHEETS.INTENT_TYPES);
  }
  
  var intentNegativeIndex = COLUMNS.INTENT_TYPES.indexOf("Negative"); // 0-based index in CONFIG
  // Column number is index + 1
  var negativecolNum = intentNegativeIndex + 1;
  
  // Clear existing negatives in Intent Types (preserve header)
  var lastRow = intentSheet.getMaxRows();
  if (lastRow > 1) {
    intentSheet.getRange(2, negativecolNum, lastRow - 1, 1).clearContent();
  }
  
  // Write new negatives
  if (sortedNegatives.length > 0) {
    var outputValues = sortedNegatives.map(function(n) { return [n]; });
    intentSheet.getRange(2, negativecolNum, outputValues.length, 1).setValues(outputValues);
  }
  
  // 3. Highlight Matches in other columns
  // Columns to check: Transactional, Branded, Commercial, Local, Abbreviations
  var checkColumns = [
    "Transactional",
    "Branded",
    "Commercial",
    "Local",
    "Abbreviations"
  ];
  
  var checkIndices = checkColumns.map(function(colName) {
    return COLUMNS.INTENT_TYPES.indexOf(colName);
  }).filter(function(idx) { return idx !== -1; });
  
  // Get all data from Intent Types to check against
  var intentDataRange = intentSheet.getDataRange();
  var intentValues = intentDataRange.getValues(); // Includes header
  var intentBackgrounds = intentDataRange.getBackgrounds();
  
  // Start from row 1 (index 1) to skip header
  for (var r = 1; r < intentValues.length; r++) {
    var row = intentValues[r];
    
    checkIndices.forEach(function(colIdx) {
      var cellValue = String(row[colIdx]).trim().toLowerCase();
      // Reset background first
      intentBackgrounds[r][colIdx] = null; 
      
      if (cellValue && allNegatives.has(cellValue)) {
        intentBackgrounds[r][colIdx] = "#ffff00"; // Yellow
      }
    });
  }
  
  // Apply backgrounds in batch
  intentDataRange.setBackgrounds(intentBackgrounds);
  
  // 4. Highlight Processed Negatives in Source Sheets (Green)
  highlightSourceNegatives(SHEETS.RAW_DATA, "Negative", allNegatives);
  highlightSourceNegatives(SHEETS.CLEAN_DATA, "Negative", allNegatives);

  return sortedNegatives.length;
}

/**
 * Helper to highlight processed negatives in a source sheet.
 * 
 * @param {string} sheetName - Name of the sheet to process.
 * @param {string} colName - Name of the column to check.
 * @param {Set<string>} processedSet - Set of processed negative keywords (lowercase).
 */
function highlightSourceNegatives(sheetName, colName, processedSet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return;
  
  var colIndex = -1;
  // Determine index based on sheet config
  if (sheetName === SHEETS.RAW_DATA) {
    colIndex = COLUMNS.RAW_DATA.indexOf(colName);
  } else if (sheetName === SHEETS.CLEAN_DATA) {
    colIndex = COLUMNS.CLEAN_DATA.indexOf(colName);
  }
  
  if (colIndex === -1) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // Get data only for the specific column to optimize
  // range: row 2, colIndex + 1, numRows, 1
  var range = sheet.getRange(2, colIndex + 1, lastRow - 1, 1);
  var values = range.getValues();
  var backgrounds = range.getBackgrounds();
  
  var changed = false;
  
  for (var i = 0; i < values.length; i++) {
    var val = String(values[i][0]).trim().toLowerCase();
    
    if (val && processedSet.has(val)) {
      backgrounds[i][0] = "#00ff00"; // Green
      changed = true;
    }
  }
  
  if (changed) {
    range.setBackgrounds(backgrounds);
  }
}
