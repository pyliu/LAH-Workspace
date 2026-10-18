# Create a note（建立筆記）

建立筆記功能讓使用者能從瀏覽器或 CLI 儲存帶有標題的筆記、取消未完成的草稿，並從第二個面向使用者的視角確認筆記已成功儲存。

## Sub-features

- `create-open`：從每個瀏覽器進入點開啟空白編輯器。
- `create-save`：將標題與內文持久化儲存。
- `create-cancel`：捨棄未完成的瀏覽器草稿。
- `create-cli`：從終端機建立相同結構的筆記。

## How to get to it (user POV)

- 點擊瀏覽器工具列中的 `New note` 按鈕。
- 當焦點不在可編輯欄位內時，在瀏覽器中按下 `n` 鍵。
- 在終端機執行 `notes create --title <title> --body <body>`。

## Driving it with control-notes

Preconditions:

- Notes 在 `http://127.0.0.1:4173` 健康運作中。
- 目前沒有任何標題為 `Release checklist` 的筆記。
- `control-notes doctor` 回報預期的 URL 與用完即丟的隔離資料目錄。

- **開啟編輯器（Open editor）**：選擇 `New note`。執行 `control-notes browser click --role button --name "New note"`。名為 `Note editor` 的表單會出現，且焦點位於 `Title` 文字方塊中。
- **輸入內容（Enter content）**：輸入標題與內文。執行 `control-notes browser fill --role textbox --name "Title" --value "Release checklist"` 與 `control-notes browser fill --role textbox --name "Body" --value "Tag and publish"`。此時 `Save note` 按鈕會變為啟用狀態（enabled）。
- **儲存筆記（Save note）**：選擇 `Save note`。執行 `control-notes browser click --role button --name "Save note"`。畫面出現名為 `Note saved` 的狀態訊息，且標題顯示為 `Release checklist`。
- **確認持久化（Confirm persistence）**：返回筆記列表並重新開啟該筆記。執行 `control-notes browser click --role link --name "All notes"` 與 `control-notes browser click --role link --name "Release checklist"`。編輯器正確顯示剛才儲存的標題與內文。
- **取消草稿（Cancel draft）**：開啟一則新筆記、輸入 `Discard me`，然後選擇 `Cancel`。執行 `control-notes browser click --role button --name "New note"`、`control-notes browser fill --role textbox --name "Title" --value "Discard me"`，以及 `control-notes browser click --role button --name "Cancel"`。畫面返回筆記列表，且列表中沒有 `Discard me` 連結。
- **CLI 進入點（CLI entry）**：建立第二則筆記。執行 `control-notes cli -- notes create --title "CLI note" --body "Created from terminal" --format json`。結束代碼為 `0`，且 stdout 包含新筆記的 ID 與標題。
- **擷取證明（Proof）**：從 `All notes` 檢視兩則已儲存的筆記。執行 `control-notes browser snapshot --aria --path artifacts/create-note/list.aria.txt` 與 `control-notes browser screenshot --path artifacts/create-note/list.png`。產物中清楚顯示 `Release checklist` 與 `CLI note`。

## Gotchas

- 當文字方塊持有焦點時按下 `n` 鍵，只會輸入字元 `n`，而不會開啟新編輯器。
- 標題在儲存時會自動去除前後空白（trim）。請針對渲染後的標題進行斷言，而非草稿輸入值。
- 單憑出現「已儲存」狀態訊息不足以作為持久化證明，必須從列表中重新開啟該筆記確認。
- 在測試資料清理（fixture cleanup）期間請移除 `Release checklist` 與 `CLI note`，但務必保留它們的證明產物（proof artifacts）。
