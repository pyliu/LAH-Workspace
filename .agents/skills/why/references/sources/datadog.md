# Datadog 基礎設施可觀測性與遙測調查劇本（Datadog Telemetry）

## 此資料來源包含什麼

Datadog（或同類型的 Grafana、Prometheus、New Relic、Honeycomb、Splunk 等可觀測性平台）保存了**執行期真實紀錄（Runtime Record）**——也就是正式環境實際發生過什麼事，而非事前規劃或口頭討論了什麼。

- **指標（Metrics）**：由團隊埋點記錄的計數器（Counters）、量表（Gauges）與直方圖（Histograms）。某個指標「之所以存在」，本身就證明了當年有人認為這個數值重要到必須持續監控。
- **監控器與警報（Monitors & alerts）**：團隊認定嚴重到必須把人叫醒的觸發條件。例如一個設定在 `rate_limit_hit > 10/min` 時觸發的監控器，就是團隊關注該特定閾值的直接證據。
- **儀表板（Dashboards）**：團隊針對某個子系統精心整理的關鍵指標視圖。
- **APM 追蹤與區間（Traces & spans）**：請求級別的執行期數據，專門用來回答「為什麼這裡這麼慢？」或「為什麼這裡要設逾時（Timeout）？」的問題。
- **日誌（Logs）**：高流量的事件紀錄，往往保存了當年促使工程師寫下防禦性程式碼的真實錯誤條件。
- **事件紀錄（Incidents）**：包含完整時間軸與事後檢討（Postmortems）連結的正式線上事故紀錄。
- **調查筆記（Notebooks）**：團隊在排查問題時留下的探索性調查筆記，常包含當時的假設與數據分析。

## 如何搜尋與挖掘

使用環境中的 Datadog（或對應可觀測性平台）MCP 工具。採取「先廣後窄」的搜尋策略：

1. **識別負責的服務（Identify the owning services）**：
   ```text
   search_datadog_services (依服務名稱或團隊過濾)
   search_datadog_service_dependencies (檢視上下游相依服務)
   ```

2. **優先搜尋儀表板與監控器（Dashboards and monitors first）**：
   ```text
   search_datadog_dashboards (查詢詞：功能名稱、服務名稱、關鍵符號 Symbol)
   search_datadog_monitors   (使用相同查詢詞)
   ```
   當找到涵蓋調查目標的儀表板或監控器時，請記錄其查詢語法與監控閾值。監控器上的警報閾值，往往就是「為什麼程式碼裡要把上限鎖在 N？」的直接答案。

3. **查詢目標周邊的指標時序（Metrics around the target）**：
   ```text
   search_datadog_metrics (依名稱模式搜尋，例如功能名稱或 Symbol)
   get_datadog_metric_context (取得中繼資料：描述、單位、標籤 Tags)
   get_datadog_metric (查詢時間序列：「在 PR 合併日期前後是否曾出現尖峰？」)
   ```
   將指標的歷史軌跡與目標程式碼的新增／修改日期進行交叉比對，能提供極強的間接支撐證據（例如：「`payment_timeout` 指標在 2023-11-03 出現尖峰，而重試邏輯緊接著在 2023-11-06 被合併上線」）。

4. **搜尋日誌：精準收斂，切勿傾倒（Logs: Narrow, don't dump）**：
   ```text
   search_datadog_logs (搜尋目標附近的原始日誌模式，設定 use_log_patterns=true)
   analyze_datadog_logs (SQL 風格的聚合統計，僅在需要計算筆數時使用)
   ```
   使用關鍵符號、錯誤訊息字串或功能名稱進行搜尋。**強烈建議一律加上時間範圍限制**（例如變更前後各 30 天）。

5. **APM 區間與追蹤（APM spans and traces）**：
   ```text
   aggregate_spans    (統計數據：「這個端點發生失敗的頻率有多高？」)
   search_datadog_spans (檢視個別 Span 細節)
   get_datadog_trace  (查詢特定 Trace ID)
   ```
   對於調查逾時（Timeouts）、重試（Retries）、慢路徑（Slow paths）與跨服務呼叫行為特別有效。

6. **線上事故紀錄（Incidents）**：
   ```text
   search_datadog_incidents (依標題、團隊、日期範圍搜尋)
   get_datadog_incident     (取得特定事故的完整細節與時間軸)
   ```
   若目標程式碼看起來屬於防禦性設計，請搜尋該程式碼新增時間點附近的線上事故。如果某起事故的時間軸中明確寫著「已針對 X 補上防禦性檢查」，這幾乎就是最直接的鐵證。

## 什麼是優質的證據

- 某個監控器的查詢條件與警報閾值，與程式碼強制執行的限制完全吻合（例如程式碼將上限鎖在 100，而監控器剛好在請求超過 100 次/分鐘時發出警報）。
- 由目標程式碼的同一位作者所建立的儀表板，且上面的圖表正好對應程式碼所量測或防範的目標。
- 某項指標在程式碼合併前夕於正式環境出現異常尖峰，並在合併後恢復平穩。
- 明確引用了目標程式碼、相同符號名稱或相同錯誤字串的線上事故紀錄（Incident record）。
- 在變更前的時間窗內，日誌中出現了該段防禦性程式碼剛好能攔截或防止的特定錯誤模式。

## 常見陷阱（Common Pitfalls）

- **相關性不等於因果關係（Correlation is not causation）**：PR 上線前有尖峰、上線後平穩，雖具強烈暗示性但並非絕對鐵證，因為同一時間窗內可能有其他變更一起上線。請務必對照周邊其他 PR。
- **對找到的圖表過度擬合（Overfitting to the chart）**：圖表反映的是建立者的觀察框架。一張名為「重試成功率」的圖表只證明團隊在乎重試成功率，不代表眼前的某一行程式碼就是為了這張圖而寫的。
- **已消失的歷史遙測數據（Vanished telemetry）**：指標可能被重新命名、刪除，或已超過保存期限（Retention）。若查不到當年時間窗的數據，請記錄為**「搜尋缺口（Gap）」**，而非查無異常。
- **大規模日誌雜訊（Noise at scale）**：請務必透過服務名稱、標籤（Tag）與時間範圍嚴格收斂日誌搜尋，並善用聚合工具（如 `analyze_datadog_logs`），切勿直接拉取大量原始日誌。
- **有埋點 ≠ 起因（Instrumented != caused）**：某個指標存在只代表有人在乎並量測它，不代表程式碼是因為它才新增的。請務必與 Commit / PR 日期交叉核對。

## 回報內容規範（What to Return）

針對每一項相關發現，請回報：
- **類型**：儀表板（dashboard）／監控器（monitor）／指標（metric）／日誌模式（log pattern）／追蹤（trace）／事故（incident）／筆記（notebook）
- **標題或名稱**
- **連結或識別碼**（Dashboard ID、Monitor ID、Metric 名稱、Incident ID）
- **擁有者／作者與建立／修改日期**
- **與問題相關的確切條件、查詢語法或文字引述**（盡可能逐字引述）
- **關聯性評估**：這項證據對目標程式碼暗示了什麼，以及關聯強度為何
