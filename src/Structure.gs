/**
 * Structure.gs
 * Contains the logic for managing the spreadsheet structure.
 */

/**
 * Deletes all existing sheets and creates the new structure.
 * This is a destructive operation.
 */
function createStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  // 1. Create a temporary sheet to ensure the spreadsheet is never empty
  // We use a timestamp to ensure uniqueness
  var tempSheetName = "Temp_Setup_" + new Date().getTime();
  var tempSheet = ss.insertSheet(tempSheetName);
  
  // 2. Delete ALL other sheets (including old "Intent Types" and "Raw Data")
  // This clears the workspace completely and avoids name collisions
  for (var i = 0; i < sheets.length; i++) {
    ss.deleteSheet(sheets[i]);
  }
  
  // 3. Create the new "Intent Types" sheet
  var intentSheet = ss.insertSheet(SHEETS.INTENT_TYPES);
  
  // Setup columns for "Intent Types"
  var headers = COLUMNS.INTENT_TYPES;
  intentSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  intentSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  intentSheet.setFrozenRows(1);
  protectHeaderRow(intentSheet);
  
  // 4. Create "Raw Data" sheet
  var rawDataSheet = ss.insertSheet(SHEETS.RAW_DATA);
  
  // Setup columns for "Raw Data"
  var rawHeaders = COLUMNS.RAW_DATA;
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  rawDataSheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight("bold");
  rawDataSheet.setFrozenRows(1);
  protectHeaderRow(rawDataSheet);
  
  // 5. Create "Clean Data" sheet
  var cleanDataSheet = ss.insertSheet(SHEETS.CLEAN_DATA);
  
  // Setup columns for "Clean Data"
  var cleanHeaders = COLUMNS.CLEAN_DATA;
  cleanDataSheet.getRange(1, 1, 1, cleanHeaders.length).setValues([cleanHeaders]);
  cleanDataSheet.getRange(1, 1, 1, cleanHeaders.length).setFontWeight("bold");
  cleanDataSheet.setFrozenRows(1);
  protectHeaderRow(cleanDataSheet);

  // 6. Create "Clusters" sheet
  var clustersSheet = ss.insertSheet(SHEETS.CLUSTERS);
  var clustersHeaders = COLUMNS.CLUSTERS;
  clustersSheet.getRange(1, 1, 1, clustersHeaders.length).setValues([clustersHeaders]);
  clustersSheet.getRange(1, 1, 1, clustersHeaders.length).setFontWeight("bold");
  clustersSheet.setFrozenRows(1);
  protectHeaderRow(clustersSheet);

  // 7. Create "Ars Regions" sheet (Hidden)
  var regionsSheet = ss.insertSheet(SHEETS.REGIONS);
  try {
    var csvContent = UrlFetchApp.fetch("https://arsenkin.ru/google_regions.csv").getContentText();
    var csvData = Utilities.parseCsv(csvContent);
    if (csvData.length > 0) {
      regionsSheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);
    }
  } catch (e) {
    regionsSheet.getRange(1, 1).setValue("Error loading regions: " + e.message);
  }
  regionsSheet.hideSheet();

  // 8. Create "Ars API Set" sheet
  var settingsSheet = ss.insertSheet(SHEETS.SETTINGS);
  
  // Setup columns
  var settingsHeaders = COLUMNS.SETTINGS;
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]);
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setFontWeight("bold");
  settingsSheet.setFrozenRows(1);
  protectHeaderRow(settingsSheet);
  
  // Define Settings Rows
  var settingsRows = [
    ["Search Engine", "Google", "Поисковая система"],
    ["Region", "213", "Регион поиска (выберите из списка)"],
    ["Group Type", "hard", "Тип группировки (soft/hard)"],
    ["Group Count", "3", "Степень группировки (2-10)"],
    ["Depth", "10", "Глубина проверки (10, 20, 30)"],
    ["Ignore Main Page", "true", "Исключать главные страницы"],
    ["API Token Status", "Not Set", "Статус токена (меняется через меню)"]
  ];
  
  var startRow = 2;
  settingsSheet.getRange(startRow, 1, settingsRows.length, 3).setValues(settingsRows);
  
  // --- DATA VALIDATION ---
  
  // 1. Search Engine (B2)
  var seRule = SpreadsheetApp.newDataValidation().requireValueInList(["Google", "Yandex"]).build();
  settingsSheet.getRange("B2").setDataValidation(seRule);
  
  // 2. Region (B3) - from Ars Regions sheet
  // Assuming ID is in Col A, Name in Col B in the CSV? 
  // Let's check CSV format. Usually it is ID;Name or Name;ID.
  // We'll create a dropdown from the range in REGIONS sheet.
  // Ideally we want to see Name but store ID. Sheets dropdowns store the value selected.
  // So user selects "213". Maybe we should show "Moscow (213)"?
  // For now, let's just point to the Regions sheet column A (IDs) if that's what API needs.
  // Update: Arsenkin CSV usually has ID, ParentID, Name, Type.
  // Let's assume Col A is ID.
  var regionRange = regionsSheet.getRange(2, 1, regionsSheet.getLastRow() - 1, 1);
  var regionRule = SpreadsheetApp.newDataValidation().requireValueInRange(regionRange).build();
  settingsSheet.getRange("B3").setDataValidation(regionRule);
  
  // 3. Group Type (B4)
  var groupRule = SpreadsheetApp.newDataValidation().requireValueInList(["soft", "hard"]).build();
  settingsSheet.getRange("B4").setDataValidation(groupRule);
  
  // 4. Group Count (B5)
  var countRule = SpreadsheetApp.newDataValidation().requireValueInList(["2", "3", "4", "5", "6", "7", "8", "9", "10"]).build();
  settingsSheet.getRange("B5").setDataValidation(countRule);
  
  // 5. Depth (B6)
  var depthRule = SpreadsheetApp.newDataValidation().requireValueInList(["10", "20", "30"]).build();
  settingsSheet.getRange("B6").setDataValidation(depthRule);
  
  // 6. Ignore Main (B7)
  var boolRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  settingsSheet.getRange("B7").setDataValidation(boolRule);
  
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
  // Position "Intent Types" at index 1
  intentSheet.activate();
  ss.moveActiveSheet(1);
  
  // Position "Raw Data" at index 2
  rawDataSheet.activate();
  ss.moveActiveSheet(2);
  
  // Position "Clean Data" at index 3
  cleanDataSheet.activate();
  ss.moveActiveSheet(3);
  
  // Switch back to the main sheet
  intentSheet.activate();
  
  // Show success message
  ss.toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}

/**
 * Protects the first row (headers) of the given sheet.
 * Only the owner will be able to edit it.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to protect.
 */
function protectHeaderRow(sheet) {
  var protection = sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect();
  protection.setDescription('Protected Headers');
  
  // Remove all editors except the script owner/runner
  var me = Session.getEffectiveUser();
  protection.addEditor(me);
  protection.removeEditors(protection.getEditors());
  
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}
