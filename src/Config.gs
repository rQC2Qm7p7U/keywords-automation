/**
 * Config.gs
 * Contains all the configuration constants for the project.
 */

// General Project Settings
const CONFIG = {
  PROJECT_NAME: "Keyword Planner Automation",
  VERSION: "1.0.0"
};

// Sheet Names
const SHEETS = {
  INTENT_TYPES: "Intent Types",
  RAW_DATA: "Raw Data",
  CLEAN_DATA: "Clean Data",
  SETTINGS: "Ars API Set",
  CLUSTERS: "Clusters",
  REGIONS: "Ars Regions"
};

// Columns Configuration
const COLUMNS = {
  INTENT_TYPES: [
    "Transactional",
    "Branded",
    "Commercial",
    "Local",
    "Abbreviations",
    "Negative"
  ],
  RAW_DATA: [
    "Keyword",
    "Currency",
    "Avg. monthly searches",
    "Изменение за квартал",
    "Изменение за год",
    "Competition",
    "Competition index",
    "Bid Low",
    "Bid High",
    "Negative"
  ],
  CLEAN_DATA: [
    "Keyword",
    "Avg. monthly searches",
    "Competition index",
    "Bid Low",
    "Bid High",
    "Negative"
  ],
  CLUSTERS: [
    "Keyword",
    "Cluster Group",
    "Cluster URL"
  ],
  SETTINGS: [
    "Parameter",
    "Value",
    "Description"
  ]
};

// Menu Configuration
const MENU = {
  TITLE: "АВТОМАТИКА",
  ITEMS: [
    {
      caption: "1. Создать структуру таблицы",
      functionName: "handleCreateStructure"
    },
    {
      caption: "2. Удалить дубликаты (Raw/Clean)",
      functionName: "handleRemoveDuplicates"
    },
    {
      caption: "3. Собрать минуса (Intent Types)",
      functionName: "handleCollectNegatives"
    },
    {
      caption: "4. Перенос Raw -> Clean",
      functionName: "handleTransferRawToClean"
    },
    {
      caption: "5. Отчистить ключи от минусов (Clean)",
      functionName: "handleCleanKeysFromNegatives"
    },
    {
      caption: "6. Кластеризация (Ars API)",
      functionName: "handleRunClustering"
    },
    {
      caption: "7. Проверить статус последней задачи",
      functionName: "handleCheckLastTask"
    },
    {
      caption: "🔐 Арсенкин: Установить токен",
      functionName: "handleSetArsenkinToken"
    }
  ]
};
