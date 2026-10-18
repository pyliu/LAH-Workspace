# Databricks 產品分析與系統資料表調查劇本（Databricks Analytics & System Tables）

## 此資料來源包含什麼

Databricks（或同類型的 Snowflake、BigQuery、ClickHouse、dbt 產品分析資料倉儲）負責保存產品分析、資料管線與倉儲遙測數據。它與基礎設施監控（如 Datadog）互補：Datadog 提供的是**基礎設施與執行期（Infra/Runtime）視角**，而 Databricks 提供的是**產品與資料分佈（Product/Data）視角**（使用者實際做了什麼、跑過哪些實驗、功能使用量如何演變、某個閾值常數是根據什麼數據分佈算出來的）。

- **產品分析事件（Product analytics events）**：原始事件表（如 `your_warehouse.events.analytics_track_event`）以及經過型別化與去重處理的 dbt 模型（`<your_analytics_db>.<schema>.<table>`）。記錄使用者行為：功能呼叫、點擊、接受／拒絕、表單送出、客戶端回報的錯誤。
- **使用量與計費事件（Usage & billing events）**：用於調查由成本控制或流量規模所驅動的設計決策。
- **實驗與功能旗標數據（Experiment / feature-flag data）**：曝光（Exposure）與結果資料表。**各團隊的 Schema 定義高度客製化**，查詢前請先用 `SHOW TABLES` 探測實際表名。
- **系統資料表（System tables）**：如 `system.query.history`、`system.compute.warehouses`、`system.billing.*`、`system.access.audit`。可用來回答「這個查詢當年是不是非常昂貴？」、「多久會有人跑一次這個操作？」、「資料倉儲負載是在什麼時候飆高的？」。
- **dbt 資料血緣（dbt lineage）**：`<your_analytics_db>.<schema>` 下的模型能揭示哪些下游資料管線依賴於某張表或某個欄位。上游模型的變更往往就是促成下游應用程式碼修改的原因。
- **Databricks Notebooks**：工程師在修改程式碼前撰寫的探索性數據分析。**無法透過 SQL MCP 直接查詢**——若你懷疑設計理由寫在某份 Notebook 裡，請明確將其標記為「搜尋缺口（Gap）」。

## 如何搜尋與挖掘

使用資料倉儲的唯讀 SQL MCP 工具（例如 `execute_sql_read_only`；若回傳 `statement_id` 則使用 `poll_sql_result` 輪詢結果，切勿重複送出昂貴查詢）。

**1. 查詢前先探測結構（Orient before querying）**
資料表結構因組織而異，在信任任何表名之前請先探測：

```sql
SHOW TABLES IN <your_analytics_db>.<schema> LIKE '*<keyword>*';
DESCRIBE TABLE <your_analytics_db>.<schema>.stg_<event>;
```

**2. 每一筆查詢都必須加上時間範圍限制（Time-bound every query）**
事件表通常極為龐大，未加時間範圍的全表掃描會直接逾時。請務必針對 `_timestamp`（事件表）或 `start_time`（`system.query.history`）加上涵蓋該變更上線日期的前後區間（通常為上線前後各約 30 天；除非有充分理由，否則切勿拉得更寬）。

**3. 優先查詢已型別化的 dbt 模型，而非原始事件表**
`<your_analytics_db>.<schema>.<table>` 已完成去重與欄位型別化；原始表則可能包含重複資料與未解析的 JSON 字串。唯有當尚無對應 dbt 模型，或你需要查詢位於 dbt 排程更新延遲時間窗內的最新事件時，才退回查詢原始表。

**已型別化 dbt 模型的常見欄位慣例**（掌握這些可省去一次 `DESCRIBE` 往返）：
- `_timestamp`、`_id`、`_auth_id`、`_request_id`、`event_name`：每個模型的標準欄位。
- `properties_<name>`：經過型別化、底線命名的事件屬性（如 `properties_entrypoint`、`properties_size_bytes`）。
- `context_team_id`、`context_client_version`、`context_country`、`context_client_os`：預先提取的客戶端環境脈絡。

### 最常帶來關鍵發現的五種調查模式

請根據調查目標挑選對應的「資料表 + 欄位」組合：

