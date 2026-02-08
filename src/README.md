# Keyword Planner Automation - Technical Documentation

## Overview
This project is a Google Apps Script application designed to automate the management and processing of Keyword Planner data in Google Sheets. It follows a modular architecture for maintainability, scalability, and performance.

## Key Features
- **Documentation**: [Data Dictionary](docs/DATA_DICTIONARY.md) - Detailed guide to all sheets and columns.
- **Structure Automation**: One-click generation of the entire spreadsheet workspace.
- **Data Processing**:
  - Duplicate removal (Raw & Clean data).
  - Advanced negative keyword filtering (optimized for performance).
  - Data transfer and formatting between stages.
  - **Ads Data Formatting**: Smart casing and Google Ads policy compliance (cleaning punctuation/symbols) via specialized tool.
- **Arsenkin Integration**:
  - **Clustering**: Automated keyword clustering via Arsenkin API.
  - **Optimized Region Search**: Bilingual (Ru/En) search with a dependent dropdown to handle 40,000+ regions without UI lag.
  - **Secure Token Storage**: API tokens are stored securely in script properties.

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

### 3. `Structure.gs` [Logic]
- **Purpose**: Handles destructive and constructive operations on the spreadsheet structure.
- **Key Functions**:
  - `createStructure()`: resets the workspace, creates sheets, and sets up validation rules including the **Dependent Dropdown** for regions.

### 4. `UI.gs` [User Interface]
- **Purpose**: Manages the interaction between the user and the script.
- **Key Functions**:
  - `onOpen()`: Creates the "АВТОМАТИКА" menu.
  - `handleRunClustering()`: Manages the clustering workflow.

### 5. `Keywords.gs` & `IntentService.gs` [Domain Logic]
- **Purpose**: Pure domain logic for processing keyword data.
- **Key Features**:
  - **Optimized Filtering**: Uses `indexOf` pre-checks before Regex to significantly speed up negative keyword filtering on large datasets.

### 6. `ArsenkinClusters.gs` [API Service]
- **Purpose**: Handles all communication with the Arsenkin Tools API.
- **Key Features**:
  - **Decoupled Logic**: Returns result objects instead of blocking UI calls.
  - **Smart Lookup**: Automatically maps selected region names to IDs.

### 7. `SheetsService.gs` [Infrastructure]
- **Purpose**: Abstraction layer for Google Sheets API.
- **Key Functions**:
  - `getSheetData()` / `updateSheetData()`: Efficient bulk data operations.

### 8. `Code.gs` [Entry Point]
- **Purpose**: The main entry point for the Apps Script project.

## Technical Highlights
- **ES6+ Syntax**: The codebase uses modern JavaScript (const/let, arrow functions, template literals) via the V8 runtime.
- **Performance**: 
  - **Region Selector**: Implements a "Search -> Filter -> Select" pattern to handle 41k+ rows instantly using `QUERY` formulas.
  - **Batch Operations**: All sheet reads/writes are batched to minimize API calls.
- **Robustness**:
  - **API Retries**: Implements exponential backoff strategy for network calls to handle transient errors (429/500).
- **Maintainability**:
  - **JSDoc**: All services are documented with JSDoc for better developer experience and type safety.
  - **Centralized Config**: API URLs and Constants are strictly separated from logic.

## Extension Guide
To add new features:
1. **New Constants**: Add any new sheet names or settings to `Config.gs`.
2. **New Strings**: Add user messages to `Messages.gs`.
3. **New Logic**: Create a new file (e.g., `Processing.gs`) for business logic.
4. **New Menu Items**: Add the item to `MENU` in `Config.gs` and creating a handler in `UI.gs`.

## Security and Integrity
- **Header Protection**: The first row (headers) of all structural sheets is automatically protected.
- **Access Control**: Only the spreadsheet owner (admin) can edit headers.

## Best Practices Used
- **Separation of Concerns**: Logic (Domain), Data (Infrastructure), and Presentation (UI) are strictly separated.
- **DRY (Don't Repeat Yourself)**: Constants are used throughout.
- **User Experience**: Immediate feedback via Toasts, secure input methods, and performant UI controls.

