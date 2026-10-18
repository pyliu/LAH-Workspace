# 各類資料來源調查劇本索引（Source Playbooks）

`why` 技能會針對每個可用的證據類別各啟動一名調查子代理，並讓每位調查員讀取下方對應的單一來源專屬劇本。這些劇本以常見的 MCP 工具為具體範例撰寫；若你的環境使用同一類別下的其他工具或 MCP，請依相同邏輯靈活調整。

| 證據類別（Category） | 對應劇本（Playbook） | 劇本範例工具／MCP（可適配至同類工具） |
|---|---|---|
| 版本控制歷史（Source control history） | [`code-archaeology.md`](./sources/code-archaeology.md) | `git`、`gh`（以及專案內文件與註解） |
| 議題與工單追蹤（Issue / ticket tracker） | [`linear.md`](./sources/linear.md) | Linear（可適配至 Jira、GitHub Issues、Plane、Shortcut） |
| 長篇設計文件（Long-form documents） | [`notion.md`](./sources/notion.md) | Notion（可適配至 Confluence、Google Docs、Coda、本地 `docs/`） |
| 即時團隊對話（Real-time team chat） | [`slack.md`](./sources/slack.md) | Slack（可適配至 Discord、Microsoft Teams、Mattermost、即時通頻道紀錄） |
| 基礎設施可觀測性（Infrastructure observability） | [`datadog.md`](./sources/datadog.md) | Datadog（可適配至 New Relic、Honeycomb、Grafana、Splunk） |
| 錯誤與例外追蹤（Error / exception tracking） | [`sentry.md`](./sources/sentry.md) | Sentry（可適配至 Rollbar、Bugsnag、Airbrake、系統錯誤日誌） |
| 產品分析資料倉儲（Product analytics warehouse） | [`databricks.md`](./sources/databricks.md) | Databricks SQL（可適配至 Snowflake、BigQuery、ClickHouse、dbt） |

跨類別橫切劇本（Cross-cutting）：

- [`incident-postmortem.md`](./sources/incident-postmortem.md)：當目標程式碼看起來屬於防禦性設計（如 Null 檢查、重試、逾時、速率限制、功能旗標、邊界防護、OOM 處理等）時，請將此劇本一併附加給各個調查子代理。
