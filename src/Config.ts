/**
 * Config.gs
 * Contains all the configuration constants for the project.
 */

// General Project Settings
export const CONFIG = {
  PROJECT_NAME: "Keyword Planner Automation",
  VERSION: "1.0.0"
};

// Sheet Names
export const SHEETS = {
  INTENT_TYPES: "Intent Types",
  RAW_DATA: "Raw Data",
  CLEAN_DATA: "Clean Data",
  SETTINGS: "Settings",
  CLUSTERS: "Clusters",
  REGIONS: "Ars Regions",
  ADS_DATA: "Ads Data",
  ADS_PHRASE: "Ads Phrase",
  ADS_ADAPTIVE: "Ads Adaptive"
};

// Columns Configuration
export const COLUMNS = {
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
    "Negative",
    "Avg. monthly searches",
    "Competition index",
    "Bid Low",
    "Bid High"
  ],
  CLUSTERS: [
    "Keyword",
    "Group name",
    "Negative",
    "Phrases in group",
    "% Aggregators",
    "Main pages",
    "Toponym in query",
    "URLs group"
  ],
  ADS_DATA: [
    "Campaign", "Ad Group", "Keyword",
    "Keyword for Headline 1", "Len",
    "Headline 1", "Len 1", "Headline 2", "Len 2", "Headline 3", "Len 3", "Headline 4", "Len 4", "Headline 5", "Len 5",
    "Headline 6", "Len 6", "Headline 7", "Len 7", "Headline 8", "Len 8", "Headline 9", "Len 9", "Headline 10", "Len 10",
    "Headline 11", "Len 11", "Headline 12", "Len 12", "Headline 13", "Len 13", "Headline 14", "Len 14", "Headline 15", "Len 15",
    "Description 1", "Len D1", "Description 2", "Len D2", "Description 3", "Len D3", "Description 4", "Len D4",
    "Final URL",
    "Path1", "Len P1", "Path2", "Len P2",
    "Campaign"
  ],
  SETTINGS: [
    "Parameter",
    "Value",
    "Description"
  ],
  ADS_PHRASE: [
    "Campaign",
    "Ad Group",
    "Keyword",
    "Criterion Type"
  ],
  ADS_ADAPTIVE: [
    "Campaign",
    "Ad Group",
    "Headline 1",
    "Headline 1 position",
    "Headline 2",
    "Headline 3",
    "Headline 4",
    "Headline 5",
    "Headline 6",
    "Headline 7",
    "Headline 8",
    "Headline 9",
    "Headline 10",
    "Headline 11",
    "Headline 12",
    "Headline 13",
    "Headline 14",
    "Headline 15",
    "Description 1",
    "Description 2",
    "Description 3",
    "Description 4",
    "Final URL",
    "Path1",
    "Path2"
  ]
};

// Menu Configuration
export const MENU = {
  TITLE: "АВТОМАТИКА",
  ITEMS: [
    {
      caption: "Open Internal App (React)",
      functionName: "handleOpenSidebar"
    },
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
      caption: "8. Форматировать объявления (CamelCase)",
      functionName: "handleFormatAdsData"
    },
    {
      caption: "🔐 Арсенкин: Установить токен",
      functionName: "handleSetArsenkinToken"
    }
  ]
};
