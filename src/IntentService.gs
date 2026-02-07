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
  
  // 1. Collect Negatives from Raw Data and Clean Data (Optimized)
  // Instead of reading whole sheets, we read only the "Negative" columns.
  
  var rawNegatives = getColumnValues(SHEETS.RAW_DATA, "Negative");
  var cleanNegatives = getColumnValues(SHEETS.CLEAN_DATA, "Negative");
  
  var allNegatives = new Set();
  
  // Process Raw Data
  if (rawNegatives && rawNegatives.length > 0) {
    rawNegatives.forEach(function(cellValue) {
      if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
        var val = String(cellValue).trim().toLowerCase();
        if (val !== "") allNegatives.add(val);
      }
    });
  }
  
  // Process Clean Data
  if (cleanNegatives && cleanNegatives.length > 0) {
    cleanNegatives.forEach(function(cellValue) {
      if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
        var val = String(cellValue).trim().toLowerCase();
        if (val !== "") allNegatives.add(val);
      }
    });
  }
  
  // 1a. Read EXISTING Negatives from Intent Types
  var existingNegatives = getColumnValues(SHEETS.INTENT_TYPES, "Negative");
  if (existingNegatives && existingNegatives.length > 0) {
    existingNegatives.forEach(function(cellValue) {
      if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
        var val = String(cellValue).trim().toLowerCase();
        if (val !== "") allNegatives.add(val);
      }
    });
  }
  
  // Convert to array and sort A-Z
  var sortedNegatives = Array.from(allNegatives).sort();
  
  // Write new negatives
  // First clear existing
  var intentSheet = ss.getSheetByName(SHEETS.INTENT_TYPES);
  if (!intentSheet) throw new Error("Sheet not found: " + SHEETS.INTENT_TYPES);
  
  var negColIndex = getColumnIndex(SHEETS.INTENT_TYPES, "Negative");
  
  if (intentSheet.getLastRow() > 1 && negColIndex !== -1) {
    intentSheet.getRange(2, negColIndex + 1, intentSheet.getLastRow() - 1, 1).clearContent();
  }
  
  if (sortedNegatives.length > 0) {
    // Determine column index if clear failed or sheets empty? No, we have helper now.
    setColumnValues(SHEETS.INTENT_TYPES, "Negative", sortedNegatives);
  }
  
  // 3. Highlight Matches in other columns (Intent Types)
  // Highlighting still requires reading the intent columns.
  // We can optimize by reading only relevant columns, but here we process the whole grid usually.
  // Optimization: Reading whole sheet is fine for highlighting logic as we need coordinate context.
  
  // Get all data from Intent Types to check against
  var intentDataRange = intentSheet.getDataRange();
  var intentValues = intentDataRange.getValues(); // Includes header
  var intentBackgrounds = intentDataRange.getBackgrounds();
  
  var checkColumns = COLUMNS.INTENT_TYPES.filter(function(col) {
    return col !== "Negative" && col !== "Site"; 
  });
  
  var checkIndices = checkColumns.map(function(colName) {
    return COLUMNS.INTENT_TYPES.indexOf(colName);
  }).filter(function(idx) { return idx !== -1; });
  
  // Start from row 1 (index 1) into intentValues
  for (var r = 1; r < intentValues.length; r++) {
    var row = intentValues[r];
    
    checkIndices.forEach(function(colIdx) {
      var cellValue = String(row[colIdx]).trim().toLowerCase();
      // Reset
      intentBackgrounds[r][colIdx] = null; 
      
      if (cellValue && allNegatives.has(cellValue)) {
        intentBackgrounds[r][colIdx] = "#ffff00"; // Yellow
      }
    });
  }
  
  intentDataRange.setBackgrounds(intentBackgrounds);
  
  // 4. Highlight Processed Negatives in Source Sheets (Green)
  // Optimization: highlightSourceNegatives was already reading only the specific column.
  highlightSourceNegatives(SHEETS.RAW_DATA, "Negative", allNegatives);
  highlightSourceNegatives(SHEETS.CLEAN_DATA, "Negative", allNegatives);

  return sortedNegatives.length;
}

/**
 * Helper to highlight processed negatives in a source sheet.
 * Use existing column logic.
 */
function highlightSourceNegatives(sheetName, colName, processedSet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return;
  
  var colIndex = getColumnIndex(sheetName, colName); // Use helper
  if (colIndex === -1) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // Get data only for the specific column
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
 * Removes rows from Clean Data if the Keyword contains any negative keyword.
 * Optimized to read only relevant columns.
 */
function cleanKeysFromNegatives() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Negatives (Column read)
  var negValues = getColumnValues(SHEETS.INTENT_TYPES, "Negative");
  var negativeWords = [];
  
  if (negValues && negValues.length > 0) {
    negValues.forEach(function(v) {
      var val = String(v).trim().toLowerCase();
      if (val) negativeWords.push(val);
    });
  }
  
  if (negativeWords.length === 0) return 0;
  
  // 2. Get Clean Data Keywords (Column read)
  // But wait! We need to delete ROWS. Reading only one column loses context of other data.
  // If we want to delete rows, we need to know which rows.
  // Then we can delete them. `sheet.deleteRow(i)` is very slow in loop.
  // Better approach: Read ALL Clean Data, filter in memory, WRITE BACK all Clean Data.
  // Optimization: Reading all data is unavoidable if we filter rows.
  // UNLESS: We use a batch delete approach or filtering in place?
  // Batch rewrite is standard practice in Apps Script for <100k rows.
  
  var cleanData = getSheetData(SHEETS.CLEAN_DATA);
  if (!cleanData || cleanData.length === 0) return 0;
  
  var keywordIdx = getColumnIndex(SHEETS.CLEAN_DATA, "Keyword");
  if (keywordIdx === -1) throw new Error("Keyword column not found");
  
  var filteredData = [];
  var removedCount = 0;
  
  var patterns = negativeWords.map(function(word) {
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
    
    var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
    if (typeof formatSheetColumns === 'function') {
      formatSheetColumns(cleanSheet, SHEETS.CLEAN_DATA);
    }

    // 5. Reset Backgrounds in "Negative" column
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
