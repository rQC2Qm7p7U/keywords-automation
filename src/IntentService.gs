/**
 * IntentService.gs
 * Domain logic for Intent Types sheet operations.
 */

/**
 * Collects negative keywords from Raw and Clean Data sheets,
 * updates the Intent Types negative column, and highlights matches.
 */
function collectNegativeKeywords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Collect Negatives from Raw Data and Clean Data (Optimized)
  // Instead of reading whole sheets, we read only the "Negative" columns.
  
  const rawNegatives = getColumnValues(SHEETS.RAW_DATA, "Negative");
  const cleanNegatives = getColumnValues(SHEETS.CLEAN_DATA, "Negative");
  
  const allNegatives = new Set();
  
  // Helper to add valid negatives
  const addIfValid = (val) => {
    if (val !== null && val !== undefined && val !== "") {
      const str = String(val).trim().toLowerCase();
      if (str !== "") allNegatives.add(str);
    }
  };

  // Process Raw Data
  if (rawNegatives && rawNegatives.length > 0) {
    rawNegatives.forEach(addIfValid);
  }
  
  // Process Clean Data
  if (cleanNegatives && cleanNegatives.length > 0) {
    cleanNegatives.forEach(addIfValid);
  }
  
  // 1a. Read EXISTING Negatives from Intent Types
  const existingNegatives = getColumnValues(SHEETS.INTENT_TYPES, "Negative");
  if (existingNegatives && existingNegatives.length > 0) {
    existingNegatives.forEach(addIfValid);
  }
  
  // Convert to array and sort A-Z
  const sortedNegatives = Array.from(allNegatives).sort();
  
  // Write new negatives
  // First clear existing
  const intentSheet = ss.getSheetByName(SHEETS.INTENT_TYPES);
  if (!intentSheet) throw new Error(`Sheet not found: ${SHEETS.INTENT_TYPES}`);
  
  const negColIndex = getColumnIndex(SHEETS.INTENT_TYPES, "Negative");
  
  if (intentSheet.getLastRow() > 1 && negColIndex !== -1) {
    intentSheet.getRange(2, negColIndex + 1, intentSheet.getLastRow() - 1, 1).clearContent();
  }
  
  if (sortedNegatives.length > 0) {
    setColumnValues(SHEETS.INTENT_TYPES, "Negative", sortedNegatives);
  }
  
  // 3. Highlight Matches in other columns (Intent Types)
  // Highlighting still requires reading the intent columns.
  
  // Get all data from Intent Types to check against
  const intentDataRange = intentSheet.getDataRange();
  const intentValues = intentDataRange.getValues(); // Includes header
  const intentBackgrounds = intentDataRange.getBackgrounds();
  
  const checkColumns = COLUMNS.INTENT_TYPES.filter(col => col !== "Negative" && col !== "Site");
  
  const checkIndices = checkColumns
    .map(colName => COLUMNS.INTENT_TYPES.indexOf(colName))
    .filter(idx => idx !== -1);
  
  // Start from row 1 (index 1) into intentValues
  let bgChanged = false;
  for (let r = 1; r < intentValues.length; r++) {
    const row = intentValues[r];
    
    checkIndices.forEach(colIdx => {
      const cellValue = String(row[colIdx]).trim().toLowerCase();
      
      // Optimization: Only change if needed
      // If current is yellow and we need to clear it OR current isn't yellow and we need to set it
      // For simplicity, we just rebuild the state, but we can avoid "setting" if it matches
      
      let newColor = null; // Default
      if (cellValue && allNegatives.has(cellValue)) {
        newColor = "#ffff00"; // Yellow
      }

      if (intentBackgrounds[r][colIdx] !== newColor) {
         intentBackgrounds[r][colIdx] = newColor;
         bgChanged = true;
      }
    });
  }
  
  if (bgChanged) {
    intentDataRange.setBackgrounds(intentBackgrounds);
  }
  
  // 4. Highlight Processed Negatives in Source Sheets (Green)
  highlightSourceNegatives(SHEETS.RAW_DATA, "Negative", allNegatives);
  highlightSourceNegatives(SHEETS.CLEAN_DATA, "Negative", allNegatives);

  return sortedNegatives.length;
}

/**
 * Helper to highlight processed negatives in a source sheet.
 * Use existing column logic.
 */
function highlightSourceNegatives(sheetName, colName, processedSet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return;
  
  const colIndex = getColumnIndex(sheetName, colName); // Use helper
  if (colIndex === -1) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  // Get data only for the specific column
  const range = sheet.getRange(2, colIndex + 1, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = range.getBackgrounds();
  
  let changed = false;
  
  for (let i = 0; i < values.length; i++) {
    const val = String(values[i][0]).trim().toLowerCase();
    
    if (val && processedSet.has(val)) {
      if (backgrounds[i][0] !== "#00ff00") {
        backgrounds[i][0] = "#00ff00"; // Green
        changed = true;
      }
    }
  }
  
  if (changed) {
    range.setBackgrounds(backgrounds);
  }
}

/**
 * Removes rows from Clean Data if the Keyword contains any negative keyword.
 * Optimized with fast pre-check (indexOf).
 */
function cleanKeysFromNegatives() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Negatives (Column read)
  const negValues = getColumnValues(SHEETS.INTENT_TYPES, "Negative");
  const negativeWords = [];
  
  if (negValues && negValues.length > 0) {
    negValues.forEach(v => {
      const val = String(v).trim().toLowerCase();
      if (val) negativeWords.push(val);
    });
  }
  
  if (negativeWords.length === 0) return 0;
  
  // 2. Get Clean Data
  const cleanData = getSheetData(SHEETS.CLEAN_DATA);
  if (!cleanData || cleanData.length === 0) return 0;
  
  const keywordIdx = getColumnIndex(SHEETS.CLEAN_DATA, "Keyword");
  if (keywordIdx === -1) throw new Error("Keyword column not found");
  
  const filteredData = [];
  let removedCount = 0;
  
  // Pre-compile Regexes
  // Optimization: Attach the simple string to the regex object for fast access? 
  // Or just iterate two arrays? Iterating objects is cleaner.
  const matchers = negativeWords.map(word => ({
    text: word,
    // Only create regex if word boundaries are needed. 
    // Actually, "table" matches "stable" without boundaries. 
    // We strictly need boundaries for "whole word" matching usually requested in SEO.
    regex: new RegExp("\\b" + _escapeRegExp(word) + "\\b", "i")
  }));
  
  cleanData.forEach(row => {
    const keyword = String(row[keywordIdx]).trim();
    // Lowercase for fast substring check
    const lowerKeyword = keyword.toLowerCase(); 
    
    let isNegative = false;
    
    for (const matcher of matchers) {
      // FAST PRE-CHECK:
      // If the word isn't in the string at all, no need to run Regex.
      // String.indexOf is much faster than RegExp.exe
      if (lowerKeyword.indexOf(matcher.text) !== -1) {
         // It exists, now check exact word boundaries with Regex
         if (matcher.regex.test(keyword)) {
           isNegative = true;
           break;
         }
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
    
    const cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
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
