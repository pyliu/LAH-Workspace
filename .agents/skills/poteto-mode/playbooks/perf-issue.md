### 效能問題調校 (Perf issue)

**你負責完整的量測實證。規劃、審查、並驗證每一組數據。** 將每一個修復方案與實際量測數據綁定，切勿僅靠閱讀原始碼臆測而略過量測。

1. **擷取基準追蹤紀錄（Baseline trace）。** 透過對應的控制技能或工具（如 `chrome-devtools`、`debug-optimize-lcp`、`memory-leak-debugging` 或命令列剖析工具）擷取基準數據，並使用 **benchmark-checklist** 技能嚴格檢驗基準值與後續的每一組數據。在 `LAH-Workspace` 環境測試時，請確保 `./LAH-API/www/.env` 維持 `MOCK=true`，避免對外部 Oracle 9i 資料庫造成連線負載或逾時干擾。
2. **執行 `how` 技能以確立假設基礎。** 在實際執行驗證前，切勿妄稱已達效能天花板。
   請依序嘗試以下效能心法（由成本最低者開始）：
   1. **不做它（Don't do it）。** 直接停止沒有任何地方使用其結果的工作，而非設法讓它變便宜。
   2. **做一次就好，不要重複做（Do it, but don't do it again）。**（快取、記憶化）
   3. **少做一點（Do it less）。**（減少頻率、縮小資料集、分頁或節流）
   4. **晚一點再做（Do it later）。**（延遲載入、惰性求值）
   5. **在沒人注意時做（Do it when they're not looking）。**（預先計算、背景排程）
   6. **並行處理（Do it concurrently）。**
   7. **用更低成本的方式做（Do it cheaper）。**

   一旦排在前面的心法已達成目標指標，即刻停止，無須過度優化。
3. **根據追蹤紀錄規劃修復方案。** 若修改跨越函式或模組邊界（特別是涉及 `LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger` 跨專案介面契約或 SQLite 讀寫時），請先執行 `architect` 技能。接著透過 `invoke_subagent` 將實作委派給子代理，並依據「Subagents」章節為該工作挑選合適的模型與推理層級。修改程式碼時請遵守 `AGENTS.md` 最小必要變更原則，並保留與變更無關的既有註解與文件。完成後審查 Diff，並擷取修復後的追蹤紀錄（Post-fix trace）。
   請套用 **sequence-verifiable-units** 原則技能，在嘗試下一個修改前，先驗證當前修改的效果。
4. **解析並比對產物（例如將 JSON 匯入 SQLite 後進行 Diff 比對）。** 「結果不明確（Inconclusive）」或「量測錯表面（Wrong-surface）」皆不算通過，必須明確標示出來。
5. **在 PR 中引用實際量測數據。**
6. **執行 **Opening a PR**（`playbooks/opening-a-pr.md`）。**

若目標是針對某項指標進行持續性的漸進優化，而非單次效能修復，請改用 Hillclimb 劇本（`playbooks/hillclimb.md`）。

**回覆要求（Reply）：** 基準數據（Baseline number）、修復後數據（Post-fix number）、變化量（Delta）、以及量測產物檔案路徑（Artifact path）。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
