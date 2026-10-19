# Messenger and Attachments（即時通訊頻道訊息、附件收發與儀表板）

即時通訊系統由 `lah-messenger-server`（WebSocket `:8081` 與 HTTP 附件 `:8082`）提供後端頻道分庫（SQLite `db/<channel>.db`）與檔案儲存，並在 `LAH-FE` 中透過右側即時通側邊欄（`#lah-messenger-sidebar`）及四欄式即時通訊儀表板（`/websocket`）呈現。

## Sub-features

- `ws-send-and-persist`：在隔離測試頻道（`verify_test_run`）發送即時訊息，並由第二個唯讀客戶端查詢 `latest` 證明訊息已持久化至 SQLite。
- `ws-attachment-lifecycle`：針對已建立的訊息上傳附件、查詢附件列表並刪除附件，驗證 Multipart 順序契約與通知機制。
- `fe-messenger-sidebar`：在 `LAH-FE` 任一頁面點擊右側邊角「即時通」把手展開即時通抽屜。
- `fe-websocket-dashboard`：進入 `/websocket` 檢視全所公告、部門頻道、全所頻道與線上同仁四欄式儀表板。

## How to get to it (user POV)

- 在 `LAH-FE` 畫面右側邊緣點擊「即時通」懸浮把手（`.sidebar-edge-handle`）展開即時通側邊欄。
- 在瀏覽器直接開啟 `http://127.0.0.1:8080/websocket`（或從左側選單點擊「即時通訊儀表板」）。
- 桌面端與前端元件透過 `ws://127.0.0.1:8081` 收發訊息，並透過 `http://127.0.0.1:8082/api/upload` 與 `/api/attachments/:channel/:messageId` 管理附件。

## Driving it with control-lah

Preconditions:

- `lah-messenger-server` 於 `:8081`（WS）與 `:8082`（HTTP）健康運作中。
- `node .agents/skills/verify-lah/scripts/control-lah.js doctor` 檢查通過。
- 所有寫入操作必須指定 `--channel verify_test_run`，嚴禁寫入正式或既有頻道。

- **發送訊息至隔離頻道（Send Message to Isolated Channel）**：透過 WebSocket 註冊並傳送測試訊息至 `verify_test_run`。執行 `node .agents/skills/verify-lah/scripts/control-lah.js ws send --channel verify_test_run --sender HAADMIN --content "LAH自動化驗證訊息_01" --json .agents/skills/verify-lah/artifacts/messenger-and-attachments/ws-send.json`。回應 JSON 中 `ok` 為 `true`，且 `message.id` 為正整數（如 `1`）。
- **第二視角確認訊息持久化（Confirm Persistence via Secondary Client）**：以獨立唯讀連線查詢 `verify_test_run` 頻道的 `latest` 訊息。執行 `node .agents/skills/verify-lah/scripts/control-lah.js ws latest --channel verify_test_run --limit 5 --json .agents/skills/verify-lah/artifacts/messenger-and-attachments/ws-latest.json`。回應 JSON 中 `count` 大於或等於 `1`，且包含剛才發送的 `"LAH自動化驗證訊息_01"`。
- **上傳訊息附件（Upload Attachment）**：將剛才產生的 `ws-send.json` 作為純文字/JSON 測試附件上傳至訊息 `#1`。執行 `node .agents/skills/verify-lah/scripts/control-lah.js ws upload --channel verify_test_run --message-id 1 --file .agents/skills/verify-lah/artifacts/messenger-and-attachments/ws-send.json --json .agents/skills/verify-lah/artifacts/messenger-and-attachments/ws-upload.json`。回應 JSON 中 `status` 為 `1`，並回傳 `data.storedName`。
- **查詢訊息附件清單（List Attachments）**：從唯讀 HTTP 端點確認附件已綁定至該訊息。執行 `node .agents/skills/verify-lah/scripts/control-lah.js ws attachments --channel verify_test_run --message-id 1 --json .agents/skills/verify-lah/artifacts/messenger-and-attachments/ws-attachments.json`。回應 JSON 中 `status` 為 `1` 且 `data` 陣列長度為 `1`。
- **檢視前端即時通訊儀表板與側邊欄（Inspect WebSocket Dashboard & Sidebar）**：在瀏覽器開啟 `/websocket` 儀表板並擷取快照與截圖。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/websocket --wait-ms 2500`、`node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "即時通訊儀表板"`、`node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/messenger-and-attachments/websocket-dashboard.aria.txt`，以及 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/messenger-and-attachments/websocket-dashboard.png`。

## Gotchas

- `upload-router.js` 使用 `multer.diskStorage` 時，在解析到 `file` 欄位當下就必須讀取 `req.body.channel` 與 `req.body.message_id`；因此 Multipart 表單欄位順序**必須嚴格為 `channel` -> `message_id` -> `file`**（`control-lah.js ws upload` 已內建此順序）。
- 上傳附件前，對應的 `db/<channel>.db` 與 `message.id` 必須已存在於 SQLite 中，否則 `upload-router.js` 的 `messageExists()` 會回傳 HTTP 404 (`MESSAGE_NOT_FOUND`)。
- `LAH-FE` 前端預設連線的 WebSocket IP 取自 `/api/auth_json_api.php` 回傳的 `WS_SERVER_IP`（在 `.env` 中可能指向內網伺服器如 `220.1.34.75:8081`）；若本機無法路由至該內網 IP，`/websocket` 頁面頂部出現「即時通伺服器連線中或尚未連線」黃色提示列與「設定伺服器」按鈕屬於正常防呆行為。
