### 指標爬山最佳化（Hillclimb）

**你對指標定義與實驗完整性負有全責。負責監督與審查，並將每次嘗試委派給子代理（`invoke_subagent`）。** 本劇本適用於針對單一可量測目標進行持續、科學化的迭代改善。若只是單次修復，請使用 Bug fix（`playbooks/bug-fix.md`）或 Perf issue（`playbooks/perf-issue.md`）。本劇本則是持續循環。

> **強制語言規範**：所有回覆、分析報告、待辦清單（Todo list）、決策日誌（`decision.tsv` 說明）、PR 描述與 Commit 訊息，**一律強制使用台灣繁體中文輸出**。

核心紀律：一次只改動一處、量測一次、決定保留或還原（Keep or revert）。絕不堆疊未經測試的變更，也絕不單憑肉眼檢視程式碼就宣稱獲得改善（遵循 **prove-it-works**，`../principle-prove-it-works/SKILL.md` 原則技能）。

1. 在選定指標之前，先摸清真實工作負載與系統架構。針對目標執行 **how**（`../how/SKILL.md`）技能，點出足以影響結果的真實工作負載維度（資料量大小、歷史紀錄長度、狀態複雜度、並行度），並選出一個能重現使用者抱怨的測試案例。如果沒有任何案例能重現問題，請先修復重現步驟，而非盲目開始爬山。接著鎖定單一指標、定義何種變化方向代表「更好」，並設定一個可程式化檢驗的停止斷言（Stop predicate）——該斷言必須同時結合「目標數值」與「最少嘗試次數下限」，以防止因為早期運氣好撞上一次改善就草草結束（例如：「相較基準線提升至少 50%，且至少執行 10 輪迭代」）。若使用者已給出具體數字則直接採用，否則先與使用者達成共識。
2. 打造自動化量測框架（Measurement harness），證明其靈敏度，接著將其凍結（遵循 **build-the-lever**，`../principle-build-the-lever/SKILL.md` 原則技能）。執行具對比性的真實工作負載，確認目標案例能重現症狀，且較簡單的案例能如預期拉開差距。若量測框架無法區分兩者，請修正工作負載或指標。在凍結框架之前，務必使用 **benchmark-checklist**（`../benchmark-checklist/SKILL.md`）技能檢驗該框架，並讓它同時印出錯誤計數（Error count）與實際完成的工作量計數（Work done count）。一旦凍結後，必須能透過單一可重複執行的指令輸出指標，且取樣次數須足以消除雜訊（取 N 次執行的中位數，而非單次執行結果）。在進行任何修改前，先記錄基準線（Baseline）指標，以及防退步測試關卡（Regression gate，即必須持續通過的測試集）的綠燈結果。
3. 透過 **show-me-your-work**（`../show-me-your-work/SKILL.md`）技能開啟決策日誌。建立一份 `decision.tsv`（存放於 `<appDataDir>\brain\<conversation-id>\` 或被 `.gitignore` 忽略的位置，切勿提交進專案版控樹中），每次嘗試記錄一列：編號（id）、假設（hypothesis）、修改內容（change）、修改前數值（before）、修改後數值（after）、變化量（delta）、測試結果（tests）、裁決（verdict：保留 kept 或還原 reverted）、備註（note）。在每次展開新嘗試前先讀取這份日誌。
4. 將每個假設建立在步驟 1 的架構模型之上，確保它明確指出具體的作用機制（例如：「將 X 移出啟動路徑延後執行，因為它阻塞了首次畫面繪製」），而非含糊的「試著加個快取看看」。若為效能指標，請借用 Perf issue 劇本（`playbooks/perf-issue.md`）步驟 2 的效能法則順序來排列假設（僅借用其排序邏輯，不借用該步驟的停止規則）。
5. 進入迭代迴圈，每一輪迭代僅驗證一個假設：
   - 透過 `invoke_subagent` 將修改任務交給子代理（使用配置的 `hillclimb` 模型或預設 `Model: "inherit"`），並嚴格限縮修改範圍。請依據 `SKILL.md` 的「子代理調度（Subagents）」章節選擇模型層級。你負責監督並審查 Diff，而非親自敲鍵盤寫碼（遵循 **guard-the-context-window**，`../principle-guard-the-context-window/SKILL.md` 原則技能）。當有多個彼此獨立的假設同時存在時，可將它們平行扇出給多個子代理，並讓每個子代理在各自獨立的 Worktree（如 `Workspace: "share"` 或 `"branch"`）中運作（遵循 **separate-before-serializing-shared-state**，`../principle-separate-before-serializing-shared-state/SKILL.md` 原則技能）。
   - 使用已凍結的量測框架進行修改前與修改後的量測，並執行防退步測試關卡（Regression gate）。
   - **唯有當指標改善幅度顯著超越雜訊範圍，且防退步測試維持綠燈時，才予以採納（Accept）。** 否則必須將該次修改完整還原（Revert in full）。任何「說不定有幫助」的微調一律不准保留。
   - 每一個被採納的改善都獨立提交為一個 Commit，且僅暫存你實際修改的檔案（使用 `git add <files>`，嚴禁使用 `-A`）。無論最終是保留還是還原，都必須在 `decision.tsv` 中記錄該列結果。
   每一輪迭代都必須在完成檢查後才能啟動下一輪（遵循 **sequence-verifiable-units**，`../principle-sequence-verifiable-units/SKILL.md` 原則技能）。若此過程為無人值守執行，請僅向 Autonomous run 劇本（`playbooks/autonomous-run.md`）借用其 `schedule` 喚醒機制，而不借用其停止規則。
6. 突破第一個停滯期（Plateau）。當遇到連續數次嘗試皆被退回的停滯狀態時，請在斷言「已經爬到山頂」之前，先試著轉換優化類別、組合先前的接近成功方案（Near-misses）、重新細讀原始碼，或嘗試更具突破性的做法。正確性與簡潔度永遠高於單純的數字：若某個改善破壞了既有行為，必須將其還原；若某個簡化重構能在維持指標不退步的前提下減少程式碼複雜度，則應予以保留（遵循 **laziness-protocol**，`../principle-laziness-protocol/SKILL.md` 原則技能）。
7. 當停止斷言（Predicate）達成，或剩餘點子的邊際效益過低、不值得付出維護成本時才停止。切勿為了湊數達標而擅自放寬停止斷言，也不要在還有低成本未嘗試假設時就提早放棄。若確實陷入瓶頸，請誠實向使用者回報，而非在原地空轉。
8. 將所有被採納的 Commits 依照達成順序堆疊好，執行 **開立 PR（Opening a PR）**（`playbooks/opening-a-pr.md`）。

**回覆（Reply，強制使用台灣繁體中文）：** 目標指標與設定門檻、從基準線到最終結果的數值與百分比變化量（Percent delta）、總迭代次數（保留次數 vs 還原次數）、以單行逐一列出每項被採納的改善、決策日誌 `decision.tsv` 的檔案路徑，以及若要繼續推進下一步你最推薦嘗試的最佳點子。
