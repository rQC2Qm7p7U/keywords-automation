export interface ISheetRepository {
    getData(sheetName: string): any[][];
    setData(sheetName: string, data: any[][]): void;
    appendData(sheetName: string, data: any[][]): void;
    clearContent(sheetName: string): void;
    getColumnValues(sheetName: string, colName: string): any[];
    setColumnValues(sheetName: string, colName: string, values: any[]): void;
    clearColumnBackgrounds(sheetName: string, colName: string): void;
    protectHeaderRow(sheetName: string): void;
    getHeaders(sheetName: string): string[];
    getBackgrounds(sheetName: string, colName: string): string[][];
    setBackgrounds(sheetName: string, colName: string, backgrounds: string[][]): void;
    setCellValue(sheetName: string, row: number, col: number, value: any): void;
}

export class SheetRepository implements ISheetRepository {
    private getSheet(sheetName: string): GoogleAppsScript.Spreadsheet.Sheet {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
        return sheet;
    }

    private getColumnIndex(sheetName: string, colName: string): number {
        let cols: string[] | null = null;

        // Check global COLUMNS object (defined in Config.ts/globals.d.ts)
        // In a pure specific implementation we might want to inject config, 
        // but for now we rely on the global Project Config to keep it simple.
        if (sheetName === SHEETS.RAW_DATA) cols = COLUMNS.RAW_DATA;
        else if (sheetName === SHEETS.CLEAN_DATA) cols = COLUMNS.CLEAN_DATA;
        else if (sheetName === SHEETS.INTENT_TYPES) cols = COLUMNS.INTENT_TYPES;
        else if (sheetName === SHEETS.CLUSTERS) cols = COLUMNS.CLUSTERS;
        else if (sheetName === SHEETS.SETTINGS) cols = COLUMNS.SETTINGS;

        if (!cols) return -1;
        return cols.indexOf(colName);
    }

    getData(sheetName: string): any[][] {
        const sheet = this.getSheet(sheetName);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) return []; // Only header or empty

        // Get all data excluding header
        return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    }

    setData(sheetName: string, data: any[][]): void {
        const sheet = this.getSheet(sheetName);

        // Clear existing data (keep headers)
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }

        if (data.length === 0) return;

        sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    }

    appendData(sheetName: string, data: any[][]): void {
        if (data.length === 0) return;
        const sheet = this.getSheet(sheetName);
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data);
    }

    clearContent(sheetName: string): void {
        const sheet = this.getSheet(sheetName);
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        }
    }

    getColumnValues(sheetName: string, colName: string): any[] {
        const sheet = this.getSheet(sheetName);
        const colIndex = this.getColumnIndex(sheetName, colName);
        if (colIndex === -1) return [];

        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        return sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues().map(r => r[0]);
    }

    setColumnValues(sheetName: string, colName: string, values: any[]): void {
        if (values.length === 0) return;
        const sheet = this.getSheet(sheetName);
        const colIndex = this.getColumnIndex(sheetName, colName);
        if (colIndex === -1) return;

        // Ensure we don't write more rows than exist? 
        // Or do we assume values matches data length?
        // Usually used for updating a column of existing rows.

        sheet.getRange(2, colIndex + 1, values.length, 1).setValues(values.map(v => [v]));
    }

    clearColumnBackgrounds(sheetName: string, colName: string): void {
        const sheet = this.getSheet(sheetName);
        const colIndex = this.getColumnIndex(sheetName, colName);
        if (colIndex === -1) return;

        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return;

        sheet.getRange(2, colIndex + 1, lastRow - 1, 1).setBackground(null);
    }

    protectHeaderRow(sheetName: string): void {
        const sheet = this.getSheet(sheetName);
        const protection = sheet.getRange(1, 1, 1, sheet.getLastColumn()).protect();
        protection.setDescription('Protected Headers');

        const me = Session.getEffectiveUser();
        protection.addEditor(me);
        protection.removeEditors(protection.getEditors());

        if (protection.canDomainEdit()) {
            protection.setDomainEdit(false);
        }
    }

    getHeaders(sheetName: string): string[] {
        const sheet = this.getSheet(sheetName);
        const lastCol = sheet.getLastColumn();
        if (lastCol === 0) return [];
        return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }

    getBackgrounds(sheetName: string, colName: string): string[][] {
        const sheet = this.getSheet(sheetName);
        const colIndex = this.getColumnIndex(sheetName, colName);
        if (colIndex === -1) return [];

        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        return sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getBackgrounds();
    }

    setBackgrounds(sheetName: string, colName: string, backgrounds: string[][]): void {
        if (backgrounds.length === 0) return;
        const sheet = this.getSheet(sheetName);
        const colIndex = this.getColumnIndex(sheetName, colName);
        if (colIndex === -1) return;

        // Ensure dimensions match
        sheet.getRange(2, colIndex + 1, backgrounds.length, 1).setBackgrounds(backgrounds);
    }

    setCellValue(sheetName: string, row: number, col: number, value: any): void {
        const sheet = this.getSheet(sheetName);
        sheet.getRange(row, col).setValue(value);
    }

    // Specific Data Access Methods that were loosely in Structure/Service
    // e.g. getting settings
}
