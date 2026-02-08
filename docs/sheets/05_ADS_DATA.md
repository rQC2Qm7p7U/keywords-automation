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
- **"Len" Columns**: All columns starting with "Len" (e.g., `Len 1`, `Len D1`) contain **Array Formulas** that calculate remaining characters:
    *   **Headlines**: Limit 30 chars.
    *   **Descriptions**: Limit 90 chars.
    *   **Paths**: Limit 15 chars.
- **Conditional Formatting**:
    *   🔴 **Red**: Negative remaining characters (Over limit).
    *   🟡 **Yellow**: 1-5 characters remaining (Near limit).
    *   🟢 **Green**: Exactly 0 characters remaining (Perfect fit).

## Automation
- **Generation**: Triggered by user action.
- **Case Transformation**: Keywords are converted to "Ads Case" (Title Case), respecting **Abbreviations** defined in *Intent Types*.
