/**
 * ArsenkinClusters.gs
 * Handles interactions with the Arsenkin Tools API for Clustering.
 * Documentation: https://help.arsenkin.ru/api/clustering-dev
 */

var ARSENKIN_API = {
  BASE_URL: "https://arsenkin.ru/api/tools/task",
  CHECK_URL: "https://arsenkin.ru/api/tools/check",
  RESULT_URL: "https://arsenkin.ru/api/tools/result" 
};

/**
 * Sets the API token in the script properties (Secure storage).
 * Called from UI prompt.
 */
function setApiToken(token) {
  if (!token || token.trim() === "") {
    throw new Error("Токен не может быть пустым.");
  }
  PropertiesService.getScriptProperties().setProperty("ARSENKIN_API_TOKEN", token.trim());
  
  // Update status in Settings sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (sheet) {
    // Find "API Token Status" row
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] == "API Token Status") {
            sheet.getRange(i + 1, 2).setValue("✅ Set (Securely stored)");
            break;
        }
    }
  }
}

/**
 * Retrieves the API token from script properties.
 */
function getApiToken() {
  return PropertiesService.getScriptProperties().getProperty("ARSENKIN_API_TOKEN");
}

/**
 * Retrieves API settings from the "Settings" sheet and PropertiesService.
 * @return {Object} An object containing keys like API_TOKEN, REGION, etc.
 */
function getApiSettings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  
  if (!sheet) {
    throw new Error("Лист настроек '" + SHEETS.SETTINGS + "' не найден. Пожалуйста, пересоздайте структуру.");
  }
  
  var data = sheet.getDataRange().getValues();
  var settings = {};
  
  // Skip header
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = data[i][1];
    if (key) {
      // Map display names to internal keys if needed
      if (key == "Search Engine") settings.SE = (val == "Yandex") ? 1 : 2; // Google=2, Yandex=1
      else if (key == "Region") settings.REGION = val; // Assuming ID is stored/selected
      else if (key == "Group Type") settings.GROUP_TYPE = val;
      else if (key == "Group Count") settings.GROUP_COUNT = val;
      else if (key == "Depth") settings.DEPTH = val;
      else if (key == "Ignore Main Page") settings.IGNORE_MAIN_PAGE = val;
    }
  }
  
  var token = getApiToken();
  if (!token) {
    throw new Error("API токен не установлен. Используйте меню '🔐 Установить токен'.");
  }
  settings.API_TOKEN = token;
  
  return settings;
}

/**
 * Creates a clustering task via Arsenkin API.
 * 
 * @param {Array<string>} queries - List of keywords to cluster.
 * @param {Object} settings - Settings object from getApiSettings().
 * @return {number} The task_id.
 */
