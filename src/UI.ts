/**
 * UI.gs
 * Handles all User Interface interactions, menus, and dialogs.
 */

/**
 * Creates the custom menu when the spreadsheet opens.
 * Called from Code.gs onOpen.
 */
function createProjectMenu() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu(MENU.TITLE);

  MENU.ITEMS.forEach(item => {
    menu.addItem(item.caption, item.functionName);
  });

  menu.addToUi();
}

