# Sheet: Ads Phrase & Ads Adaptive

**Purpose:** These sheets are variations of the Ads Data feed, formatted for different Google Ads Editor import requirements (Phrase match vs Adaptive ads).

## Ads Phrase Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Campaign** | `String` | Campaign Name. | **AdsDataService**. |
| **Ad Group** | `String` | Ad Group Name. | **AdsDataService**. |
| **Keyword** | `String` | The keyword. | **AdsDataService**. |
| **Criterion Type** | `String` | Match type (e.g., "Phrase"). | **AdsDataService**. |

## Ads Adaptive Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Campaign** | `String` | Campaign Name. | **AdsDataService**. |
| **Ad Group** | `String` | Ad Group Name. | **AdsDataService**. |
| **Headline 1 - 15** | `String` | Responsive Search Ad headlines. | **AdsDataService**. |
| **Description 1 - 4** | `String` | Responsive Search Ad descriptions. | **AdsDataService**. |
| **Final URL** | `String` | Landing page URL. | **AdsDataService**. |
| **Path1 / Path2** | `String` | Display URL paths. | **AdsDataService**. |
