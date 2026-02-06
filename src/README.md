# Keyword Planner Automation - Technical Documentation

## Overview
This project is a Google Apps Script application designed to automate the management and processing of Keyword Planner data in Google Sheets. It follows a modular architecture for maintainability and scalability.

## File Structure & Responsibility

### 1. `Config.gs` [Configuration]
- **Purpose**: Centralized storage for all constants and configuration settings.
- **Key Objects**:
  - `CONFIG`: General project metadata.
  - `SHEETS`: Official names of sheets (e.g., "Intent Types").
  - `COLUMNS`: Column definitions for structured sheets.
  - `MENU`: Configuration for the custom UI menu.

### 2. `Messages.gs` [Resources]
- **Purpose**: Centralized repository for all user-facing text strings.
- **Benefits**: Allows for easy localization and text updates without touching logic code.
- **Key Objects**:
  - `MESSAGES`: Contains nested objects for `WARNINGS`, `UI`, and `ERRORS`.

### 3. `Structure.gs` [Logic]
- **Purpose**: Handles destructive and constructive operations on the spreadsheet structure.
- **Key Functions**:
  - `createStructure()`: 
    1. Creates the "Intent Types" sheet.
    2. Creates the "Raw Data" sheet.
    3. Populates both with configured headers.
    4. Deletes all other sheets to reset the workspace.
    5. Ensures "Intent Types" is at index 1 and "Raw Data" at index 2.

### 4. `UI.gs` [User Interface]
- **Purpose**: Manages the interaction between the user and the script.
- **Key Functions**:
  - `onOpen()`: Builds the custom menu based on `MENU` config.
  - `handleCreateStructure()`: Intercepts the menu click, calls `ui.alert` for confirmation, and executes `createStructure()` only upon user approval.

### 5. `Code.gs` [Entry Point]
- **Purpose**: The main entry point for the Apps Script project.
- **Details**: Ensures necessary global triggers (like `onOpen`) are properly routed.

## Extension Guide
To add new features:
1. **New Constants**: Add any new sheet names or settings to `Config.gs`.
2. **New Strings**: Add user messages to `Messages.gs`.
3. **New Logic**: Create a new file (e.g., `Processing.gs`) for business logic.
4. **New Menu Items**: Add the item to `MENU` in `Config.gs` and creating a handler in `UI.gs`.

## Best Practices Used
- **Separation of Concerns and Modularity**: Logic, Data (Config), and UI are separated.
- **DRY (Don't Repeat Yourself)**: Constants are used throughout.
- **Safety**: Destructive actions require explicit user confirmation.
- **Scalability**: The structure allows for easy addition of new modules.
