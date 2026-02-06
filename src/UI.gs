/**
 * UI.gs
 * Handles all User Interface interactions, menus, and dialogs.
 */

/**
 * Creates the custom menu when the spreadsheet opens.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu(MENU.TITLE);
  
  MENU.ITEMS.forEach(function(item) {
    menu.addItem(item.caption, item.functionName);
  });
  
  menu.addToUi();
}

/**
 * Handles the "Create Structure" menu item click.
 * Shows a confirmation dialog before proceeding.
 */
function handleCreateStructure() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert(
    MESSAGES.UI.TITLE_WARNING,
    MESSAGES.WARNINGS.CREATE_STRUCTURE,
    ui.ButtonSet.YES_NO
  );
  
  if (response == ui.Button.YES) {
    createStructure();
  } else {
    // User clicked No or X
    // Do nothing
  }
}
