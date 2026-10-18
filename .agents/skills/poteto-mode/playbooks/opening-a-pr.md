### 開立 PR 與提交變更（Opening a PR）

在所有其他劇本結束時呼叫。

> **強制語言與 LAH-Workspace 版控規範（整合 `AGENTS.md` 4.1–4.3）**：
> 1. **獨立 Git 儲存庫確認**：工作區根目錄與四個子專案（`./LAH-API/`、`./LAH-FE/`、`./lah-messenger-server/`、`./lah-messenger/`）各自為獨立的 Git 儲存庫。執行任何 Git 或 PR 指令前，必須先確認位於正確的儲存庫目錄（設定 `run_command` 的 `Cwd`），嚴禁將不同儲存庫的變更混為單一 Git 儲存庫操作。
> 2. **全面強制台灣繁體中文**：所有 Git Commit 訊息（標題與內文）、PR 標題、PR 描述與跨專案變更摘要，**一律強制使用台灣繁體中文**撰寫。
> 3. **先提交再推送**：嚴格依循「檢查狀態（`git status` / `git diff`）→ 執行各專案語法與 Lint 檢查（如 `php -l`、`node -c`、`yarn lint`）→ 暫存變更（`git add <files>`）→ 撰寫詳細繁體中文資訊並提交（`git commit`）→ 推送至遠端（`git push`）」。

**工作樹與隔離（Worktree）：** 從主幹（`main` / `master`）切出 Git worktree 或分支進行工作。透過 `invoke_subagent` 孵化的子代理會繼承或隔離該工作區（可使用 `Workspace: "branch"` 或 `"share"`）。針對同一分支的多個平行子代理任務，應各自擁有獨立的 Worktree，或在兩者之間執行 `git fetch && git reset --hard origin/<branch>`。若當前分支帶有與本次任務無關的髒變更（Dirty branch）：請先確認是否為使用者既有修改（依 `AGENTS.md` 第 8 節，未經確認嚴禁覆蓋或刪除使用者既有修改），必要時將本次修改拆至全新 Worktree 套用。

**提交規範（Commits，整合 `AGENTS.md` 4.3）：** 養成頻繁提交的習慣，並在開立 PR 前透過 Rebase 整理為小而有序的 Commits。每一個 Commit 都應是可獨立成立、依序訴說完整演進脈絡的單元。若小修補屬於剛建立的 Commit 則使用 `--amend`；若邏輯可分離則建立新 Commit。
- **Commit 標題行（Summary）**：採用 Conventional Commits 格式 `type(scope): 繁體中文簡明摘要`，結尾不加句號。`type` 如 `feat`、`fix`、`docs`、`refactor`、`test`、`chore` 或 `perf`；`scope` 為模組或功能範圍。
- **Commit 詳細說明（Body）**：空一行後，必須以**台灣繁體中文**詳列具體修改資訊（不重複標題句），包含：
  - **修改目的**：說明問題背景與修改動機。
  - **修改項目**：詳列具體修改的檔案與符號清單。
  - **相容性說明**：說明跨專案介面（HTTP API / WebSocket / SQLite / Legacy HTML）相容性與影響範圍。

**PR 前置清理與寫作風格（PRs）：** 在提交 Commit 前對 Diff 執行去贅字與清理檢查（`/deslop` 概念，移除殘留調試碼），並在提交審查前執行 `/no-comments`（保留所有與本次修改無關的既有註解與 Docstring，僅移除本次新增程式碼中無意義的階段敘事註解）。使用 `/technical-writing`（`../technical-writing/SKILL.md`）與 `/unslop`（`../unslop/SKILL.md`）的精煉原則撰寫每一個 PR 標題、描述與 Commit 內文。

**PR 標題（Titles）：** 採用 Conventional Commits 格式 `type(scope): 繁體中文主旨`，結尾不加句號。主旨須簡短、採用祈使語氣，並在有具體核心符號承載變更時直接點出該符號名稱（例如 `fix(lah-fe): 修正 lah-login 逾時自動重新整理計時器邏輯`）。

**PR 描述（Descriptions）：** PR 內文是寫給手邊已經有 Diff 的審查者看的「一分鐘簡報」，而非冗長的實驗室筆記。它必須以**台灣繁體中文**清楚交代：為什麼需要這項變更、刻意排除了什麼、可能影響什麼範圍，以及你如何實證它能正常運作。使用簡短清晰的句子，避免堆砌長篇大論的文字牆。由於 PR 內文在 Squash merge 時會成為最終的 Commit 內文，請將總長度控制在 40 行以內。請依序使用以下 `##` 二級標題（不要用粗體開頭取代標題），若某個區塊確實沒有內容可寫則直接省略該區塊：

