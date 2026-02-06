/**
 * Config.gs
 * Contains all the configuration constants for the project.
 */

// General Project Settings
var CONFIG = {
  PROJECT_NAME: "Keyword Planner Automation",
  VERSION: "1.0.0"
};

// Sheet Names
var SHEETS = {
  INTENT_TYPES: "Intent Types",
  RAW_DATA: "Raw Data",
  CLEAN_DATA: "Clean Data"
};

// Columns Configuration
var COLUMNS = {
  INTENT_TYPES: [
    "Transactional",
    "Branded",
    "Commercial",
    "Local",
    "Negative",
    "Abbreviations",
    "Site"
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
  ]
};

// Menu Configuration
var MENU = {
  TITLE: "АВТОМАТИКА",
  ITEMS: [
    {
      caption: "1. Создать структуру таблицы",
      functionName: "handleCreateStructure"
    },
    {
      caption: "2. Удалить дубликаты (Raw/Clean)",
      functionName: "handleRemoveDuplicates"
    }
  ]
};
