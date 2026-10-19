# Monitoring and Admin Center（智慧監控系統與管理主面板）

智慧監控系統（`/inf`）與控管系統管理主面板（`/admin`）提供資訊課與系統管理員專用的監控戰情室入口（系統管理面板、戰情面板、跨域伺服器監控、同步異動監控、全國連線監控）與後台四大管理模組（員工資訊、使用者角色、IP 對應名稱、系統參數），並由 `LAH-API` `/api/system_json_api.php` 控管後端系統旗標。

## Sub-features

- `system-api-mock-check`：透過 `system_json_api.php`（`type=switch_mock_flag`）確認後端系統層級的 `mock_flag` 為 `true`。
- `inf-hub-and-help`：開啟 `/inf` 智慧監控系統中控台，並點擊說明按鈕彈出「智慧監控系統功能指引」視窗。
- `admin-hub-cards`：開啟 `/admin` 管理主面板，確認四大後台管理卡片（員工資訊、使用者角色、IP 對應名稱、系統參數）完整呈現。

## How to get to it (user POV)

- 從入口網首頁（`/`）點擊「智慧監控工具」卡片進入 `/inf`，或點擊「系統管理選單」卡片進入 `/admin`。
- 在瀏覽器直接開啟 `http://127.0.0.1:8080/inf` 或 `http://127.0.0.1:8080/admin`。

## Driving it with control-lah

Preconditions:

- `LAH-API`（`:80`）與 `LAH-FE`（`:8080`）健康運作中，且本機 `127.0.0.1` 具備 `isAdmin: true` 權限。
- `node .agents/skills/verify-lah/scripts/control-lah.js doctor` 檢查通過。

- **檢驗系統旗標 API（Verify System Mock Flag API）**：呼叫 `system_json_api.php` 查詢 `switch_mock_flag`。執行 `node .agents/skills/verify-lah/scripts/control-lah.js api system_json_api.php --data type=switch_mock_flag --json .agents/skills/verify-lah/artifacts/inf-and-admin-center/system-mock-flag.json`。回應 JSON 中 `status` 為 `1` 且 `mock_flag` 為 `true`。
- **開啟智慧監控系統並檢視功能指引（Open Monitoring Hub & Help Modal）**：導覽至 `/inf` 並點擊頂部說明按鈕。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/inf --wait-ms 2500`、`node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "智慧監控系統"`，接著執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --selector "[title='監控系統功能說明']"`。畫面彈出 `智慧監控系統功能指引` 視窗，列出 `/inf/mgt`、`/inf/dashboard`、`/inf/xap`、`/inf/lxhweb` 與 `/inf/xap/connectivity` 說明。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/inf-and-admin-center/inf-help-modal.aria.txt` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/inf-and-admin-center/inf-help-modal.png`。
- **開啟管理主面板（Open Admin Dashboard）**：導覽至 `/admin` 並確認四大後台模組卡片。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/admin --wait-ms 2500`、`node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "控管系統管理主面板"`，接著執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/inf-and-admin-center/admin-hub.aria.txt` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/inf-and-admin-center/admin-hub.png`。快照與截圖中清楚顯示 `員工資訊管理`、`使用者角色管理`、`IP對應名稱管理` 與 `系統參數管理`。

## Gotchas

- `system_json_api.php` 具有嚴格的 `isAdmin` 權限守衛（`!$auth['isAdmin']` 時回傳 `非 Admin 無法執行命令`）；本機 `127.0.0.1` 在 `dimension.db` 中預設綁定 `HAADMIN`（`authority = 2`），因此可正常通過。
- **嚴禁在驗證過程中呼叫 `type=switch_disable_mock`**，且由於 `.env` 中已設定 `MOCK=true`，`System::isMockMode()` 會優先讀取 `.env` 的 `MOCK=true` 確保安全。
