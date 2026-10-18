# Sentry 錯誤與例外追蹤歷史調查劇本（Sentry Error History）

## 如何搜尋與挖掘

使用環境中的 Sentry（或同類型的 Rollbar、Bugsnag、Airbrake 等錯誤追蹤系統）MCP 工具：

1. **定位組織與專案（Orient）**：若尚不清楚專案名稱（Slug）與所屬組織，請先執行：
   ```text
   find_organizations
   find_projects
   ```

2. **搜尋與調查目標相關的錯誤議題（Search for issues related to the target）**：
   ```text
   search_issues (可使用自然語言或關鍵字，例如 "errors in PaymentService timeout"、"unhandled exceptions in uploadFile")
   ```
   請根據目標程式碼所捕捉的例外類別名稱（Exception class names）、函式或類別名稱、檢查的錯誤訊息字串，以及檔案路徑來組合查詢詞。

3. **依發布版本與時間範圍收斂（Narrow by release and time window）**：
   ```text
   search_issue_events (依版本 Release、時間、環境、Trace ID、標籤 Tags 過濾)
   get_issue_tag_values (檢視某個錯誤議題在不同版本、使用者、環境間的分佈)
   ```
   針對疑似相關的錯誤議題，請重點檢查：
   - **首次出現（First seen）** 與 **最後出現（Last seen）** 時間戳記（錯誤停止發生的時間點，是否剛好與目標程式碼上線日期吻合？）。
   - **受影響的版本（Affected releases）**（哪些版本發生了錯誤？哪個版本修復了它？）。
   - **發生頻率軌跡（Frequency trajectory）**（是否曾出現錯誤暴增尖峰，隨後被解決？）。

4. **拉取完整錯誤事件以檢視脈絡（Pull the full event for context）**：
   ```text
   get_sentry_resource (傳入 Sentry URL 或類型 + ID)
   ```
   檢查呼叫堆疊（Stack trace）是否真的經過目標程式碼？標籤（Tags）與麵包屑軌跡（Breadcrumbs）是否與目標程式碼所防禦的條件完全吻合？

5. **檢查目標程式碼新增前後的發布版本（Check releases near the target）**：
   ```text
   find_releases (查詢目標 Commit 日期前後的發布版本)
   ```
   將發布版本號與 PR 的合併日期進行交叉核對。

6. **審慎使用 AI 根因分析工具（Use Seer sparingly）**：
   ```text
   analyze_issue_with_seer
   ```
   Sentry Seer 的 AI 根因分析只能當作「假設產生器（Hypothesis generator）」，請將其視為推論而非權威事實。真實的錯誤事件與呼叫堆疊（Stack traces）才是第一手主要證據。

## 回報內容規範（What to Return）

針對每一項相關的錯誤議題（Issue），請回報：
- **議題 ID（Issue ID）與標題**
- **所屬專案與組織**
- **首次出現（First seen）／最後出現（Last seen）時間戳記**
- **事件發生總次數**（若知道抽樣率 Sampling rate 請一併註明）
- **受影響的發布版本（Affected releases）**
- **具有代表性的呼叫堆疊（Stack trace）片段**，以證明其與目標程式碼的關聯（請提供逐字摘錄，而非自行摘要）
- **首次／最後出現時間與目標程式碼上線日期的時序關聯**
- **議題連結（Link）**
- **任何作者留下的註解或解決方案說明**