function createClusteringTask(queries, settings) {
  var payload = {
    "tools_name": "clustering",
    "data": {
      "queries": queries,
      "group": settings.GROUP_TYPE || "hard",
      "count": Number(settings.GROUP_COUNT) || 3,
      "main": String(settings.IGNORE_MAIN_PAGE) === "true", // Boolean
      "se": Number(settings.SE) || 2, // Default Google
      "region": Number(settings.REGION) || 213,
      "depth": Number(settings.DEPTH) || 10
    }
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + settings.API_TOKEN
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch("https://arsenkin.ru/api/tools/task", options);
  var json = JSON.parse(response.getContentText());
  
  if (json.error) {
    throw new Error("Ошибка API (Создание задачи): " + JSON.stringify(json));
  }
  
  if (!json.task_id) {
    throw new Error("Не получен ID задачи от API. Ответ: " + JSON.stringify(json));
  }
  
  return json.task_id;
}

/**
 * Checks the status of a task.
 * @return {Object|null} Result data or null.
 */
function checkTaskStatus(taskId, token) {
  var url = "https://arsenkin.ru/api/tools/check?task_id=" + taskId;
  
  var options = {
    "method": "get",
    "headers": {
      "Authorization": "Bearer " + token
    },
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());
  
  if (json.error) {
    throw new Error("Ошибка API (Проверка статуса): " + JSON.stringify(json));
  }
  
  if (json.status === "Done") {
     return json.result; // Array of clusters
  }
  
  if (json.status === "Error") {
      throw new Error("Задача завершилась ошибкой на сервере Arsenkin.");
  }
  
  return null; // Still running
}

/**
 * Main function to run the clustering process.
 * Reads data from Clean Data, sends to API, waits for result, and updates the Clusters sheet.
 */
function runClustering() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  var clustersSheet = ss.getSheetByName(SHEETS.CLUSTERS);
  
  if (!cleanSheet) throw new Error("Лист '" + SHEETS.CLEAN_DATA + "' не найден.");
  if (!clustersSheet) throw new Error("Лист '" + SHEETS.CLUSTERS + "' не найден. Создайте структуру заново.");
  
  // 1. Get Settings and API Token
  var settings = getApiSettings();
  
  // 2. Get Keywords from Clean Data
  var lastRow = cleanSheet.getLastRow();
  if (lastRow <= 1) {
    Browser.msgBox("Нет данных для кластеризации в листе " + SHEETS.CLEAN_DATA);
    return;
  }
  
  var keywordIdx = COLUMNS.CLEAN_DATA.indexOf("Keyword");
  var keywords = cleanSheet.getRange(2, keywordIdx + 1, lastRow - 1, 1).getValues()
                           .map(function(r) { return r[0]; })
                           .filter(function(k) { return k && String(k).trim() !== ""; });
                           
  if (keywords.length === 0) {
    Browser.msgBox("Нет ключевых слов для кластеризации.");
    return;
  }
  
  if (keywords.length > 20000) { // Increased limit a bit, but still check
     var confirm = Browser.msgBox("Внимание", "Вы отправляете " + keywords.length + " запросов. Продолжить?", Browser.Buttons.YES_NO);
     if (confirm == "no") return;
  }
  
  ss.toast("Отправка задачи в Arsenkin Tools...");
  
  // 3. Create Task
  var taskId;
  try {
    taskId = createClusteringTask(keywords, settings);
  } catch (e) {
    Browser.msgBox("Ошибка при создании задачи: " + e.message);
    return;
  }
  
  ss.toast("Задача ID " + taskId + " создана. Ожидание результатов...");
  
  // 4. Poll for Result
  var result = null;
  var attempts = 0;
  var maxAttempts = 60; // 5 min
  
  while (attempts < maxAttempts) {
    Utilities.sleep(5000); 
    try {
      result = checkTaskStatus(taskId, settings.API_TOKEN);
    } catch (e) {
      console.error("Error checking status: " + e.message);
    }
    
    if (result) break;
    attempts++;
    ss.toast("Обработка... (" + (attempts * 5) + " сек)");
  }
  
  if (!result) {
    Browser.msgBox("Превышено время ожидания результата (5 минут). ID задачи: " + taskId);
    return;
  }
  
  // 5. Process Result and Update CLUSTERS Sheet
  ss.toast("Результаты получены. Запись в лист Clusters...");
  
  // Clear old clusters
  if (clustersSheet.getLastRow() > 1) {
    clustersSheet.getRange(2, 1, clustersSheet.getLastRow() - 1, 3).clearContent();
  }
  
  // Prepare output data
  // Result format: [{ clustered: "Group Name", words: ["kw1", "kw2"], topurl: "url" }, ...]
  var outputRows = [];
  
  result.forEach(function(cluster) {
    var groupName = cluster.clustered;
    var groupUrl = cluster.topurl || "";
    
    if (cluster.words && Array.isArray(cluster.words)) {
      cluster.words.forEach(function(kw) {
          // Format: Keyword | Cluster Group | Cluster URL
          outputRows.push([kw, groupName, groupUrl]);
      });
    }
  });
  
  if (outputRows.length > 0) {
    clustersSheet.getRange(2, 1, outputRows.length, 3).setValues(outputRows);
  }
  
  clustersSheet.activate();
  ss.toast("Кластеризация завершена!");
  Browser.msgBox("Готово! Результаты в листе Clusters.");
}

/**
 * Main function to run the clustering process.
 * Reads data from Clean Data, sends to API, waits for result, and updates the sheet.
 */
