# Users Directory（員工名錄查詢與部門分類檢索）

員工名錄（`/users`）從 `LAH-API` `/api/user_json_api.php`（讀取本機 SQLite `dimension.db`）載入全所員工資料，提供依部門（登記課、測量課、行政課、地價課、資訊課等）篩選、依職稱／角色／工作／性別分組摺疊檢視，以及關鍵字即時搜尋同仁卡片。

## Sub-features

- `users-api-query`：透過 `user_json_api.php` 查詢在職同仁名冊與特定關鍵字使用者。
- `users-dept-filter`：在 `/users` 頁面切換部門下拉選單，動態更新各分組下的同仁卡片。
- `users-group-switch`：切換「職稱」、「角色」、「工作」、「性別」分組按鈕，重組摺疊面板。
- `users-keyword-filter`：輸入關鍵字即時過濾可見的同仁名片。

## How to get to it (user POV)

- 在瀏覽器直接開啟 `http://127.0.0.1:8080/users`。
- 在任何頁面展開左上角 `#lah-sidebar` 選單，點擊「員工名錄」連結。

## Driving it with control-lah

Preconditions:

- `LAH-API`（`:80`）與 `LAH-FE`（`:8080`）健康運作中，且 `LAH-API/www/db/dimension.db` 包含種子員工資料。
- `node .agents/skills/verify-lah/scripts/control-lah.js doctor` 檢查通過。

- **檢驗後端使用者搜尋 API（Verify User Search API）**：呼叫 `user_json_api.php` 搜尋 `HAADMIN`。執行 `node .agents/skills/verify-lah/scripts/control-lah.js api user_json_api.php --data type=search_user --data keyword=HAADMIN --json .agents/skills/verify-lah/artifacts/users-directory/api-search-haadmin.json`。回應 JSON 中 `status` 為 `1` 且 `data_count` 大於或等於 `1`。
- **開啟員工名錄頁面（Open Users Directory）**：導覽至 `/users` 並等待員工卡片渲染。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/users --wait-ms 2500` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "員工名錄"`。畫面顯示部門下拉選單、分組切換按鈕（`職稱`、`角色`、`工作`、`性別`、`未分類`）與員工卡片清單。
- **切換分組維度（Switch Grouping Mode）**：點擊 `職稱` 分組按鈕。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --text "職稱"`，並擷取快照 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/users-directory/grouped-by-title.aria.txt`。畫面依職稱分類顯示摺疊標題與人數徽章。
- **關鍵字過濾員工卡片（Filter by Keyword）**：在過濾輸入框輸入 `HAADMIN`（或 `系統管理`）。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser fill --placeholder "可輸入過濾字串" --value "HAADMIN"`，接著執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/users-directory/filtered-haadmin.aria.txt` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/users-directory/filtered-haadmin.png`。畫面僅保留符合 `HAADMIN` 的員工卡片。

## Gotchas

- `/users` 的關鍵字輸入框 placeholder 為 `... 可輸入過濾字串 ...`，使用 `--placeholder "可輸入過濾字串"` 即可穩定匹配。
- 「在職／離職」核取方塊僅在具備 `isAdmin` 或 `isUserMgtStaff` 權限時才可勾選（本機 `127.0.0.1` 預設為 `HAADMIN`，具備該權限）。
