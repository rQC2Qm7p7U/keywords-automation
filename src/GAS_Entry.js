/**
 * Google Apps Script Entry Point
 * This file contains top-level function declarations that delegate to the bundled application logic.
 */

function onOpen(e) {
    return App.onOpen(e);
}

function handleCreateStructure() {
    return App.handleCreateStructure();
}

function handleRemoveDuplicates() {
    return App.handleRemoveDuplicates();
}

function handleCollectNegatives() {
    return App.handleCollectNegatives();
}

function handleTransferRawToClean() {
    return App.handleTransferRawToClean();
}

function handleCleanKeysFromNegatives() {
    return App.handleCleanKeysFromNegatives();
}

function handleRunClustering() {
    return App.handleRunClustering();
}

function handleCheckLastTask() {
    return App.handleCheckLastTask();
}

function handleSetArsenkinToken() {
    return App.handleSetArsenkinToken();
}
