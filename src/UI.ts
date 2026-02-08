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
  const menu = ui.createMenu(MENU.TITLE);

  MENU.ITEMS.forEach(item => {
    menu.addItem(item.caption, item.functionName);
  });

  menu.addToUi();
}

