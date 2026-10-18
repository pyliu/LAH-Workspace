# Notes 驗證功能地圖（範例）

本目錄是驗證 Notes 應用程式面向使用者行為的持續維護基準來源。在驅動應用程式之前請先閱讀本索引，接著使用對應的功能檔案作為操作配方（recipe）。

## 基準前提條件（Baseline preconditions）

- 在 `http://127.0.0.1:4173` 啟動 Notes，並搭配用完即丟的隔離資料目錄。
- 設定 `NOTES_DATA_DIR=/tmp/notes-verify-$RUN_ID`，確保並行執行時不會共用狀態。
- 預先載入標題為 `Quarterly plan` 與 `Grocery list` 的種子筆記。
- 將 `control-notes` 與 `notes` CLI 加入 `PATH`。
- 執行 `control-notes doctor`，確認回傳預期的 URL、資料目錄與建置版本號。
- 切勿驅動非本次驗證執行所啟動的實例。

## 驅動慣例（Driving conventions）

- 除非功能檔案的前提條件另有說明，否則每個配方皆從基準狀態開始。
- 優先使用 ARIA 角色（roles）與無障礙名稱（accessible names），而非 CSS 選擇器或 DOM 位置。
- 將每一個指令視為字面常數，保持引號內的名稱與旗標原封不動。
- 瀏覽器操作透過 `control-notes browser` 執行。
- 終端機操作透過 `control-notes cli -- <command>` 執行。
- 在進行資料異動（mutation）測試後還原種子資料。清理（cleanup）期間切勿刪除證明產物（proof artifacts）。

## 證明與跳過回報規範（Proof and skip reporting）

- 必須同時擷取「使用者操作動作」與「結果狀態」，不能只擷取最後一個畫面。
- UI 證明包含一份 ARIA 快照與一張能清楚辨識應用程式身分（如標題列或網址）的螢幕截圖。
- CLI 證明包含執行的指令、stdout、stderr 與結束代碼（exit code）。
- 資料異動證明必須包含從第二個唯讀視角（例如重新載入列表或另一端點）確認已儲存數值的紀錄。
- 每個證明產物都必須記錄所使用的功能 ID 與進入點（entry point）。
- 若某條路徑無法到達，請回報所嘗試的指令以及未滿足的前提條件。
- 切勿因為透過另一條替代路徑驗證成功，就把被跳過的進入點也回報為已驗證。

## 功能條目契約（Feature entry contract）

每個功能檔案皆以 H1 標題與一段描述使用者可見行為的文字開頭，接著嚴格依序使用以下四個 H2 章節：

1. `Sub-features`（子功能）：列出簡短 ID，每個行為用一行說明。
2. `How to get to it (user POV)`（如何進入 - 使用者視角）：列出所有使用者進入點。
3. `Driving it with <harness>`（使用測試架驅動）：以 `Preconditions:`（前提條件）開頭，接著使用帶標籤的列點，將每個使用者動作與確切指令及可觀測結果配對。
4. `Gotchas`（常見陷阱）：列出可能浪費時間或使驗證執行失效的陷阱。

請將內部實作細節排除在地圖之外。地圖中只寫出使用者路徑、穩定控制代碼、必要狀態、執行指令與可觀測的證明。

## 功能清單（Features）

- [建立筆記（Create a note）](./create-note.md)：涵蓋瀏覽器與 CLI 建立、取消草稿、資料持久化與清理。
- [搜尋筆記（Search notes）](./search.md)：涵蓋工具列、鍵盤快捷鍵與 CLI 搜尋，包含符合結果、空狀態與清除搜尋。
