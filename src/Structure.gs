/**
 * Structure.gs
 * Contains the logic for managing the spreadsheet structure.
 */

/**
 * Deletes all existing sheets and creates the new structure.
 * This is a destructive operation.
 */
function createStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  // 1. Create a temporary sheet to ensure the spreadsheet is never empty
  // We use a timestamp to ensure uniqueness
  const tempSheetName = `Temp_Setup_${new Date().getTime()}`;
  const tempSheet = ss.insertSheet(tempSheetName);
  
  // 2. Delete ALL other sheets (including old "Intent Types" and "Raw Data")
  // This clears the workspace completely and avoids name collisions
  for (let i = 0; i < sheets.length; i++) {
    ss.deleteSheet(sheets[i]);
  }
  
  // 3. Create the new "Intent Types" sheet
  const intentSheet = ss.insertSheet(SHEETS.INTENT_TYPES);
  
  // Setup columns for "Intent Types"
  const headers = COLUMNS.INTENT_TYPES;
  intentSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  intentSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  intentSheet.setFrozenRows(1);
  protectHeaderRow(intentSheet);
  
  // 4. Create "Raw Data" sheet
  const rawDataSheet = ss.insertSheet(SHEETS.RAW_DATA);
  
  // Setup columns for "Raw Data"
  const rawHeaders = COLUMNS.RAW_DATA;
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight("bold");
  rawDataSheet.setFrozenRows(1);
  protectHeaderRow(rawDataSheet);
  
  // 5. Create "Clean Data" sheet
  const cleanDataSheet = ss.insertSheet(SHEETS.CLEAN_DATA);
  
  // Setup columns for "Clean Data"
  const cleanHeaders = COLUMNS.CLEAN_DATA;
  cleanDataSheet.getRange(1, 1, 1, cleanHeaders.length).setValues([cleanHeaders]);
  cleanDataSheet.getRange(1, 1, 1, cleanHeaders.length).setFontWeight("bold");
  cleanDataSheet.setFrozenRows(1);
  protectHeaderRow(cleanDataSheet);

  // 6. Create "Clusters" sheet
  const clustersSheet = ss.insertSheet(SHEETS.CLUSTERS);
  const clustersHeaders = COLUMNS.CLUSTERS;
  clustersSheet.getRange(1, 1, 1, clustersHeaders.length).setValues([clustersHeaders]);
  clustersSheet.getRange(1, 1, 1, clustersHeaders.length).setFontWeight("bold");
  clustersSheet.setFrozenRows(1);
  protectHeaderRow(clustersSheet);

    // 7. Create "Ars Regions" sheet (Hidden)
    const regionsSheet = ss.insertSheet(SHEETS.REGIONS);
    let defaultRegionName = ""; 
    
    try {
      const csvContent = UrlFetchApp.fetch("https://arsenkin.ru/google_regions.csv").getContentText();
      const csvData = Utilities.parseCsv(csvContent);
      // CSV Structure: ID, EnName, RuName. 
      // Example: 1001493,"Minsk,Minsk Region,Belarus","Минск,Минская Область,Беларусь"
      
      if (csvData.length > 0) {
        // Transform to [Composite Name, ID]
        // Composite Name = "RuName | EnName" for bilingual search
        let reorderedData = csvData.map(row => {
          const id = row[0];
          // Fallbacks if columns are missing
          const enName = (row.length > 1 && row[1]) ? row[1] : id;
          const ruName = (row.length > 2 && row[2]) ? row[2] : enName;
          
          const compositeName = `${ruName} | ${enName}`;
          return [compositeName, id];
        });
        
        // SORT by Name (best practice for large lists)
        reorderedData.sort((a, b) => a[0].localeCompare(b[0]));

        // Find default name for ID 213 (Moscow) AFTER sorting/formatting
        // We scan the processed list to find the exact string that will be in the dropdown
        const defaults = reorderedData.find(r => String(r[1]) === "213");
        if (defaults) {
            defaultRegionName = defaults[0]; // e.g. "Москва, ... | Moscow, ..."
            // Set search default to first word of Russian name to ensure it appears in dropdown
            defaultRegionSearch = "Москва"; 
        } else {
            // Fallback if 213 not found, pick first item or generic
            defaultRegionName = reorderedData.length > 0 ? reorderedData[0][0] : "213";
            defaultRegionSearch = "";
        }
        
        // Auto-Resize sheet to fit data (prevent errors with >1000 rows)
        if (regionsSheet.getMaxRows() < reorderedData.length) {
          regionsSheet.insertRowsAfter(regionsSheet.getMaxRows(), reorderedData.length - regionsSheet.getMaxRows());
        }
        
        regionsSheet.getRange(1, 1, reorderedData.length, 2).setValues(reorderedData);

        // Add Filter Formula to D1 (Dependent Dropdown Logic)
        // Filters Col A based on input in 'Ars API Set'!B3 (Search Cell)
        // QUERY is robust. LIMIT 100 prevents lag.
        // We reference the sheet by name.
        const formula = `=IF(ISBLANK('${SHEETS.SETTINGS}'!B3); ARRAY_CONSTRAIN(A:A; 50; 1); QUERY(A:A; "Select A Where lower(A) contains '" & LOWER('${SHEETS.SETTINGS}'!B3) & "' Limit 50"))`;
        regionsSheet.getRange("D1").setFormula(formula);
      }
    } catch (e) {
      regionsSheet.getRange(1, 1).setValue("Error loading regions: " + e.message);
    }
    regionsSheet.hideSheet();
  
    // 8. Create "Ars API Set" sheet
    const settingsSheet = ss.insertSheet(SHEETS.SETTINGS);
    
    // Setup columns
    const settingsHeaders = COLUMNS.SETTINGS;
    settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]);
    settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setFontWeight("bold");
    settingsSheet.setFrozenRows(1);
    protectHeaderRow(settingsSheet);
    
    // Define Settings Rows
    // Added "Region Search" row
    const settingsRows = [
      ["Search Engine", "Google", "Поисковая система"],
      ["Region Search", defaultRegionSearch, "Введите название города (например 'Mosc' или 'Моск')"],
      ["Region", defaultRegionName, "Выберите регион из выпадающего списка (фильтруется по поиску)"],
      ["Group Type", "hard", "Тип группировки (soft/hard)"],
      ["Group Count", "3", "Степень группировки (2-10)"],
      ["Depth", "10", "Глубина проверки (10, 20, 30)"],
      ["Ignore Main Page", "true", "Исключать главные страницы"],
      ["API Token Status", "Not Set", "Статус токена (меняется через меню)"]
    ];
  
    const startRow = 2;
    settingsSheet.getRange(startRow, 1, settingsRows.length, 3).setValues(settingsRows);
    
    // --- DATA VALIDATION ---
    
    // 1. Search Engine (B2)
    const seRule = SpreadsheetApp.newDataValidation().requireValueInList(["Google", "Yandex"]).build();
    settingsSheet.getRange("B2").setDataValidation(seRule);
    
    // 2. Region Search (B3) - Simple Input (No validation, but maybe a helpful note?)
    // We leave it plain text for free typing.
    
    // 3. Region Select (B4) - Dependent Dropdown
    // Points to the FILTERED list in Ars Regions!D1:D50
    const filteredRange = regionsSheet.getRange("D1:D50");
    const regionRule = SpreadsheetApp.newDataValidation().requireValueInRange(filteredRange).build();
    settingsSheet.getRange("B4").setDataValidation(regionRule);
  
  // 4. Group Type (B5)
  const groupRule = SpreadsheetApp.newDataValidation().requireValueInList(["soft", "hard"]).build();
  settingsSheet.getRange("B5").setDataValidation(groupRule);
  
  // 5. Group Count (B6)
  const countRule = SpreadsheetApp.newDataValidation().requireValueInList(["2", "3", "4", "5", "6", "7", "8", "9", "10"]).build();
  settingsSheet.getRange("B6").setDataValidation(countRule);
  
  // 6. Depth (B7)
  const depthRule = SpreadsheetApp.newDataValidation().requireValueInList(["10", "20", "30"]).build();
  settingsSheet.getRange("B7").setDataValidation(depthRule);
  
  // 7. Ignore Main (B8)
  const boolRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  settingsSheet.getRange("B8").setDataValidation(boolRule);
  
  // Auto-resize
  settingsSheet.autoResizeColumns(1, 3);
  settingsSheet.setColumnWidth(2, 150); // Make Value column wider

  // 9. Delete the temporary sheet
  ss.deleteSheet(tempSheet);
  
  // 10. Ensure correct order
  intentSheet.activate();
  ss.moveActiveSheet(1);
  rawDataSheet.activate();
  ss.moveActiveSheet(2);
  cleanDataSheet.activate();
  ss.moveActiveSheet(3);
  settingsSheet.activate();
  ss.moveActiveSheet(4);
  clustersSheet.activate();
  ss.moveActiveSheet(5);
  
  // Switch to Settings for first setup
  settingsSheet.activate();
  
  ss.toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}


/**
 * Protects the first row (headers) of the given sheet.
 * Only the owner will be able to edit it.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to protect.
 */
function protectHeaderRow(sheet) {
  const protection = sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect();
  protection.setDescription('Protected Headers');
  
  // Remove all editors except the script owner/runner
  const me = Session.getEffectiveUser();
  protection.addEditor(me);
  protection.removeEditors(protection.getEditors());
  
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}
