# Registration Control Hub（智慧控管中心與逾期案件查詢）

智慧控管系統（`/reg`）提供地政登記業務的集中導覽中樞，支援依業務分類膠囊（時效流程控管、涉外特定管制、異動標的檢核、統計便民服務）篩選、關鍵字即時搜尋、星號釘選「我的常用快捷」持久化儲存，以及進入「即將逾期案件（`/reg/expire`）」切換即將逾期與已逾期模式。

## Sub-features

- `reg-category-filter`：透過分類膠囊按鈕切換顯示對應類別的功能卡片並更新計數。
- `reg-keyword-search`：透過頂部搜尋框即時過濾功能卡片，並支援清除搜尋恢復完整清單。
- `reg-favorite-pin`：點擊卡片右上角星號釘選至「我的常用快捷」區塊，重新整理頁面後依然保留。
- `reg-expire-switch`：進入 `/reg/expire` 檢視登記案件列表，並在「即將逾期」與「逾期」模式間切換。

## How to get to it (user POV)

- 從入口網首頁（`/`）點擊「智慧控管工具」卡片進入 `/reg`。
- 在瀏覽器直接開啟 `http://127.0.0.1:8080/reg`。
- 從 `/reg` 點擊「即將逾期案件」卡片或直接開啟 `http://127.0.0.1:8080/reg/expire`。

## Driving it with control-lah

Preconditions:

- `LAH-FE`（`:8080`）與 `LAH-API`（`:80`，`MOCK=true`）健康運作中。
- `node .agents/skills/verify-lah/scripts/control-lah.js doctor` 檢查通過。

- **開啟智慧控管首頁（Open Registration Hub）**：導覽至 `/reg` 並確認全部分類載入。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/reg --wait-ms 2500` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "桃園市地政 智慧控管系統"`。頂部計數按鈕顯示 `共 24 項`（或當前全部項目數）。
- **切換分類過濾（Filter by Category）**：點擊 `涉外特定管制` 分類膠囊。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --text "涉外特定管制"`，接著擷取快照 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/category-foreigner.aria.txt`。頂部計數更新為 `共 5 項`，畫面僅顯示 `外人繼承管制清冊`、`非專業代理人案件`、`外國人地權案件`、`外國人掃描資料`、`私法人購置住宅`。
- **關鍵字即時搜尋（Search by Keyword）**：先切回 `全部項目`，再於搜尋框輸入 `信託`。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --text "全部項目"` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser fill --placeholder "搜尋功能、關鍵字" --value "信託"`。頂部計數立即變為 `共 1 項`，畫面僅保留 `信託相關案件` 卡片。接著執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/search-trust.aria.txt` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/search-trust.png`。
- **清除搜尋並釘選常用功能（Clear Search & Pin Favorite）**：清空搜尋框並點擊第一張卡片右上角的星號按鈕。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser fill --placeholder "搜尋功能、關鍵字" --value ""` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --selector ".star-btn"`。畫面上方立即出現 `我的常用快捷` 區塊與 `清空釘選` 按鈕。
- **確認釘選持久化並還原（Confirm Persistence & Restore）**：重新載入 `/reg` 頁面確認 `我的常用快捷` 依然存在，擷取截圖後點擊 `清空釘選` 還原狀態。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/reg --wait-ms 2000`、`node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "我的常用快捷"`、`node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/favorites-persisted.png`、`node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/favorites-persisted.aria.txt`，最後執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser click --text "清空釘選"`。
- **檢視即將逾期案件頁面（Inspect Expire Page）**：前往 `/reg/expire` 並切換「逾期」模式。執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/reg/expire --wait-ms 2500`、`node .agents/skills/verify-lah/scripts/control-lah.js browser click --text "逾期"`，並執行 `node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/reg-expire.aria.txt` 與 `node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/reg-control-hub/reg-expire.png`。

## Gotchas

- 當搜尋框中有文字時（`searchKeyword` 非空），`我的常用快捷` 區塊會自動隱藏（`v-if="favoriteItems.length > 0 && !searchKeyword"`）；驗證常用快捷前務必先清空搜尋框。
- 在 `MOCK=true` 模式下，若本機快取資料庫尚未預熱某日的逾期案件快取，`/reg/expire` 表格筆數可能顯示 `0 件`，這屬於 Mock 快取狀態而非頁面錯誤，應以頂部控制項（`即將逾期` / `逾期` 切換、說明視窗、重設按鈕）正常渲染與切換作為 UI 判定依據。
