/**
 * UI.gs
 * Handles all User Interface interactions, menus, and dialogs.
 */

import { MENU } from "./Config";

/**
 * Creates the custom menu when the spreadsheet opens.
 * Called from Code.gs onOpen.
 */
export function createProjectMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(MENU.TITLE)
    .addItem(MENU.ITEMS[0].caption, MENU.ITEMS[0].functionName)
    .addSeparator() // Separator after App
    .addItem(MENU.ITEMS[1].caption, MENU.ITEMS[1].functionName)
    .addItem(MENU.ITEMS[2].caption, MENU.ITEMS[2].functionName)
    .addItem(MENU.ITEMS[3].caption, MENU.ITEMS[3].functionName)
    .addItem(MENU.ITEMS[4].caption, MENU.ITEMS[4].functionName)
    .addItem(MENU.ITEMS[5].caption, MENU.ITEMS[5].functionName)
    .addItem(MENU.ITEMS[6].caption, MENU.ITEMS[6].functionName)
    .addItem(MENU.ITEMS[7].caption, MENU.ITEMS[7].functionName)
    .addSeparator()
    .addItem(MENU.ITEMS[8].caption, MENU.ITEMS[8].functionName)
    .addItem(MENU.ITEMS[9].caption, MENU.ITEMS[9].functionName)
    .addSeparator()
    .addItem(MENU.ITEMS[10].caption, MENU.ITEMS[10].functionName)
    .addToUi();
}

/**
 * Opens the React Sidebar.
 */
export function handleOpenSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Automated Keywords")
    .setWidth(400); // Optional, ignored by sidebar but good for dialogs
  SpreadsheetApp.getUi().showSidebar(html);
}

