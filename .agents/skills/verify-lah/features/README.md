# LAH 工作區驗證功能地圖（Feature Map）

本目錄是驗證 `lah-workspace`（涵蓋 `LAH-FE`、`LAH-API`、`lah-messenger-server`）面向使用者行為的持續維護基準來源。在驅動應用程式之前請先閱讀本索引，接著使用對應的功能檔案作為操作配方（recipe）。

## 基準前提條件（Baseline preconditions）

- `./LAH-API/www/.env` 中已設定 `MOCK=true`。
- 執行 `node .agents/skills/verify-lah/scripts/control-lah.js launch` 啟動所有核心服務：
  - `LAH-API`：`http://127.0.0.1:80`（在事務所開發 PC 上直接沿用常駐 Apache 2.4 `httpd` 服務；僅在無常駐 Apache 的筆電環境下才會退回執行 `./LAH-API/www/run_dev_http.bat` 的 `php -S` 折衷測試方案）
  - `LAH-FE`：`http://127.0.0.1:8080`
  - `lah-messenger-server`：`ws://127.0.0.1:8081`（WebSocket）與 `http://127.0.0.1:8082`（HTTP 附件 API）
  - `Headless Chrome CDP`：`http://127.0.0.1:9222`
- 執行 `node .agents/skills/verify-lah/scripts/control-lah.js doctor`，確認所有 6 項健康檢查與 `MOCK=true` 安全護欄皆為 `PASS`，並從輸出確認當前 `LAH-API` 宿主模式（`事務所開發PC常駐 Apache 2.4` 或 `筆電折衷 PHP 內建伺服器`）。
- 涉及即時通訊息寫入或附件上傳時，一律使用 `verify_test_run` 隔離頻道，切勿寫入正式或既有開發頻道。

## 驅動慣例（Driving conventions）

- 除非功能檔案的前提條件另有說明，否則每個配方皆從基準就緒狀態開始。
- 優先使用可見文字（`--text`）、無障礙角色與名稱（`--role`、`--name`）或 placeholder（`--placeholder`），避免依賴脆弱的深層 DOM 索引。
- 瀏覽器操作透過 `node .agents/skills/verify-lah/scripts/control-lah.js browser <subcommand>` 執行。
- 後端 API 操作透過 `node .agents/skills/verify-lah/scripts/control-lah.js api <endpoint>` 執行。
- 即時通 WebSocket 與附件操作透過 `node .agents/skills/verify-lah/scripts/control-lah.js ws <subcommand>` 執行。
- 在進行資料異動測試後執行 `cleanup` 清除隔離頻道測試資料，但務必保留 `.agents/skills/verify-lah/artifacts/` 中的證明產物。

## 證明與跳過回報規範（Proof and skip reporting）

- 必須同時擷取「使用者操作動作」與「結果狀態」，不能只擷取最後一個畫面。
- UI 證明包含一份 `.aria.txt` 快照與一張能清楚辨識應用程式身分（標題列或路由特徵）的 `.png` 螢幕截圖。
- API / WebSocket 證明包含儲存為 `.json` 的完整回應結構。
- 資料異動證明必須包含從第二個唯讀視角（例如重新載入頁面、`ws latest` 查詢或 `ws attachments` 列表）確認已儲存數值的紀錄。
- 若某條路徑因外部環境前提未滿足而無法到達，請回報所嘗試的指令與未滿足的前提條件，切勿因為替代路徑通過就將被跳過的路徑標記為已驗證。

## 功能條目契約（Feature entry contract）

每個功能檔案皆以 H1 標題與一段描述使用者可見行為的文字開頭，接著嚴格依序使用以下四個 H2 章節：

1. `Sub-features`（子功能）：列出簡短 ID，每個行為用一行說明。
2. `How to get to it (user POV)`（如何進入 - 使用者視角）：列出所有使用者進入點。
3. `Driving it with control-lah`（使用測試架驅動）：以 `Preconditions:`（前提條件）開頭，接著使用帶標籤的列點，將每個使用者動作與確切指令及可觀測結果配對。
4. `Gotchas`（常見陷阱）：列出可能浪費時間或使驗證執行失效的陷阱。

## 功能清單（Features）

- [地政事務所入口網與全域導覽（Portal and Navigation）](./portal-and-navigation.md)：涵蓋入口網首頁六大系統卡片、登入資訊與權限載入、頂部 MOCK 模式指示器與左側選單抽屜。
- [智慧控管中心與逾期案件查詢（Registration Control Hub）](./reg-control-hub.md)：涵蓋 `/reg` 分類膠囊過濾、關鍵字即時搜尋、常用功能星號釘選持久化，以及 `/reg/expire` 逾期案件模式切換。
- [員工名錄查詢與部門分類檢索（Users Directory）](./users-directory.md)：涵蓋 `/users` 員工名錄載入、部門與分組維度切換、關鍵字即時過濾，以及 `user_json_api.php` 後端資料一致性對照。
- [即時通訊頻道訊息、附件收發與儀表板（Messenger and Attachments）](./messenger-and-attachments.md)：涵蓋隔離頻道 WebSocket 訊息發送、唯讀歷史訊息查詢、HTTP 附件上傳／列表／刪除閉環，以及 `/websocket` 四欄儀表板檢視。
- [智慧監控系統與管理主面板（Monitoring and Admin Center）](./inf-and-admin-center.md)：涵蓋 `/inf` 智慧監控中控台與功能指引視窗、`/admin` 管理主面板，以及 `system_json_api.php` MOCK 安全開關狀態檢核。
