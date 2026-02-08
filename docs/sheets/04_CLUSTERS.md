# Sheet: Clusters

**Purpose:** This sheet displays the results of the clustering process performed by the Arsenkin API. It groups similar keywords together.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Keyword** | `String` | The keyword being clustered. | **Arsenkin API**. Result of "6. Кластеризация". |
| **Group name** | `String` | The name of the cluster group assigned by the algorithm. | **Arsenkin API**. |
| **Negative** | `String` | Column to mark negatives within clusters. | **Manual Input**. **Highlighted Green** if found in Intent Types. |
| **Phrases in group** | `Number` | The number of phrases in this cluster. | **Arsenkin API**. |
| **% Aggregators** | `Number` | Percentage of aggregator sites in SERP for this keyword. | **Arsenkin API**. |
| **Main pages** | `String` | Main pages found in search results. | **Arsenkin API**. |
| **Toponym in query** | `String` | Toponym detected in the query (e.g., city name). | **Arsenkin API**. |
| **URLs group** | `String` | URLs associated with the group. | **Arsenkin API**. |

## Automation
- **Source**: Data comes from *Clean Data* sheet.
