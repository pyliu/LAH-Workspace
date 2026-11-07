# Issue 追蹤器：本機 Markdown (Local Markdown)

本專案的 Issues 與規格書（Specs）皆以 Markdown 檔案形式儲存在 `.scratch/` 目錄中。

## 命名與結構慣例

- 每個功能獨立一個資料夾：`.scratch/<feature-slug>/`
- 功能規格書路徑：`.scratch/<feature-slug>/spec.md`
- 實作 Issues 採「一個 Ticket 一個檔案」原則，存於 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，編號由 `01` 開始，不可合併為單一 tickets 檔案
- Triage 分類狀態記錄在每個 Issue 檔案頂部附近的 `Status:` 行（可參閱 `triage-labels.md` 定義的狀態字串）
- 討論留言與對話歷程追加在檔案底部的 `## Comments` 區塊下

## 當 Skill 指示「發布至 Issue 追蹤器 (publish to the issue tracker)」時

在 `.scratch/<feature-slug>/` 下建立對應的新檔案（若資料夾不存在則自動建立）。

## 當 Skill 指示「獲取相關 Ticket (fetch the relevant ticket)」時

讀取所參照路徑下的檔案，使用者通常會直接提供路徑或 Issue 編號。

## 探路操作 (Wayfinding operations)

由 `/wayfinder` 技能使用。**地圖 (Map)** 是一個主檔案，每個 Ticket 對應一個子檔案：

- **地圖檔 (Map)**：`.scratch/<effort>/map.md`（包含 Notes / Decisions-so-far / Fog 內文）。
- **子 Ticket (Child ticket)**：`.scratch/<effort>/issues/NN-<slug>.md`，由 `01` 開始編號，問題寫在內文中。使用 `Type:` 行記錄 Ticket 類型（`research`/`prototype`/`grilling`/`task`）；使用 `Status:` 行記錄 `claimed`/`resolved`。
- **阻礙關係 (Blocking)**：於頂部附近使用 `Blocked by: NN, NN` 行。當所列的每個檔案皆標記為 `resolved` 時，該 Ticket 即解除阻礙。
- **探索前沿 (Frontier)**：掃描 `.scratch/<effort>/issues/` 中狀態為未結案 (open)、無阻礙且尚未認領 (unclaimed) 的檔案；編號最小者優先。
- **認領 (Claim)**：在開始進行工作前，將狀態更新為 `Status: claimed` 並儲存。
- **結案 (Resolve)**：在 `## Answer` 標題下追加解答，將狀態設為 `Status: resolved`，並在 `map.md` 的 Decisions-so-far 區塊追加上下文指標（重點摘要與連結）。
