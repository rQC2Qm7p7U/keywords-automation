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
  INTENT_TYPES: "Intent Types"
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
  ]
};

// Menu Configuration
var MENU = {
  TITLE: "АВТОМАТИКА",
  ITEMS: [
    {
      caption: "1. Создать структуру таблицы",
      functionName: "handleCreateStructure"
    }
  ]
};
