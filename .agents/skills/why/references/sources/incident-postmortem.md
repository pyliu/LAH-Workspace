# 線上事故與事後檢討脈絡（Incident & Postmortem Context）

當目標程式碼帶有防禦性特徵（如 Null 檢查、重試邏輯、逾時處理、速率限制、功能旗標、邊界防護、資料庫鎖定處理或 OOM 處理）時，請在你負責的資料來源中額外執行以下事故導向查詢：

- **議題與工單追蹤（如 Linear / Jira / GitHub Issues）**：搜尋帶有 `incident`、`sev-*`、`postmortem-action-item`、`reliability`、`hotfix` 等標籤的工單。
- **即時團隊對話（如 Slack / Teams / 即時通）**：搜尋目標程式碼新增日期前後的 `#sev-*`、`#incident-*` 或系統告警頻道討論紀錄。
- **版本控制（Git）**：搜尋 Commit 訊息中包含 `fix for incident`、`add defensive check`、`hotfix`、`revert`（以及緊接著重新套用的 Commit），或繁體中文訊息中包含「緊急修正」、「防呆」、「避免逾時／鎖定」、「還原」等強烈訊號的提交紀錄。
