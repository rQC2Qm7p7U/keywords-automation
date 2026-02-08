# Sheet: Settings

**Purpose:** Stores global configuration parameters for the automation scripts.

## Columns

| Column Name | Data Type | Description | Source / Logic |
| :--- | :--- | :--- | :--- |
| **Parameter** | `String` | The name of the setting key (e.g., `ARSENKIN_API_TOKEN`). | **System/Manual**. defined in `Config.ts`. |
| **Value** | `String` | The value of the setting. | **Manual Input**. User enters API keys or other constants here. |
| **Description** | `String` | Description of what the setting does. | **Manual Input**. Helpful text for the user. |

## Automation
- **Usage**: Scripts read this sheet to get configuration values at runtime.
