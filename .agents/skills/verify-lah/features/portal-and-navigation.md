# Portal and Navigation（地政事務所入口網與全域導覽）

地政事務所入口網（`/`）作為 `LAH-FE` 的總入口，會根據 `LAH-API` `/api/auth_json_api.php` 回傳之本機 IP 使用者身分（本機 `127.0.0.1` 預設對應 `HAADMIN` 系統管理員）動態渲染六大業務系統入口卡片、最新即時通公告欄，以及全域左側導覽抽屜與頂部 MOCK 模式狀態指示按鈕。

## Sub-features

- `portal-auth-api`：透過 `/api/auth_json_api.php` 取得本機登入身分、站台代碼與 `mock: true` 設定。
- `portal-cards`：在首頁渲染智慧監控、智慧控管、地價小幫手、測量小幫手、資訊實驗室及系統管理選單卡片。
- `portal-sidebar`：點擊左上角選單按鈕展開全域側邊導覽抽屜。
- `portal-navigate-reg`：從入口網卡片點擊進入智慧控管系統並顯示頂部 MOCK 模擬模式返回首頁按鈕。

## How to get to it (user POV)

- 在瀏覽器直接開啟 `http://127.0.0.1:8080/`。
- 在任何子頁面點擊右上角首頁按鈕（MOCK 模式下顯示為綠色筆電圖示，提示文字為 `注意：系統處於模擬模式`）返回 `/` 入口網。
- 在任何頁面點擊左上角漢堡選單按鈕（`.bars-button`，提示文字 `開啟選單`）展開左側導覽抽屜。

## Driving it with control-lah

Preconditions:

- `node .agents/skills/verify-lah/scripts/control-lah.js doctor` 檢查全數通過。
- 本機 `127.0.0.1` 在 `dimension.db` 中對應 `HAADMIN`（具備 `isAdmin: true` 權限）。

- **檢驗登入與 MOCK 組態 API（Verify Auth API）**：呼叫登入端點確認回傳管理員權限與模擬模式。執行 `node .agents/skills/verify-lah/scripts/control-lah.js api auth_json_api.php --data type=login --data req_ip=127.0.0.1 --json .agents/skills/verify-lah/artifacts/portal-and-navigation/auth-login.json`。回應 JSON 中 `status` 為 `1`、`configs.mock` 為 `true`、`user.id` 為 `"HAADMIN"`。
- **開啟入口網首頁（Open Portal Home）**：導覽至首頁並等待入口網標題與系統卡片渲染完成。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/ --wait-ms 2500` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "地政事務所入口網"`。畫面出現 `HA 地政事務所入口網`，並顯示 `智慧監控工具`、`智慧控管工具`、`地價小幫手`、`測量小幫手`、`資訊實驗室`、`系統管理選單` 等入口卡片。
- **展開左側全域導覽選單（Open Global Sidebar）**：點擊左上角選單按鈕。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --selector ".bars-button"`。左側滑出 `#lah-sidebar` 導覽抽屜，顯示使用者問候語與各子系統快速連結。
- **擷取入口網與選單證明（Capture Portal Proof）**：儲存快照與截圖。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/portal-and-navigation/portal-home.aria.txt` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/portal-and-navigation/portal-home.png`。
- **點擊卡片導覽至子系統（Navigate via Card）**：前往智慧控管系統並確認頂部 MOCK 模式首頁按鈕出現。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/reg --wait-ms 2000`，接著執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/portal-and-navigation/reg-header.aria.txt`。快照中包含 `title="注意：系統處於模擬模式"` 的返回首頁按鈕。

## Gotchas

- `智慧監控工具` 與 `系統管理選單` 兩張卡片受 `v-if="isInf || authority.isAdmin"` 與 `v-if="authority.isAdmin"` 保護；必須待前端完成 `/api/auth_json_api.php` 非同步登入請求（約 500–1500ms）後才會出現在 DOM 中。
- 首頁（`/`）本身不顯示右上角的 `.home-button`（因為 `showHome` 條件為 `this.$route.path !== '/'`），需進入非首頁路由才能觀測到右上角的綠色模擬模式指示按鈕。
