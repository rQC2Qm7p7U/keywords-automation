/**
 * ArsenkinClusters.gs
 * Handles interactions with the Arsenkin Tools API for Clustering.
 * Documentation: https://help.arsenkin.ru/api/clustering-dev
 */

const ARSENKIN_API = {
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (sheet) {
    // Find "API Token Status" row
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  
  if (!sheet) {
    throw new Error(`Лист настроек '${SHEETS.SETTINGS}' не найден. Пожалуйста, пересоздайте структуру.`);
  }
  
  const data = sheet.getDataRange().getValues();
  const settings = {};
  
  // Skip header
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const val = data[i][1];
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
  
  const token = getApiToken();
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
  const payload = {
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
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + settings.API_TOKEN },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(ARSENKIN_API.BASE_URL, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) throw new Error("Ошибка API (Создание): " + JSON.stringify(json));
  if (!json.task_id) throw new Error("Не получен ID задачи.");
  return json.task_id;
}

/**
 * Checks the status of a task.
 * @return {string} Status "Done", "Processing", "Error"
 */
function checkTaskStatus(taskId, token) {
  const url = `${ARSENKIN_API.CHECK_URL}?task_id=${taskId}`;
  const options = {
    "method": "get",
    "headers": { "Authorization": "Bearer " + token },
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) return "Error";
  return json.status;
}

/**
 * Retrieves the result of a completed task.
 */
function getTaskResult(taskId, token) {
  const url = `${ARSENKIN_API.RESULT_URL}?task_id=${taskId}`;
  const options = {
    "method": "get",
    "headers": { "Authorization": "Bearer " + token },
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) throw new Error("Error fetching result: " + JSON.stringify(json));
  return json.result || json; 
}

/**
 * Main function to run the clustering process.
 * Decoupled: Returns result object or throws errors. Does not block with modal dialogs.
 */
function runClustering(userConfirmed = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cleanSheet = ss.getSheetByName(SHEETS.CLEAN_DATA);
  
  if (!cleanSheet) throw new Error(`Лист '${SHEETS.CLEAN_DATA}' не найден.`);
  
  const settings = getApiSettings();
  const rawKeywords = getColumnValues(SHEETS.CLEAN_DATA, "Keyword");

  if (!rawKeywords || rawKeywords.length === 0) {
    throw new Error(`Нет данных для кластеризации в листе ${SHEETS.CLEAN_DATA}`);
  }
  
  // Filter & Deduplicate
  const uniqueSet = new Set();
  const keywords = [];
  
  rawKeywords.forEach(k => {
    if (!k) return;
    const str = String(k).trim();
    if (!str || !/[a-zA-Zа-яА-Я]/.test(str)) return;
    
    const lower = str.toLowerCase();
    if (!uniqueSet.has(lower)) {
      uniqueSet.add(lower);
      keywords.push(str);
    }
  });

  if (keywords.length === 0) {
    throw new Error("Нет валидных ключевых слов.");
  }
  
  // Check for large volume requiring confirmation
  if (keywords.length > 20000 && !userConfirmed) {
     return {
       status: "WAITING_CONFIRMATION",
       count: keywords.length,
       message: `Внимание: Отправка ${keywords.length} запросов.`
     };
  }
  
  ss.toast(`Отправка задачи в Arsenkin Tools (${keywords.length} шт)...`);
  
  let taskId;
  try {
    taskId = createClusteringTask(keywords, settings);
    PropertiesService.getScriptProperties().setProperty("LAST_ARSENKIN_TASK_ID", taskId);
  } catch (e) {
    throw new Error("Ошибка при создании задачи: " + e.message);
  }
  
  ss.toast(`Задача ID ${taskId} создана. Ожидание...`);
  
  // Poll with Graceful Timeout
  let result = null;
  let isTimeout = false;
  const startTime = Date.now();
  
  while (true) {
    if (Date.now() - startTime > 300000) { // 5 min
      isTimeout = true;
      break;
    }
    
    Utilities.sleep(5000); 
    
    try {
      const status = checkTaskStatus(taskId, settings.API_TOKEN);
      
      if (status === "Done") {
         try {
           result = getTaskResult(taskId, settings.API_TOKEN);
         } catch (e) {
           throw new Error("Ошибка получения результата: " + e.message);
         }
         break;
      } else if (status === "Error") {
         throw new Error("Задача завершилась с ошибкой на сервере.");
      }
      
    } catch (e) {
      console.error(e);
      if (e.message && e.message.indexOf("429") !== -1) Utilities.sleep(10000);
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    ss.toast(`Обработка... ${elapsed} сек`);
  }
  
  if (isTimeout) {
     return {
       status: "TIMEOUT",
       taskId: taskId,
       message: `⏳ Тайм-аут (5 мин).\nЗадача выполняется.\nID: ${taskId}\nПроверьте статус позже в меню.`
     };
  }
  
  if (!result) {
    throw new Error("Не удалось получить результат. Проверьте статус вручную.");
  }
  
  processAndWriteClusters(result);
  return { status: "SUCCESS", count: keywords.length };
}

/**
 * Manually checks the status of the last executed task.
 */
function manuallyCheckLastTask() {
  const props = PropertiesService.getScriptProperties();
  const lastTaskId = props.getProperty("LAST_ARSENKIN_TASK_ID");
  
  if (!lastTaskId) {
    return { status: "NO_ID", message: "Нет сохраненного ID." };
  }
  
  let settings = null;
  try { settings = getApiSettings(); } catch (e) { throw e; }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast(`Проверка статуса ID: ${lastTaskId}`);
  
  try {
    const status = checkTaskStatus(lastTaskId, settings.API_TOKEN);
    
    if (status === "Done") {
      const result = getTaskResult(lastTaskId, settings.API_TOKEN);
      processAndWriteClusters(result);
      return { status: "SUCCESS", message: "Задача выполнена и результаты записаны." };
    } else if (status === "Error") {
      return { status: "ERROR", message: "Задача завершилась ошибкой." };
    } else {
      return { status: "PROCESSING", message: `Статус: ${status || "Unknown"}` };
    }
  } catch (e) {
    throw new Error("Ошибка при проверке: " + e.message);
  }
}

/**
 * Processes the clustering result and updates the sheet.
 */
function processAndWriteClusters(result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Результаты получены. Запись...");
  
  let clustersSheet = ss.getSheetByName(SHEETS.CLUSTERS);
  if (!clustersSheet) clustersSheet = ss.insertSheet(SHEETS.CLUSTERS);
  
  if (clustersSheet.getLastRow() > 1) {
    clustersSheet.getRange(2, 1, clustersSheet.getLastRow() - 1, clustersSheet.getLastColumn()).clearContent();
  }
  
  const outputRows = [];
  result.forEach(cluster => {
    const groupName = cluster.clustered;
    const groupUrl = cluster.topurl || "";
    
    if (cluster.words && Array.isArray(cluster.words)) {
      cluster.words.forEach(kw => {
          outputRows.push([kw, groupName, groupUrl]);
      });
    }
  });
  
  if (outputRows.length > 0) {
    clustersSheet.getRange(2, 1, outputRows.length, 3).setValues(outputRows);
  }
  
  clustersSheet.activate();
  ss.toast("Готово!");
}
