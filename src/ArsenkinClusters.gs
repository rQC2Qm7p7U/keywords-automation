/**
 * ArsenkinClusters.gs
 * Handles interactions with the Arsenkin Tools API for Clustering.
 * Documentation: https://help.arsenkin.ru/api/clustering-dev
 */

var ARSENKIN_API = {
  BASE_URL: "https://arsenkin.ru/api/tools/set", 
  CHECK_URL: "https://arsenkin.ru/api/tools/check",
  RESULT_URL: "https://arsenkin.ru/api/tools/get"
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
      if (key == "Search Engine") settings.SE = (val == "Yandex") ? 1 : 2; // Google=2, Yandex=1
      else if (key == "Region") settings.REGION = val; 
      else if (key == "Group Type") settings.GROUP_TYPE = val;
      else if (key == "Group Count") settings.GROUP_COUNT = val;
      else if (key == "Depth") settings.DEPTH = val;
      else if (key == "Ignore Main Page") {
         settings.IGNORE_MAIN_PAGE = String(val).toLowerCase() === "true";
      }
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
 */
function createClusteringTask(queries, settings) {
  var payload = {
    "tools_name": "clustering",
    "data": {
      "queries": queries,
      "group": settings.GROUP_TYPE || "hard",
      "count": Number(settings.GROUP_COUNT) || 3,
      "main": settings.IGNORE_MAIN_PAGE === true, 
      "se": Number(settings.SE) || 2, 
      "region": Number(settings.REGION) || 213,
      "depth": Number(settings.DEPTH) || 10
    }
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + settings.API_TOKEN },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch(ARSENKIN_API.BASE_URL, options);
  var json = JSON.parse(response.getContentText());
  
  if (json.error) throw new Error("Ошибка API (Создание): " + JSON.stringify(json));
  if (!json.task_id) throw new Error("Не получен ID задачи.");
  return json.task_id;
}

/**
 * Checks the status of a task.
 * @return {string} Status "Done", "Processing", "Error"
 */
function checkTaskStatus(taskId, token) {
  var url = ARSENKIN_API.CHECK_URL + "?task_id=" + taskId;
  var options = {
    "method": "get",
    "headers": { "Authorization": "Bearer " + token },
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());
  
  if (json.error) return "Error";
  return json.status;
}

/**
 * Retrieves the result of a completed task.
 */
function getTaskResult(taskId, token) {
  var url = ARSENKIN_API.RESULT_URL + "?task_id=" + taskId;
  var options = {
    "method": "get",
    "headers": { "Authorization": "Bearer " + token },
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());
  
  if (json.error) throw new Error("Error fetching result: " + JSON.stringify(json));
  return json.result || json; 
}

/**
 * Main function to run the clustering process.
 */
function runClustering() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!cleanSheet) throw new Error("Лист '" + SHEETS.CLEAN_DATA + "' не найден.");
  
  var settings = getApiSettings();
  var rawKeywords = getColumnValues(SHEETS.CLEAN_DATA, "Keyword");

  if (!rawKeywords || rawKeywords.length === 0) {
    Browser.msgBox("Нет данных для кластеризации в листе " + SHEETS.CLEAN_DATA);
    return;
  }
  
  // Filter & Deduplicate
  var uniqueSet = new Set();
  var keywords = [];
  
  rawKeywords.forEach(function(k) {
    if (!k) return;
    var str = String(k).trim();
    if (!str || !/[a-zA-Zа-яА-Я]/.test(str)) return;
    
    var lower = str.toLowerCase();
    if (!uniqueSet.has(lower)) {
      uniqueSet.add(lower);
      keywords.push(str);
    }
  });

  if (keywords.length === 0) {
    Browser.msgBox("Нет валидных ключевых слов.");
    return;
  }
  
  var skippedCount = rawKeywords.length - keywords.length;
  if (skippedCount > 0) ss.toast("Оптимизация: пропущено " + skippedCount + " дублей.");
  
  if (keywords.length > 20000) {
     if (Browser.msgBox("Внимание", "Отправка " + keywords.length + " запросов. Продолжить?", Browser.Buttons.YES_NO) == "no") return;
  }
  
  ss.toast("Отправка задачи в Arsenkin Tools (" + keywords.length + " шт)...");
  
  var taskId;
  try {
    taskId = createClusteringTask(keywords, settings);
    PropertiesService.getScriptProperties().setProperty("LAST_ARSENKIN_TASK_ID", taskId);
  } catch (e) {
    Browser.msgBox("Ошибка при создании задачи: " + e.message);
    return;
  }
  
  ss.toast("Задача ID " + taskId + " создана. Ожидание...");
  
  // Poll with Graceful Timeout
  var result = null;
  var isTimeout = false;
  var startTime = Date.now();
  
  while (true) {
    if (Date.now() - startTime > 300000) { // 5 min
      isTimeout = true;
      break;
    }
    
    Utilities.sleep(5000); 
    
    try {
      var status = checkTaskStatus(taskId, settings.API_TOKEN);
      
      if (status === "Done") {
         try {
           result = getTaskResult(taskId, settings.API_TOKEN);
         } catch (e) {
           Browser.msgBox("Ошибка получения результата: " + e.message);
           return;
         }
         break;
      } else if (status === "Error") {
         Browser.msgBox("Задача завершилась с ошибкой на сервере.");
         return;
      }
      
    } catch (e) {
      console.error(e);
      if (e.message && e.message.indexOf("429") !== -1) Utilities.sleep(10000);
    }
    
    var elapsed = Math.round((Date.now() - startTime) / 1000);
    ss.toast("Обработка... " + elapsed + " сек");
  }
  
  if (isTimeout) {
    Browser.msgBox("⏳ Тайм-аут (5 мин).\nЗадача выполняется.\nID: " + taskId + "\nПроверьте статус позже в меню.");
    return;
  }
  
  if (!result) {
    Browser.msgBox("Не удалось получить результат. Проверьте статус вручную.");
    return;
  }
  
  processAndWriteClusters(result);
}

