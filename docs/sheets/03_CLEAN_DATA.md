# Sheet: Clean Data

**Purpose:** This sheet contains the "processed" data. It is a filtered subset of the *Raw Data* that has been de-duplicated and had negative keywords removed.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Keyword** | `String` | The clean search query/phrase. | **Transferred from Raw**. Populated by "4. Перенос Raw -> Clean". |
| **Negative** | `String` | Column to mark additional negative keywords. | **Manual Input**. User identifies new negatives here. **Highlighted Green** if found in Intent Types. |
| **Avg. monthly searches** | `Number` | Monthly search volume. | **Transferred from Raw**. |
| **Competition index** | `Number` | Competition index. | **Transferred from Raw**. |
| **Bid Low** | `Number` | Suggested bid (Low). | **Transferred from Raw**. |
| **Bid High** | `Number` | Suggested bid (High). | **Transferred from Raw**. |

## Automation
- **Cleaning**: "5. Отчистить ключи от минусов" removes rows containing keywords found in the *Intent Types* negative list.
- **Clustering**: This sheet is the source for the "6. Кластеризация" command.
