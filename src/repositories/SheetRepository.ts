

import { SHEETS, COLUMNS } from "../Config";
import { SheetDataMapper } from "../utils/SheetDataMapper";

export interface ISheetRepository {
    getData(sheetName: string): any[][];
    setData(sheetName: string, data: any[][]): void;
    appendData(sheetName: string, data: any[][]): void;
    clearContent(sheetName: string): void;
    getColumnValues(sheetName: string, colName: string): any[];
    setColumnValues(sheetName: string, colName: string, values: any[]): void;
    clearColumnValues(sheetName: string, colName: string): void;
    clearColumnBackgrounds(sheetName: string, colName: string): void;
    protectHeaderRow(sheetName: string): void;
    getHeaders(sheetName: string): string[];
    getBackgrounds(sheetName: string, colName: string): string[][];
    setBackgrounds(sheetName: string, colName: string, backgrounds: string[][]): void;
    setCellValue(sheetName: string, row: number, col: number, value: any): void;
    getMapper(sheetName: string): SheetDataMapper;
    invalidateCache(sheetName?: string): void;
}

export class SheetRepository implements ISheetRepository {
    private sheetCache = new Map<string, GoogleAppsScript.Spreadsheet.Sheet>();
    private headerCache = new Map<string, string[]>();

    private getSheet(sheetName: string): GoogleAppsScript.Spreadsheet.Sheet {
        if (this.sheetCache.has(sheetName)) return this.sheetCache.get(sheetName)!;
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
        this.sheetCache.set(sheetName, sheet);
        return sheet;
    }

    /**
     * Clears cached sheet/header references.
     * Call after structural changes or between independent operations.
     */
    invalidateCache(sheetName?: string): void {
        if (sheetName) {
            this.sheetCache.delete(sheetName);
            this.headerCache.delete(sheetName);
        } else {
            this.sheetCache.clear();
            this.headerCache.clear();
        }
    }

    private getColumnIndex(sheetName: string, colName: string): number {
        const headers = this.getHeaders(sheetName);
        return headers.indexOf(colName);
    }

    getHeaders(sheetName: string): string[] {
        if (this.headerCache.has(sheetName)) return this.headerCache.get(sheetName)!;
        const sheet = this.getSheet(sheetName);
        const lastCol = sheet.getLastColumn();
        if (lastCol === 0) return [];
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
        this.headerCache.set(sheetName, headers);
        return headers;
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

    clearColumnValues(sheetName: string, colName: string): void {
        const sheet = this.getSheet(sheetName);
        const colIndex = this.getColumnIndex(sheetName, colName);
        if (colIndex === -1) return;

        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return;

        // Clear content from row 2 to end
        sheet.getRange(2, colIndex + 1, lastRow - 1, 1).clearContent();
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

    getMapper(sheetName: string): SheetDataMapper {
        const headers = this.getHeaders(sheetName);
        if (headers.length === 0) {
            throw new Error(`Sheet '${sheetName}' has no headers. Cannot create mapper.`);
        }
        return new SheetDataMapper(headers);
    }
}