/**
 * Manually checks the status of the last executed task.
 */
function manuallyCheckLastTask() {
  var props = PropertiesService.getScriptProperties();
  var lastTaskId = props.getProperty("LAST_ARSENKIN_TASK_ID");
  
  if (!lastTaskId) {
    Browser.msgBox("Нет сохраненного ID.");
    return;
  }
  
  var settings = null;
  try { settings = getApiSettings(); } catch (e) { Browser.msgBox(e.message); return; }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Проверка статуса ID: " + lastTaskId);
  
  try {
    var status = checkTaskStatus(lastTaskId, settings.API_TOKEN);
    
    if (status === "Done") {
      var result = getTaskResult(lastTaskId, settings.API_TOKEN);
      processAndWriteClusters(result);
    } else if (status === "Error") {
      Browser.msgBox("Задача завершилась ошибкой.");
    } else {
      Browser.msgBox("Статус: " + (status || "Unknown"));
    }
  } catch (e) {
    Browser.msgBox("Ошибка: " + e.message);
  }
}

/**
 * Processes the clustering result and updates the sheet.
 */
function processAndWriteClusters(result) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Результаты получены. Запись...");
  
  var clustersSheet = ss.getSheetByName(SHEETS.CLUSTERS);
  if (!clustersSheet) clustersSheet = ss.insertSheet(SHEETS.CLUSTERS);
  
  if (clustersSheet.getLastRow() > 1) {
    clustersSheet.getRange(2, 1, clustersSheet.getLastRow() - 1, clustersSheet.getLastColumn()).clearContent();
  }
  
  var outputRows = [];
  result.forEach(function(cluster) {
    var groupName = cluster.clustered;
    var groupUrl = cluster.topurl || "";
    
    if (cluster.words && Array.isArray(cluster.words)) {
      cluster.words.forEach(function(kw) {
          outputRows.push([kw, groupName, groupUrl]);
      });
    }
  });
  
  if (outputRows.length > 0) {
    clustersSheet.getRange(2, 1, outputRows.length, 3).setValues(outputRows);
  }
  
  clustersSheet.activate();
  ss.toast("Готово!");
  Browser.msgBox("Готово! Результаты в листе Clusters.");
}
