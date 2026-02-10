# Sheet: Ads Data

**Purpose:** This sheet generates a formatted feed ready for import into Google Ads Editor. It transforms the clustered data into ad groups and headlines.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Campaign** | `String` | Campaign Name. | **AdsDataService**. |
| **Ad Group** | `String` | Ad Group Name (derived from Cluster Group). | **AdsDataService**. |
| **Keyword** | `String` | The keyword for the ad. | **AdsDataService**. |
| **Keyword for Headline 1** | `String` | Transformed keyword for use in Headline 1. | **AdsDataService**. |
| **Len** | `Number` | Length of the keyword string. | **Formula/Script**. |
| **Headline 1** | `String` | Primary Headline. | **AdsDataService**. Logic: Uses formatted keyword. |
| **Len 1** | `Number` | Length of Headline 1. | **Formula/Script**. |
| **Headline 2** | `String` | Secondary Headline. | **AdsDataService**. |
| **Len 2** | `Number` | Length of Headline 2. | **Formula/Script**. |
| **Headline 3 - 15** | `String` | Additional headlines. | **AdsDataService**. |
| **Description 1** | `String` | Primary Ad Description. | **AdsDataService**. |
| **Description 2 - 4** | `String` | Additional Descriptions. | **AdsDataService**. |
| **Final URL** | `String` | The landing page URL. | **AdsDataService**. |
| **Path1** | `String` | URL Path 1 (Display URL). | **AdsDataService**. |
| **Path2** | `String` | URL Path 2 (Display URL). | **AdsDataService**. |

## Formulas & Formatting
- **"Len" Columns**: All columns starting with "Len" (e.g., `Len 1`, `Len D1`) contain **Array Formulas** that calculate remaining characters dynamically based on limits defined in **Settings**.
    *   **Source of Truth:** Limits are taken from the `Settings` sheet (Max Headline Length, etc.).
    *   **Persistence:** Formulas are automatically re-applied if the data is regenerated.
- **Conditional Formatting**:
    *   🔴 **Red**: Negative remaining characters (Over limit).
    *   🟡 **Yellow**: 1-5 characters remaining (Near limit).
    *   🟢 **Green**: Exactly 0 characters remaining (Perfect fit).

## Automation
- **Generation**: Triggered by user action ("Prepare Ads Data").
- **Automatic Formatting (onEdit)**:
    -   **Instant:** Any text typed or pasted into Headline/Description columns is **automatically auto-formatted** (CamelCase, symbol cleanup).
    -   **Performance:** Works efficiently even with large copy-pastes (10k+ rows).
- **Manual Formatting**: You can still use the menu **"8. Форматировать объявления"** to force re-formatting of the entire sheet.

    ### Formatting Rules
    1.  **Smart Casing**:
        *   Converts text to **Title Case** (e.g., "buy iphone" -> "Buy Iphone").
        *   **Abbreviations**: Keeps known abbreviations (defined in *Intent Types*) in ALL CAPS (e.g., "USA", "SEO").
        *   **Ignored Words**: Keeps common prepositions (`in`, `on`, `at`, `for`, `with`, etc.) lowercase, unless they are the first word (e.g., "Tours in Moscow").
    
    2.  **Google Ads Compliance**:
        *   **Headlines**: Automatically removes all **exclamation marks (!)** to prevent disapproval.
        *   **Symbols**: Removes forbidden characters like `@`, `<`, `>`.
        *   **Punctuation**: 
            *   Fixes spacing after punctuation (e.g., "Word,Word" -> "Word, Word").
            *   Removes duplicate punctuation (e.g., "Word.." -> "Word.").
        *   **Spacing**: Collapses multiple spaces into one.

    3.  **Formula Preservation**:
        *   The tool calculates changes and **only updates the columns that need it** (Headline 1-15, Description 1-4).
        *   This ensures that **"Len" columns** (which contain Array Formulas) are **NEVER overwritten** or deleted.

