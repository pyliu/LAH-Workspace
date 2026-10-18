### 工作階段接手 (Session pickup)

**你負責確立接手起點（Resume point）。請詳讀先前的執行軌跡，切勿把已經做過的事重做一遍。**

1. **定位先前的執行軌跡（Prior trail）。** 來源可能是當前工作區下的本機對話紀錄 `<appDataDir>\brain\<conversation-id>\.system_generated\logs\transcript.jsonl`（若欄位有 `truncated_fields` 則讀取 `transcript_full.jsonl`；請勿跨無關專案目錄進行全域搜尋，以免跨越工作區邊界讀取到其他私人專案對話）、交接筆記，或是已推送的分支。請先讀取中繼資料概覽與最後幾則訊息，再往回掃描關鍵決策點。若對話紀錄過長，請透過 `invoke_subagent` 委派子代理解析，僅將濃縮後的時間軸保留在主對話緒中（遵循 **principle-guard-the-context-window** 技能）。請依據「Subagents」章節為子代理挑選合適的模型與推理層級。
2. **重建作業狀態（Operational state）。** 確認 `LAH-Workspace` 下相關獨立 Git 子專案（`LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger`）的當前分支與工作樹（Worktree）、已經落地的變更（對照基底分支執行 `git log`、`git diff` 與 `git status`）、未完成的待辦事項（Open todos），以及已做出的決策。先前的軌跡就是具權威性的輸入依據，請克制「想要從頭自己推導一遍」的偏見。
3. **比對「已完成」與「待處理」的差異。** 對照已交付的成果與原定計畫，明確點出接手起點（Resume point），切勿重新執行先前的重現步驟（Repro）或重做已完成的工作。任何「讓我從頭驗證一遍」的舉動，都代表你把具權威性的軌跡當成了不可信的資訊。
4. **將剩餘工作路由至對應的劇本（Playbook）並選定行動判定：** 繼續執行未完任務、交付已完成的建議方案、追認或推翻先前的結論，或是對失敗的執行進行事後檢討（Postmortem）。接手劇本（Session pickup）到此結束，後續工作由路由過去的目標劇本全面接管。
5. **在真實產物上，對照原始目標驗證所繼承的主張（遵循 `principle-prove-it-works` 技能）。** 前一個代理口頭宣稱通過的自我報告（Self-report）不能直接當作最終證明（驗證時請確保 `./LAH-API/www/.env` 處於 `MOCK=true`）。

**回覆要求（Reply）：** 前一個代理停在哪裡、你繼承了哪些成果 vs 重新做了哪些事（理想情況下重做的部分應為零）、確切的接手起點，以及執行結果。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
