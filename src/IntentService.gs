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
  // Columns to check: All intent columns except "Negative" (and maybe "Site" if added later, but mostly intent buckets)
  // We derive this dynamically from Config to ensure Single Source of Truth
  var checkColumns = COLUMNS.INTENT_TYPES.filter(function(col) {
    return col !== "Negative" && col !== "Site"; // Exclude specific non-intent columns if any
  });
  
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

/**
 * Removes rows from Clean Data if the Keyword contains any negative keyword
 * from the Intent Types sheet.
 * Uses whole-word matching to avoid false positives.
 */
function cleanKeysFromNegatives() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Negatives from Intent Types
  var intentSheet = ss.getSheetByName(SHEETS.INTENT_TYPES);
  if (!intentSheet) throw new Error("Sheet not found: " + SHEETS.INTENT_TYPES);
  
  var negColIndex = COLUMNS.INTENT_TYPES.indexOf("Negative");
  if (negColIndex === -1) throw new Error("Negative column not found in Intent Types");
  
  var lastRow = intentSheet.getLastRow();
  var negativeWords = [];
  
  if (lastRow > 1) {
    var negValues = intentSheet.getRange(2, negColIndex + 1, lastRow - 1, 1).getValues();
    negValues.forEach(function(r) {
      var val = String(r[0]).trim().toLowerCase();
      if (val) negativeWords.push(val);
    });
  }
  
  if (negativeWords.length === 0) return 0;
  
  // 2. Get Clean Data
  var cleanData = getSheetData(SHEETS.CLEAN_DATA);
  if (!cleanData || cleanData.length === 0) return 0;
  
  var keywordIdx = COLUMNS.CLEAN_DATA.indexOf("Keyword");
  if (keywordIdx === -1) throw new Error("Keyword column not found in Clean Data");
  
  // 3. Filter Data
  var filteredData = [];
  var removedCount = 0;
  
  // Pre-compile regexes for performance if possible, but JS RegExp from string is fast enough
  // For whole word match: \bword\b
  // We need to escape special regex characters in the negative word
  var patterns = negativeWords.map(function(word) {
    // strict whole word matching
    return new RegExp("\\b" + _escapeRegExp(word) + "\\b", "i");
  });
  
  cleanData.forEach(function(row) {
    var keyword = String(row[keywordIdx]).trim();
    
    var isNegative = false;
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].test(keyword)) {
        isNegative = true;
        break;
      }
    }
    
    if (isNegative) {
      removedCount++;
    } else {
      filteredData.push(row);
    }
  });
  
  // 4. Update Clean Data
  if (removedCount > 0) {
    updateSheetData(SHEETS.CLEAN_DATA, filteredData);
    // Re-apply formatting since updateSheetData clears content/formatting mostly
    // We should probably explicitly re-apply formatting
    var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
    // SheetsService.updateSheetData handles data, but we need to re-apply number formats
    // Fortunately we have DataService.formatSheetColumns but it is in another file. 
    // We can call it if it's global (it is).
    // Or we can rely on unit tests.
    // Let's assume global availability.
    if (typeof formatSheetColumns === 'function') {
      formatSheetColumns(cleanSheet, SHEETS.CLEAN_DATA);
    }

    // 5. Reset Backgrounds in "Negative" column
    // Since we filtered data, previous highlights might be misleading or misaligned.
    // The user requested to "reset painted cells".
    clearColumnBackgroundByName(SHEETS.CLEAN_DATA, "Negative");
  }
  
  return removedCount;
}

/**
 * Helper to escape special characters in regex string.
 */
function _escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
