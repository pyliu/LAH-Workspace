# Search notes（搜尋筆記）

搜尋功能讓使用者能透過標題或內文文字尋找筆記、檢視符合的筆記，並清楚區分「無符合結果」與「搜尋功能異常」。

## Sub-features

- `search-open`：從每個受支援的瀏覽器進入點開啟搜尋對話框。
- `search-match`：在不修改筆記資料的前提下，回傳標題與內文符合的項目。
- `search-open-result`：在筆記編輯器中開啟搜尋結果。
- `search-empty`：針對無符合結果的查詢字串顯示完整的空狀態（empty state）。
- `search-clear`：移除查詢字串並還原為近期筆記檢視畫面。
- `search-cli`：從終端機回傳相同的符合筆記。

## How to get to it (user POV)

- 點擊瀏覽器工具列中的 `Search` 按鈕。
- 當焦點不在可編輯欄位內時，在瀏覽器中按下 `/` 鍵。
- 在終端機執行 `notes search <query>`。

## Driving it with control-notes

Preconditions:

- Notes 在 `http://127.0.0.1:4173` 健康運作中。
- 隔離資料目錄中包含標題為 `Quarterly plan`、內文為 `Draft budget` 的筆記。
- `control-notes doctor` 回報預期的 URL 與資料目錄。

- **工具列進入點（Toolbar entry）**：選擇 `Search` 按鈕。執行 `control-notes browser click --role button --name "Search"`。名為 `Search notes` 的對話框會出現，且焦點位於搜尋方塊中。
- **鍵盤進入點（Keyboard entry）**：關閉對話框、將焦點移回頁面，並按下 `/` 鍵。執行 `control-notes browser press --key "/"`。相同的搜尋對話框會出現，且頁面不會插入斜線字元。
- **標題符合（Title match）**：輸入 `quarterly`。執行 `control-notes browser fill --role searchbox --name "Search notes" --value "quarterly"`。`Search results` 列表中包含 `Quarterly plan`，且不包含 `Grocery list`。
- **內文符合（Body match）**：將查詢字串替換為 `budget`。執行 `control-notes browser fill --role searchbox --name "Search notes" --value "budget"`。結果 `Quarterly plan` 依然可見，並附帶符合內文的摘要片段。
- **開啟結果（Open result）**：選擇 `Quarterly plan`。執行 `control-notes browser click --role link --name "Quarterly plan"`。搜尋對話框關閉，且編輯器標題顯示為 `Quarterly plan`。
- **空狀態（Empty state）**：重新開啟搜尋並輸入 `volcano`。執行 `control-notes browser fill --role searchbox --name "Search notes" --value "volcano"`。搜尋完成後出現名為 `No matching notes` 的狀態訊息。
- **清除查詢（Clear query）**：選擇 `Clear search`。執行 `control-notes browser click --role button --name "Clear search"`。搜尋方塊清空，且 `Recent notes` 區塊取代搜尋結果列表。
- **CLI 符合結果（CLI match）**：從終端機執行搜尋。執行 `control-notes cli -- notes search "quarterly" --format json`。結束代碼為 `0`，且 stdout 包含一個標題為 `Quarterly plan` 的物件。
- **CLI 無符合結果（CLI miss）**：搜尋不存在的值。執行 `control-notes cli -- notes search "volcano" --format json`。結束代碼為 `0`，且 stdout 為 `[]`。
- **擷取證明（Proof）**：擷取顯示搜尋結果的狀態。執行 `control-notes browser snapshot --aria --path artifacts/search/results.aria.txt` 與 `control-notes browser screenshot --path artifacts/search/results.png`。兩份產物皆清楚呈現 Notes 應用程式、查詢字串與 `Quarterly plan`。

## Gotchas

- 當編輯器或搜尋方塊持有焦點時按下 `/` 鍵，會直接插入斜線文字，而不會開啟搜尋對話框。
- 搜尋結果會在短暫的防抖動（debounce）延遲後更新。請等待結果列表或空狀態元素出現，不要使用固定秒數的 `sleep`。
- 已封存（archived）的筆記預設會被排除，除非使用者勾選了 `Include archived`。
- CLI 預設輸出人類易讀格式；進行自動化斷言時請務必加上 `--format json`。
- 點擊開啟搜尋結果會改變瀏覽器當前狀態；在驗證下一個查詢之前，請先重新開啟搜尋對話框。
