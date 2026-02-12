/**
 * Structure.gs
 * Contains the logic for managing the spreadsheet structure.
 */

import { SHEETS, COLUMNS, CONFIG } from "./Config";
import { MESSAGES } from "./Messages";

/**
 * Deletes all existing sheets and creates the new structure.
 * This is a destructive operation.
 */
export function createStructure() {
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

  // 7. Create "Ads Data" sheet
  const adsDataSheet = ss.insertSheet(SHEETS.ADS_DATA);
  const adsHeaders = COLUMNS.ADS_DATA;
  adsDataSheet.getRange(1, 1, 1, adsHeaders.length).setValues([adsHeaders]);
  adsDataSheet.getRange(1, 1, 1, adsHeaders.length).setFontWeight("bold");
  adsDataSheet.setFrozenRows(1);
  protectHeaderRow(adsDataSheet);

  // Apply Validation & Formulas for "Len" columns
  applyAdsDataFormulas(adsDataSheet);

  // 8. Create "Ads Phrase" sheet
  const adsPhraseSheet = ss.insertSheet(SHEETS.ADS_PHRASE);
  const adsPhraseHeaders = COLUMNS.ADS_PHRASE;
  adsPhraseSheet.getRange(1, 1, 1, adsPhraseHeaders.length).setValues([adsPhraseHeaders]);
  adsPhraseSheet.getRange(1, 1, 1, adsPhraseHeaders.length).setFontWeight("bold");
  adsPhraseSheet.setFrozenRows(1);
  protectHeaderRow(adsPhraseSheet);

  // 9. Create "Ads Adaptive" sheet
  const adsAdaptiveSheet = ss.insertSheet(SHEETS.ADS_ADAPTIVE);
  const adsAdaptiveHeaders = COLUMNS.ADS_ADAPTIVE;
  adsAdaptiveSheet.getRange(1, 1, 1, adsAdaptiveHeaders.length).setValues([adsAdaptiveHeaders]);
  adsAdaptiveSheet.getRange(1, 1, 1, adsAdaptiveHeaders.length).setFontWeight("bold");
  adsAdaptiveSheet.setFrozenRows(1);
  protectHeaderRow(adsAdaptiveSheet);

  // 10. Create "Regions" sheet (Hidden)
  const regionsSheet = ss.insertSheet(SHEETS.REGIONS);
  let defaultRegionName = "";
  let defaultRegionSearch = "";

  try {
    const csvContent = UrlFetchApp.fetch("https://arsenkin.ru/google_regions.csv").getContentText();
    const csvData = Utilities.parseCsv(csvContent);

    if (csvData.length > 0) {
      let reorderedData = csvData.map(row => {
        const id = row[0];
        const enName = (row.length > 1 && row[1]) ? row[1] : id;
        const ruName = (row.length > 2 && row[2]) ? row[2] : enName;
        const compositeName = `${ruName} | ${enName}`;
        return [compositeName, id];
      });

      reorderedData.sort((a, b) => a[0].localeCompare(b[0]));

      const defaults = reorderedData.find(r => String(r[1]) === "213");
      if (defaults) {
        defaultRegionName = defaults[0];
        defaultRegionSearch = "Москва";
      } else {
        defaultRegionName = reorderedData.length > 0 ? reorderedData[0][0] : "213";
        defaultRegionSearch = "";
      }

      if (regionsSheet.getMaxRows() < reorderedData.length) {
        regionsSheet.insertRowsAfter(regionsSheet.getMaxRows(), reorderedData.length - regionsSheet.getMaxRows());
      }

      regionsSheet.getRange(1, 1, reorderedData.length, 2).setValues(reorderedData);
    }
  } catch (e: any) {
    regionsSheet.getRange(1, 1).setValue("Error loading regions: " + e.message);
  }
  regionsSheet.hideSheet();

  // 8. Create "Settings" sheet
  const settingsSheet = ss.insertSheet(SHEETS.SETTINGS);

  // Setup columns
  const settingsHeaders = COLUMNS.SETTINGS;
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]);
  settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setFontWeight("bold");
  settingsSheet.setFrozenRows(1);
  protectHeaderRow(settingsSheet);

  // Define Settings Rows
  const settingsRows = [
    // --- GENERAL ---
    ["GENERAL", "", ""],
    ["Search Engine", "Google", "Поисковая система (Google/Yandex)"],
    ["Region Search", defaultRegionSearch, "Введите название города (например 'Mosc' или 'Моск')"],
    ["Region", defaultRegionName, "Выберите регион из выпадающего списка (фильтруется по поиску)"],

    // --- CLUSTERING ---
    ["CLUSTERING", "", ""],
    ["Group Type", "hard", "Тип группировки (soft/hard)"],
    ["Group Count", "3", "Степень группировки (2-10)"],
    ["Depth", "10", "Глубина проверки (10, 20, 30)"],
    ["Ignore Main Page", "true", "Исключать главные страницы"],

    // --- ADS DATA ---
    ["ADS DATA", "", ""],
    ["Campaign Name", "Keywords Automation", "Название кампании для экспорта"],
    ["Target URL", "https://example.com", "Целевая ссылка для объявлений"],
    ["Max Headline Length", "30", "Максимальная длина заголовка (обычно 30)"],
    ["Max Description Length", "90", "Максимальная длина описания (обычно 90)"],
    ["Max Path Length", "15", "Максимальная длина пути (обычно 15)"],

    // --- UTM SETTINGS ---
    ["UTM SETTINGS", "", ""],
    ["UTM Source", "google", "Источник кампании (utm_source)"],
    ["UTM Medium", "cpc", "Тип трафика (utm_medium)"],
    ["UTM Campaign", "{campaignid}", "Название кампании (utm_campaign)"],
    ["UTM Content", "{creative}", "Содержание объявления (utm_content)"],
    ["UTM Term", "{keyword}", "Ключевое слово (utm_term)"],
    ["Device", "{device}", "Тип устройства (device)"],

    // --- SYSTEM ---
    ["SYSTEM", "", ""],
    ["API Token Status", "Not Set", "Статус токена (меняется через меню)"]
  ];

  const startRow = 2;
  settingsSheet.getRange(startRow, 1, settingsRows.length, 3).setValues(settingsRows);

  // Values Formatting
  const headerRows = [2, 6, 11, 17, 24];
  headerRows.forEach(r => {
    settingsSheet.getRange(r, 1, 1, 3).setBackground("#d9d9d9").setFontWeight("bold");
  });

  // --- DATA VALIDATION ---

  // 1. Search Engine (Row 3 -> B3)
  const seRule = SpreadsheetApp.newDataValidation().requireValueInList(["Google", "Yandex"]).build();
  settingsSheet.getRange("B3").setDataValidation(seRule);

  // 2. Region Select (Row 5 -> B5)
  const filteredRange = regionsSheet.getRange("D1:D50");
  const regionRule = SpreadsheetApp.newDataValidation().requireValueInRange(filteredRange).build();
  settingsSheet.getRange("B5").setDataValidation(regionRule);

  // Update Region filter formula (B4 is Search)
  const searchCell = `'${SHEETS.SETTINGS}'!B4`;
  const regionFormula = `=IF(ISBLANK(${searchCell}), ARRAY_CONSTRAIN(A:A, 50, 1), QUERY(A:A, "Select A Where lower(A) contains '" & LOWER(${searchCell}) & "' Limit 50"))`;
  regionsSheet.getRange("D1").setFormula(regionFormula);

  // 3. Group Type (Row 7 -> B7)
  const groupRule = SpreadsheetApp.newDataValidation().requireValueInList(["soft", "hard"]).build();
  settingsSheet.getRange("B7").setDataValidation(groupRule);

  // 4. Group Count (Row 8 -> B8)
  const countRule = SpreadsheetApp.newDataValidation().requireValueInList(["2", "3", "4", "5", "6", "7", "8", "9", "10"]).build();
  settingsSheet.getRange("B8").setDataValidation(countRule);

  // 5. Depth (Row 9 -> B9)
  const depthRule = SpreadsheetApp.newDataValidation().requireValueInList(["10", "20", "30"]).build();
  settingsSheet.getRange("B9").setDataValidation(depthRule);

  // 6. Ignore Main (Row 10 -> B10)
  const boolRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  settingsSheet.getRange("B10").setDataValidation(boolRule);

  // UTM Medium dropdown (Row 19: B19)
  const utmMediumRule = SpreadsheetApp.newDataValidation().requireValueInList(["cpc", "organic", "email", "social", "banner", "cpa"]).build();
  settingsSheet.getRange("B19").setDataValidation(utmMediumRule);

  // Auto-resize
  settingsSheet.autoResizeColumns(1, 3);
  settingsSheet.setColumnWidth(2, 200);

  // 9. Delete Temp
  ss.deleteSheet(tempSheet);

  // 10. Reorder
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
  adsDataSheet.activate();
  ss.moveActiveSheet(6);
  adsPhraseSheet.activate();
  ss.moveActiveSheet(7);
  adsAdaptiveSheet.activate();
  ss.moveActiveSheet(8);

  settingsSheet.activate();
  ss.toast(MESSAGES.SUCCESS.STRUCTURE_CREATED);
}

