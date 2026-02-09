/**
 * Google Apps Script Entry Point
 * This file contains top-level function declarations that delegate to the bundled application logic.
 */

function onOpen(e) {
    return App.onOpen(e);
}

function handleOpenSidebar() {
    return App.handleOpenSidebar();
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

function getSettings() {
    return App.getSettings();
}

function saveSettings(settings) {
    return App.saveSettings(settings);
}

function getRegions() {
    return App.getRegions();
}

function handlePrepareAdsData() {
    return App.handlePrepareAdsData();
}

function handleFormatAdsData() {
    return App.handleFormatAdsData();
}
