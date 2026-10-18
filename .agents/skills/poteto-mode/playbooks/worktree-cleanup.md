### 工作樹與模擬器清理 (Worktree and simulator cleanup)

1. **快照記錄與盤點稽核。** 先記錄磁碟可用空間（如 `df -h /` 或檢查磁碟剩餘空間），接著針對目標獨立 Git 儲存庫（`LAH-Workspace` 下的 `LAH-API`、`LAH-FE`、`lah-messenger-server` 或 `lah-messenger`）執行 `scripts/worktree-audit.sh [-b <pr-base-ref>] [repo-path]`（遵循 `principle-build-the-lever` 技能）。若未指定 `-b`，腳本預設會對照 `origin/HEAD` 檢查 `MERGED` 狀態；因此當 PR 指向其他基底分支時，請傳入 `-b origin/<branch>`。該腳本會直接從 `git worktree list` 讀取路徑，絕不依賴手動輸入，因為手動輸入 `myrepo-worktrees/x` 常會漏掉位於其他路徑的工作樹（遵循 `principle-encode-lessons-in-structure` 技能）。腳本會根據大小、存在時間、合併狀態、未提交變更、PR 狀態，以及最後觸碰該工作樹的對話紀錄，對每個工作樹進行分類並建議處置分桶（Bucket）。由於掃描對話紀錄較耗時，請將其置於背景執行。
2. **分桶結果僅供參考，並非刪除授權。** 使用者釘選（Pinned）與進行中的對話才是真正的權威依據（遵循 `principle-prove-it-works` 技能）。請向使用者確認或從側邊欄取得活躍對話清單，並交叉比對每一個候選工作樹。自動化工具曾將使用者釘選中的工作樹標記為 `safe`，因此一律以「釘選與活躍清單」為準。
3. **刪除前先驗證實際使用狀態。** 針對每一列標記為 `verify-recent-chat` 的項目，或任何你有疑慮的工作樹，請透過 `invoke_subagent` 扇出子代理去讀取對話紀錄（如 `<appDataDir>\brain\<conversation-id>\.system_generated\logs\transcript.jsonl`），回報該對話是否仍在進行中，以及它觸碰了哪些工作樹（遵循 `principle-guard-the-context-window` 技能，因為對話紀錄體積龐大）。一個釘選的對話可能會透過背景子代理在平行的工作樹中建立競技場（Arena）或重現（Repro）目錄，即使這些工作樹的名稱沒有出現在側邊欄上，它們依然處於使用中狀態。請依據「Subagents」章節為子代理挑選合適的模型與推理層級。
4. **遇到不可逆的資料遺失風險時必須暫停。** `wip:N` 代表有 N 個已追蹤但尚未提交的編輯。由於移除乾淨的工作樹仍可從其分支還原，但未提交的工作一旦刪除就徹底消失，因此必須先展示 Diff 並透過 `ask_question` 或向使用者取得明確裁決（這也是 `AGENTS.md` 的核心紅線：既有使用者修改不得未經確認而覆蓋、還原或刪除）。`scratch:N` 代表未追蹤的暫存檔，雖然可安全丟棄，但仍須列出檔案名稱。依據自主權原則（Autonomy），「乾淨、已合併且未使用中」的工作樹可直接清理；「含有 `wip` 或使用中」的工作樹則必須暫停詢問。
5. **清理已確認的集合。** 針對每個確認可移除的路徑，執行 `git worktree remove --force <path>`。若該目錄因包含被忽略的建置產物（Ignored build artifacts）而殘留，請將該殘留工作樹目錄移除後執行 `git worktree prune`。分支參照（Branch refs）會保留下來，因此不會遺失任何已提交的 Commit。完成後再次檢查磁碟空間並重新列出工作樹確認。
6. **模擬器與其他空間回收項目。** 若在支援的環境下，模擬器通常是下一個最大的空間回收來源：例如 `xcrun simctl --set testing delete all`（XCTestDevices 分身）、`xcrun simctl delete unavailable`，以及 `xcrun simctl runtime list` 後透過 `runtime delete <id>` 移除舊版執行環境。必要時可進一步檢查建置快取與套件管理快取（pnpm、uv、brew、yarn、npm），但僅能清除使用者未要求保留且不影響當前開發資料庫（如 SQLite `.db` 檔案）的快取。

這是唯一一個會在沒有程式碼審查（Code review）把關下直接刪除本機狀態的劇本，因此上述每一道確認關卡就是你的審查防線。

**回覆要求（Reply）：** 清理前後的磁碟空間對比與成功回收的空間大小、已清理的工作樹清單，以及每一個保留下來的工作樹之單行原因（例如：正由哪個對話使用中，或含有未提交的 `wip` 變更）。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