- `## Why`（修改目的與背景）：以 1 到 3 句簡短繁體中文說明問題與解決做法。不要塞入 Commit SHA、Rebase 族譜或「基於 main 分支」這類廢話前言。
- `## What changed`（具體修改項目）：1 到 3 個簡短項目符號。唯有在特定符號或檔案路徑承載核心變更時才點出名稱；若為重新命名或變更目標，請同時列出修改前後的名稱。
- `## Scope`（涵蓋範圍與排除項目）：必填。以 1 到 3 個簡短項目說明本次涵蓋的範圍，以及刻意留待後續處理的項目（Follow-up 或已知缺口）。不要在此處逐檔背誦流水帳。
- `## Tradeoffs`（設計權衡）：僅列出審查者可能會追問的「已淘汰替代方案」及其取捨原因。若無實質抉擇則略過。
- `## Blast Radius`（影響範圍與跨專案相容性）：以 1 到 2 句話說明此變更觸及哪些使用者、模組或跨專案介面（`LAH-API` / `LAH-FE` / `lah-messenger-server` / `lah-messenger`），以及為何它是安全的或需要注意哪些風險。若主幹目前是紅燈，請說明維持紅燈的代價。
- `## Verification`（驗證結果）：1 到 3 個項目符號，每項列出實際執行的驗證路徑與結果（如 `php -l`、`node -c`、`yarn lint`、端到端實測結果）。若涉及效能：列出單一核心指標及其單位、`修改前 → 修改後` 的數值，並附上指向 Arena 或 Swarm 驗證紀錄的連結，不要在內文中塞入取樣方法論或龐大的指標表格。

在這些章節之後，若螢幕截圖或操作影片能證明你的宣稱，請直接附上。完整的 Commit SHAs、Swarm 或 Arena 分道流水帳、槓桿工具修正過程、逐檔核對清單以及「CLEAN」裁決細節，請放進連結的產物（Artifact）中，不要塞進 PR 內文。

**程式碼託管平台工具（Forge）：** 在執行第一個 PR 操作前先解析託管平台工具，並在後續的建立、編輯、檢視、監看與合併操作中全程保持一致。預設使用 GitHub CLI（`gh`）。若 `command -v origin` 成功且 Origin 能解析該儲存庫，則優先使用 `origin pr ...`；若無 Origin 或無法解析，則維持使用 `gh` 並記錄降級原因。切勿強制要求 Graphite（`gt`）。

**內建 PR 工具（Built-in PR tool）：** 當執行環境提供內建的 PR 工具時，請透過該內建工具執行建立、編輯、變更基底分支（Retarget）與標記就緒（Mark ready），而非直接呼叫 CLI（因為 CLI 建立的 PR 可能會漏掉內建工具追蹤的中繼資料）。內建工具未涵蓋的操作，或環境無內建工具時，則使用已解析的 Forge CLI。

**規模與堆疊（Size and stacks）：** 寧可拆成五個聚焦的小 PR，也不要塞成一個龐大的巨型 PR。PR 堆疊是一條基底分支鏈（Base-branch chain）：根部 PR 指向主幹（Trunk）；每個子分支都 Rebase 到其父分支的確切頂端提交（Tip），且其 PR 的基底分支指向父分支。當父 PR 合併後，依據 `playbooks/shipping.md` 步驟 4 將子 PR 重新指向主幹。在不使用內建 PR 工具時，依已解析的 Forge 使用 `origin pr create --status open --base <parent-branch>` 或 `gh pr create --base <parent-branch>` 建立子 PR，並使用 `origin pr edit <pr> --base <parent-branch>` 或 `gh pr edit <pr> --base <parent-branch>` 變更基底分支。唯有彼此獨立的工作才直接從主幹切出分支。在進行大規模堆疊工作前，請先 Rebase 到最新主幹。

**就緒狀態（Readiness）：** 開立的每一個 PR 都必須是「就緒可審查（Ready）」狀態，絕不開立為草稿（Draft）。若內建 PR 工具預設為草稿，請在每次建立呼叫時明確設定 `draft: false`。使用 Origin 時傳入 `--status open`；使用 `gh` 時省略 `--draft`。若 PR 建立後仍處於草稿狀態，請立即透過 PR 工具或執行 `origin pr ready <number>` / `gh pr ready <number>` 將其標記為就緒。在引用任何 PR 狀態前，務必先執行 `origin pr view <number>` 或 `gh pr view <number>` 確認最新實況。

**關於 Babysit 的觸發界線：** 開立 PR 的動作本身**絕不會**自動啟動 Babysit。請貼出 PR 網址並繼續建構後續項目，先把整個階段或整疊 PR 完成。唯有在整疊 PR 建構完成、且使用者明確要求時，才啟動獨立的 Babysit 流程（因為每開一個新 PR 就跑一次 Babysit 會卡住建構進度，並把檢查資源浪費在稍後就會被下一波修改重啟的提交上）。當審查回饋偏離原始設計意圖時，請有理有據地提出反駁。

負責開立 PR 的子代理在完成 `interrogate`、`/deslop` 與 `/no-comments` 並貼出 PR 網址後，應直接透過 `send_message` 向父代理回報並結束任務，不進行 Babysit——**唯一的例外**是擔任 Autopilot-full 或 Autopilot-stack 的 PR 負責人（Owner）。因為這類負責人的任務簡報中已明確指派了 Babysit 迴圈（這本身就構成了 `playbooks/babysit.md` 所等待的啟動授權），它會在發送 code-ready 報告後立即啟動 Babysit 迴圈，並依其劇本回報 `merge-ready` 或 `STACK-READY`，不受此處與 `playbooks/babysit.md`「必須等整疊 PR 建構完才啟動 Babysit」之規則限制。
