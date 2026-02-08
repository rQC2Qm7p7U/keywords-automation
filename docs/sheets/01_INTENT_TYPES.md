# Sheet: Intent Types

**Purpose:** This sheet is the "Brain" of the project. It defines the categories for keyword classification and stores the negative keywords used to filter data.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Transactional** | `String` | Keywords indicating transactional intent (e.g., "buy", "price"). | **Manual Input**. User enters these values. |
| **Branded** | `String` | Keywords related to specific brands. | **Manual Input**. User enters these values. |
| **Commercial** | `String` | Keywords indicating commercial intent. | **Manual Input**. User enters these values. |
| **Local** | `String` | Geo-modifiers or toponyms (e.g., "Moscow", "near me"). | **Manual Input**. User enters these values. |
| **Abbreviations** | `String` | Common abbreviations (e.g., "USA", "SEO"). | **Manual Input**. used by `AdsDataService` to preserve uppercase formatting in Headlines. |
| **Negative** | `String` | Negative keywords to be excluded from Clean Data. | **Automated**. Populated by "3. Собрать минуса" button, which aggregates negatives from Raw, Clean, and Clusters sheets. Can also be manually edited. **Conflicts highlighted in Yellow.** |