function runClustering() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!cleanSheet) {
    throw new Error("Лист '" + SHEETS.CLEAN_DATA + "' не найден.");
  }
  
  // 1. Get Settings and API Token
  var settings = getApiSettings();
  
  // 2. Get Keywords from Clean Data
  var lastRow = cleanSheet.getLastRow();
  if (lastRow <= 1) {
    Browser.msgBox("Нет данных для кластеризации в листе " + SHEETS.CLEAN_DATA);
    return;
  }
  
  var keywordIdx = COLUMNS.CLEAN_DATA.indexOf("Keyword");
  var keywords = cleanSheet.getRange(2, keywordIdx + 1, lastRow - 1, 1).getValues()
                           .map(function(r) { return r[0]; })
                           .filter(function(k) { return k && String(k).trim() !== ""; });
                           
  if (keywords.length === 0) {
    Browser.msgBox("Нет ключевых слов для кластеризации.");
    return;
  }
  
  if (keywords.length > 10000) {
     var confirm = Browser.msgBox("Внимание", "Вы пытаетесь кластеризовать " + keywords.length + " запросов. Это может занять много времени и лимитов. Продолжить?", Browser.Buttons.YES_NO);
     if (confirm == "no") return;
  }
  
  ss.toast("Отправка задачи в Arsenkin Tools...");
  
  // 3. Create Task
  var taskId;
  try {
    taskId = createClusteringTask(keywords, settings);
  } catch (e) {
    Browser.msgBox("Ошибка при создании задачи: " + e.message);
    return;
  }
  
  ss.toast("Задача ID " + taskId + " создана. Ожидание результатов...");
  
  // 4. Poll for Result
  // Note: Apps Script runtime limit is 6 mins. Simple POLLING may timeout for huge tasks.
  // For V1 we do simple polling.
  var result = null;
  var attempts = 0;
  var maxAttempts = 60; // 60 * 5 sec = 300 sec = 5 min
  
  while (attempts < maxAttempts) {
    Utilities.sleep(5000); // Wait 5 sec
    try {
      result = checkTaskStatus(taskId, settings.API_TOKEN);
    } catch (e) {
      console.error("Error checking status: " + e.message); // Log but continue retry
    }
    
    if (result) break;
    
    attempts++;
    ss.toast("Обработка... (" + (attempts * 5) + " сек)");
  }
  
  if (!result) {
    Browser.msgBox("Превышено время ожидания результата (5 минут). Проверьте статус задачи в личном кабинете Arsenkin. ID задачи: " + taskId);
    return;
  }
  
  // 5. Process Result and Update Sheet
  ss.toast("Результаты получены. Запись в таблицу...");
  
  // Result format: [{ clustered: "name", words: ["kw1", "kw2"] }, ...]
  // We need to map keyword -> cluster name
  var clusterMap = {};
  var clusterUrlMap = {}; // Not sure if URL is provided in simple result, docs said "topurl"
  
  result.forEach(function(cluster) {
    var clusterName = cluster.clustered;
    var topUrl = cluster.topurl;
    
    if (cluster.words && Array.isArray(cluster.words)) {
      cluster.words.forEach(function(kw) {
        clusterMap[kw.toLowerCase()] = clusterName;
        // Also map URL if needed
        if (topUrl) clusterUrlMap[kw.toLowerCase()] = topUrl;
      });
    }
  });
  
  // Write to Clean Data
  // We need to write into "Cluster" and "Cluster URL" columns
  var clusterColIdx = COLUMNS.CLEAN_DATA.indexOf("Cluster");
  var clusterUrlColIdx = COLUMNS.CLEAN_DATA.indexOf("Cluster URL");
  
  if (clusterColIdx === -1) {
    Browser.msgBox("Колонка 'Cluster' не найдена. Обновите структуру таблицы.");
    return;
  }
  
  var outputRange = cleanSheet.getRange(2, clusterColIdx + 1, lastRow - 1, 1);
  var outputValues = outputRange.getValues(); // Current values (if any)
  
  // Prepare URL output if column exists
  var outputUrls = null;
  var outputUrlRange = null;
  if (clusterUrlColIdx !== -1) {
    outputUrlRange = cleanSheet.getRange(2, clusterUrlColIdx + 1, lastRow - 1, 1);
    outputUrls = outputUrlRange.getValues();
  }
  
  // Iterate original keywords to keep order
  var fullKeywords = cleanSheet.getRange(2, keywordIdx + 1, lastRow - 1, 1).getValues();
  
  for (var i = 0; i < fullKeywords.length; i++) {
    var kw = String(fullKeywords[i][0]).trim().toLowerCase();
    if (clusterMap[kw]) {
      outputValues[i][0] = clusterMap[kw];
      if (outputUrls && clusterUrlMap[kw]) {
        outputUrls[i][0] = clusterUrlMap[kw];
      }
    } else {
        // If not found in clusters (maybe "Unclustered" logic needed? Or just leave empty/old)
        // Usually unclustered words are returned in a separate group or implied.
        // For now, overwrite with empty if we want to clean old data?
        // Or keep existing? Let's overwrite to ensure data consistency with this run.
        outputValues[i][0] = ""; 
        if (outputUrls) outputUrls[i][0] = "";
    }
  }
  
  outputRange.setValues(outputValues);
  if (outputUrls && outputUrlRange) {
    outputUrlRange.setValues(outputUrls);
  }
  
  ss.toast("Кластеризация завершена!");
  Browser.msgBox("Готово! Кластеризация выполнена.");
}

