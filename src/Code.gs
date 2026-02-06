/**
 * Code.gs
 * Main entry point for the application.
 * Exposes global functions needed for the menu.
 */

/**
 * Standard trigger that runs when the spreadsheet opens.
 * @param {Object} e - The event object.
 */
function onOpen(e) {
  createProjectMenu();
}

// Ensure the menu handler is available globally
// Note: handleCreateStructure is already global in UI.gs, 
// but if we were using a strict module system we'd need to expose it here.
// In Apps Script, all files in the project share the same global scope.
