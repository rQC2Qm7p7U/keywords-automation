# Sheet: Settings

**Purpose:** Stores global configuration parameters for the automation scripts.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Parameter** | `String` | The name of the setting key (e.g., `ARSENKIN_API_TOKEN`). | **System/Manual**. defined in `Config.ts`. |
| **Value** | `String` | The value of the setting. | **Manual Input**. Some fields have **Drop-down** validation. |
| **Description** | `String` | Description of what the setting does. | **Manual Input**. Helpful text for the user. |

## Data Validation & Logic
- **Search Engine**: Dropdown selections ["Google", "Yandex"].
- **Region Search**: Text input to filter the region list.
- **Region**: Dynamic Dropdown. Filters the hidden `Ars Regions` list based on "Region Search" input using a `QUERY` formula.
- **Group Type**: Dropdown ["soft", "hard"].
- **Group Count**: Dropdown ["2" ... "10"].
- **Depth**: Dropdown ["10", "20", "30"].
- **Ignore Main Page**: Checkbox (TRUE/FALSE).

## Automation
- **Usage**: Scripts read this sheet to get configuration values at runtime.