/**
 * Protects the first row (headers) of the given sheet.
 * Only the owner will be able to edit it.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to protect.
 */
function protectHeaderRow(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  const protection = sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect();
  protection.setDescription('Protected Headers');

  const me = Session.getEffectiveUser();
  protection.addEditor(me);
  protection.removeEditors(protection.getEditors());

  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}

/**
 * Applies Validation, Formulas, and Conditional Formatting to Ads Data sheet.
 * Can be called after clearing/recreating data to restore dynamic functionality.
 */
export function applyAdsDataFormulas(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] as string[];

  const columnToLetter = (column: number) => {
    let temp, letter = '';
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  };

  const rules: GoogleAppsScript.Spreadsheet.ConditionalFormatRule[] = [];

  // Clean existing rules for Len columns? Or just append?
  // Be careful not to duplicate rules if called multiple times.
  // Ideally, we should clear rules for Len columns first, but GAS logic is tricky.
  // For now, we assume this is called on a fresh or cleared sheet context or accept appending.
  // Better: Get existing rules, keep non-Len rules, add new Len rules.
  // But identifying "Len rule" is hard.
  // Let's just append for now as this is usually called after clear.

  for (let i = 0; i < headers.length; i++) {
    const colName = headers[i];
    const colIndex = i + 1;
    let limitRef = "";

    if (colName.startsWith("Len")) {
      // Determine limit based on context - referencing Settings Sheet
      if (colName === "Len" || (colName.startsWith("Len ") && !colName.includes("D") && !colName.includes("P"))) {
        limitRef = `'${SHEETS.SETTINGS}'!$B$14`;
      } else if (colName.startsWith("Len D")) {
        limitRef = `'${SHEETS.SETTINGS}'!$B$15`;
      } else if (colName.startsWith("Len P")) {
        limitRef = `'${SHEETS.SETTINGS}'!$B$16`;
      }

      if (limitRef) {
        // 1. Clear Content (ensure no static values like empty strings block ArrayFormula)
        if (sheet.getMaxRows() > 1) {
          sheet.getRange(2, colIndex, sheet.getMaxRows() - 1, 1).clearContent();
        }

        // 2. Set ArrayFormula
        const targetColLetter = columnToLetter(colIndex - 1);
        const formula = `=ARRAYFORMULA(IF(${targetColLetter}2:${targetColLetter}="", "", ${limitRef} - LEN(${targetColLetter}2:${targetColLetter})))`;
        sheet.getRange(2, colIndex).setFormula(formula);

        // 3. Conditional Formatting
        const range = sheet.getRange(2, colIndex, sheet.getMaxRows() - 1, 1);

        // Red: < 0
        const ruleRed = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberLessThan(0)
          .setBackground("#F4CCCC")
          .setRanges([range])
          .build();

        // Yellow: > 0 AND <= 5
        const ruleYellow = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberBetween(1, 5)
          .setBackground("#FFF2CC")
          .setRanges([range])
          .build();

        // Green: == 0
        const ruleGreen = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(0)
          .setBackground("#D9EAD3")
          .setRanges([range])
          .build();

        rules.push(ruleRed, ruleYellow, ruleGreen);
      }
    }
  }

  if (rules.length > 0) {
    sheet.setConditionalFormatRules([
      ...sheet.getConditionalFormatRules(),
      ...rules
    ]);
  }
}
