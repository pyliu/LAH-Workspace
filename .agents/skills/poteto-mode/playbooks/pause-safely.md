### 安全暫停 (Pause safely)

**你負責乾淨俐落地停下工作。請留下一個讓冷啟動（Cold-start）代理能夠直接接手的檢查點（Checkpoint）。** 本劇本僅在使用者明確指示暫停時觸發。若使用者表示「繼續做（keep going）」、「我要去睡了，繼續跑（going to bed, keep going）」或「不要停（don't stop）」，請勿暫停。

1. **在安全邊界停下。** 完成當前的最小原子步驟（Atomic step），或將其乾淨地退回。不要開啟任何新工作，並透過 `manage_subagents`（`Action: "kill"` 或 `"kill_all"`）及 `manage_task`（`Action: "kill"`）取消任何執行中的巢狀子代理與背景排程任務。
2. **暫停時絕不採取不可逆操作。** 除非先前已經發起，否則不要新建 PR，也不要執行 `git push`。同時確保不破壞 `LAH-Workspace` 各子專案既有設定（例如 `./LAH-API/www/.env` 的 `MOCK=true` 與使用者既有未提交修改）。
3. **讓工作成果持久化。** 在所屬獨立 Git 子專案（`LAH-API`、`LAH-FE`、`lah-messenger-server` 或 `lah-messenger`）的當前分支上，將你尚未提交的編輯打包為單一清晰的 `wip:` 提交（Commit），確保不會遺失任何進度（請注意勿未經確認混入或覆蓋使用者既有的其他修改）。若當前工作樹處於損壞（Broken）狀態，請在 Commit 訊息內文中用一行文字明確註明。
4. **在對話上下文之外撰寫交接續行筆記（Resume note）。** 記錄目標意圖、你原本正在進行的工作、目前進度與已驗證項目、當前狀態、下一步驟、關鍵檔案路徑，以及已知陷阱（Gotchas）。若是為了應對上下文壓縮（Compaction）觸發，請將筆記寫入如 `<appDataDir>\brain\<conversation-id>/scratch/<slug>-resume.md` 的檔案中。若已存在 `show-me-your-work` 的決策軌跡檔，請直接指向該檔案，無須重複抄寫。

**回覆要求（Reply）：** 說明你目前處於工作迴圈的哪個位置、哪些內容已寫入磁碟而哪些仍留在腦中（列出檔案路徑，不要傾印大段 Diff）、你所建立的 Commit 以及各子專案工作樹是否乾淨，還有恢復執行時的第一個動作。請記住這是暫停交接，而非最終結案報告。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