/**
 * Main function to run the clustering process.
 * Reads data from Clean Data, sends to API, waits for result, and updates the sheet.
 */
function runClustering() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!cleanSheet) {
    throw new Error("Лист '" + SHEETS.CLEAN_DATA + "' не найден.");
  }
  
  // 1. Get Settings and API Token
  var settings = getApiSettings();
  
  // 2. Get Keywords from Clean Data
  var lastRow = cleanSheet.getLastRow();
  if (lastRow <= 1) {
    Browser.msgBox("Нет данных для кластеризации в листе " + SHEETS.CLEAN_DATA);
    return;
  }
  
  var keywordIdx = COLUMNS.CLEAN_DATA.indexOf("Keyword");
  var keywords = cleanSheet.getRange(2, keywordIdx + 1, lastRow - 1, 1).getValues()
                           .map(function(r) { return r[0]; })
                           .filter(function(k) { return k && String(k).trim() !== ""; });
                           
  if (keywords.length === 0) {
    Browser.msgBox("Нет ключевых слов для кластеризации.");
    return;
  }
  
  if (keywords.length > 10000) {
     var confirm = Browser.msgBox("Внимание", "Вы пытаетесь кластеризовать " + keywords.length + " запросов. Это может занять много времени и лимитов. Продолжить?", Browser.Buttons.YES_NO);
     if (confirm == "no") return;
  }
  
  ss.toast("Отправка задачи в Arsenkin Tools...");
  
  // 3. Create Task
  var taskId;
  try {
    taskId = createClusteringTask(keywords, settings);
  } catch (e) {
    Browser.msgBox("Ошибка при создании задачи: " + e.message);
    return;
  }
  
  ss.toast("Задача ID " + taskId + " создана. Ожидание результатов...");
  
  // 4. Poll for Result
  // Note: Apps Script runtime limit is 6 mins. Simple POLLING may timeout for huge tasks.
  // For V1 we do simple polling.
  var result = null;
  var attempts = 0;
  var maxAttempts = 60; // 60 * 5 sec = 300 sec = 5 min
  
  while (attempts < maxAttempts) {
    Utilities.sleep(5000); // Wait 5 sec
    try {
      result = checkTaskStatus(taskId, settings.API_TOKEN);
    } catch (e) {
      console.error("Error checking status: " + e.message); // Log but continue retry
    }
    
    if (result) break;
    
    attempts++;
    ss.toast("Обработка... (" + (attempts * 5) + " сек)");
  }
  
  if (!result) {
    Browser.msgBox("Превышено время ожидания результата (5 минут). Проверьте статус задачи в личном кабинете Arsenkin. ID задачи: " + taskId);
    return;
  }
  
  // 5. Process Result and Update CLUSTERS Sheet
  ss.toast("Результаты получены. Запись в лист Clusters...");
  
  var clustersSheet = ss.getSheetByName(SHEETS.CLUSTERS);
  if (!clustersSheet) {
    // Should have been checked earlier, but just in case
    clustersSheet = ss.insertSheet(SHEETS.CLUSTERS);
  }
  
  // Clear old clusters (keep headers)
  if (clustersSheet.getLastRow() > 1) {
    clustersSheet.getRange(2, 1, clustersSheet.getLastRow() - 1, clustersSheet.getLastColumn()).clearContent();
  }
  
  // Prepare output data
  // Result format: [{ clustered: "Group Name", words: ["kw1", "kw2"], topurl: "url" }, ...]
  var outputRows = [];
  
  result.forEach(function(cluster) {
    var groupName = cluster.clustered;
    var groupUrl = cluster.topurl || "";
    
    if (cluster.words && Array.isArray(cluster.words)) {
      cluster.words.forEach(function(kw) {
          // Format: Keyword | Cluster Group | Cluster URL
          outputRows.push([kw, groupName, groupUrl]);
      });
    }
  });
  
  if (outputRows.length > 0) {
    clustersSheet.getRange(2, 1, outputRows.length, 3).setValues(outputRows);
  }
  
  clustersSheet.activate();
  ss.toast("Кластеризация завершена!");
  Browser.msgBox("Готово! Результаты в листе Clusters.");
}
