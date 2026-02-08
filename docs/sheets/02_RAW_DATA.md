# Sheet: Raw Data

**Purpose:** This sheet is the entry point for data ingestion. It holds the "dirty" data imported from external tools like KeyCollector or CSV files.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Keyword** | `String` | The raw search query/phrase. | **External Import**. Paste data here. |
| **Currency** | `String` | Currency code (e.g., RUB, USD), if available. | **External Import**. |
| **Avg. monthly searches** | `Number` | Monthly search volume. | **External Import**. |
| **Изменение за квартал** | `String` | Quarterly change metric. | **External Import**. |
| **Изменение за год** | `String` | Yearly change metric. | **External Import**. |
| **Competition** | `String` | Competition level (High/Med/Low). | **External Import**. |
| **Competition index** | `Number` | Numerical competition index (0-100 or 0-1). | **External Import**. |
| **Bid Low** | `Number` | Suggested bid for top of page (low range). | **External Import**. |
| **Bid High** | `Number` | Suggested bid for top of page (high range). | **External Import**. |
| **Negative** | `String` | Column to mark keywords as "Negative". | **Manual Input**. User types negative words here. Ideally, specific words from the keyword phrase. **Highlighted Green** if found in Intent Types. |

## Automation
- **Duplicates**: Can be removed via "2. Удалить дубликаты".
- **Transfer**: Data is moved to *Clean Data* via "4. Перенос Raw -> Clean".