1. **事件使用量軌跡（Event usage trajectory）**：統計相關 `stg_*` 模型在 PR 合併前後 ±30 天內的每日筆數。如果在合併後一兩天內從 0 階躍上升至穩定流量，這是該 PR 正式啟用該功能的強烈旁證；反之，若流量衰減至 0，則暗示功能被棄用或移除。
2. **安全護欄與防禦性閾值的數據起源（Guard-rail / defensive-check origin）**：查詢該 PR 合併**前 14 天**內，相關 `properties_<name>` 欄位的數值分佈（中位數 Median / p99 / 最大值 Max）。如果當時的 p99 數值剛好吻合程式碼裡寫死的閾值常數，便強烈顯示這個數字是根據真實數據分佈挑選的。
3. **實驗與功能旗標查詢（Experiment / feature-flag lookup）**：透過 `SHOW TABLES ... LIKE '*experiment*'` 找到曝光表，接著拉出該功能旗標鍵值（Flag key）在 PR 日期前後各實驗變體（Variant）的曝光筆數。
4. **資料遷移、回填（Backfills）或效能重寫的查詢歷史證據**：在 `system.query.history` 中以 `statement_text ILIKE '%<table_or_symbol>%'` 搭配緊湊的 `start_time` 區間過濾，依 `total_duration_ms` 排序或聚合 `SUM(read_bytes)`、`COUNT(*)`，即可揪出當年促使工程師重寫邏輯的高耗能慢查詢。
5. **dbt 資料血緣追蹤**：若目標程式碼讀取或寫入某個 `<your_analytics_db>.<schema>` 模型，該模型自身的 Git 修改歷史往往就記載了原因。請將這條線索列在「額外線索（Additional Leads）」中交給負責 Git 的調查員，不要自己跨界去跑 Git 調查。

## 什麼是優質的證據

除了上述五種模式外：
- 某個錯誤分類事件（Error-classifying event）的每日計數，在某個防禦性程式碼 PR 上線後幾天內驟降至接近 0，顯示該 PR 確實解決了該類錯誤。
- 實驗曝光表中記載了目標功能旗標鍵值，並在 PR 上線日期前後標註了「已正式發布（shipped）」或「已結束實驗（concluded）」的決策。

## 常見陷阱（Common Pitfalls）

- **有埋點記錄 ≠ 因果關係（Instrumented ≠ caused）**：某個事件存在只代表有人在乎並記錄了它，不代表目標程式碼是「因為它」才存在的。宣稱因果關係前，必須搭配 Git 調查員找到的 Commit / PR 文字引述。
- **埋點邏輯本身的靜默變更（Silent instrumentation changes）**：事件數量的階躍上升，可能只是因為新埋點剛上線開始記錄，而非使用者真實行為改變。解讀流量變化前，請先確認同一時間窗內是否有修改埋點的 PR。
- **Schema 演進偏移（Schema drift）**：事件屬性會隨時間演進。今天在型別化 dbt 模型上看到的欄位，在當年撰寫目標程式碼時可能還不存在（舊資料可能只保存在原始 `properties_json` 中）。
- **dbt 排程延遲（dbt refresh lag）**：dbt 模型通常按排程（每小時或每日）重建。若要查最近幾小時內的事件，請退回查原始表並依 `_id` 去重。
- **未經驗證的表名臆測**：在未執行 `SHOW TABLES` / `DESCRIBE TABLE` 確認表名真實存在前，切勿憑空假設實驗表或計費表的名稱。
- **資料保存期限斷崖（Retention cliff）**：若要調查的時間點早於資料表的保存期限（Retention）或 dbt 模型的建立日期，這屬於**「搜尋缺口（Gap）」**而非「查無活動（Null result）」。請明確標示為缺口，以免綜合分析員把「查無資料」誤判為「當時沒有任何活動」。
- **Notebooks 無法透過 SQL 查詢**：SQL MCP 看不到 Databricks Notebooks。若懷疑理由寫在 Notebook 中，請回報為搜尋缺口。

## 回報內容規範（What to Return）

針對每一項相關發現，請回報：
- **類型**：產品事件／實驗曝光／使用量或計費事件／系統資料表紀錄／dbt 模型
- **完整資料表名稱（Fully-qualified table name）與實際執行的確切 SQL 查詢**
- **查詢的時間範圍（Time window）**
- **精簡的數值摘要**（筆數、百分位數、首次／最後出現時間戳記）。**嚴禁傾倒大量原始資料列（Raw rows）。**
- **與目標程式碼上線日期的時序關聯**（例如：「首筆紀錄出現於 2024-08-15，對應 PR #49074 合併於 2024-08-14」）
- **關聯性與證據強度**：直接（direct）／旁證（circumstantial）／薄弱（weak）
