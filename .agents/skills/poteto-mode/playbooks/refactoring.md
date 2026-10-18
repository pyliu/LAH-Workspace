### 程式碼重構 (Refactoring)

**你負責守護行為契約（Contract）。結構改變，但外在行為絕不改變。** 這與新增行為的 **Feature**（`playbooks/feature.md`）以及修正錯誤行為的 **Bug fix**（`playbooks/bug-fix.md`）截然不同。

若在清理過程中發現缺失的功能或真實的 Bug，請將其拆分出來，先針對鎖定的行為契約交付結構性變更。允許進行重新設計（Redesign），但必須明確命名並路由至 **Feature**。大型或跨領域的結構重整屬於 **figure-it-out** 技能的範疇；本劇本專注於局部至中型的重構變更。

1. **首先釘住（Pin）行為契約。** 對受影響的子系統執行 **how** 技能以摸清契約（若涉及跨專案介面，必須依 `AGENTS.md` 同步檢查 `LAH-API`、`LAH-FE`、`lah-messenger-server` 與 `lah-messenger` 的呼叫端與被呼叫端），接著在移動任何結構之前，撰寫特性測試（Characterization test）、快照或等價性測試框架（Equivalence harness）以捕捉當前行為。若該區域原本沒有測試覆蓋，請在觸碰結構前先寫好鎖定測試。型別檢查与 Lint（如 `php -l`、`node -c`、`yarn lint`）本身並不是行為鎖定（Pin）。測試期間確保 `./LAH-API/www/.env` 維持 `MOCK=true`。
2. **依據 `principle-model-the-domain` 指出目前程式碼缺失的結構。** 若既有結構已經清晰且局部化，請保留平實無奇的程式碼。重塑結構必須能消除多餘分支或無效狀態，而非增加間接層（Indirection）。同時務必遵守 `AGENTS.md` 規範：保留所有與本次變更無關的既有註解與文件字串（Docstrings）。
3. **定義目標結構形狀（Target shape）。** 說明如果今天從頭打造，模組配置、型別與呼叫圖（Call graph）應該長什麼樣子（遵循 **principle-foundational-thinking**、**principle-redesign-from-first-principles**）。若目標結構跨越函式或模組邊界，在動手搬移前先執行 **architect** 技能進行平行的結構設計探索。
4. **先減後加（Subtract before you add）。** 在引入新結構之前，先刪除死碼（Dead code）、摺疊僅有單一呼叫者的包裝函式（One-caller wrappers）、移除冗餘的驗證器，並清除孤立參照（遵循 **principle-subtract-before-you-add**）。以能達成目標結構的最小變更交付（遵循 **principle-laziness-protocol**）。任何出於「也許有幫助」的推測性清理一律退回（Revert）。
5. **以保持行為不變的小步伐推進，每一步都維持鎖定測試（Pin）綠燈。** 進行內部 API 重塑時，在同一波變更中遷移所有呼叫端並刪除舊 API（遵循 **principle-migrate-callers-then-delete-legacy-apis**；但注意：除非使用者明確要求，否則不得任意破壞 `AGENTS.md` 所定義的跨專案公開 HTTP API、WebSocket 事件或 SQLite Schema 契約）。不留相容性墊片（Compatibility shims），不留新舊並行的雙軌路徑。針對每一次重新命名，對照實際檔案進行抽查——重新命名常在字串、文件說明與反向參照中無聲漏網。可透過 `invoke_subagent` 將機械式的編輯工作委派給子代理，並賦予明確的範圍（檔案路徑、搬移的符號名稱、必須維持的行為）。請依據「Subagents」章節為子代理挑選合適的模型與推理層級。
6. **在真實產物上證明行為未改變，而非僅憑「編譯通過」（遵循 `principle-prove-it-works`）。** 針對較大規模的重塑，執行等價性檢查：撰寫腳本比對新舊輸出 Diff、將錄製好的基準資料重播至新程式碼，或透過對應的控制技能在目標表層執行冒煙測試（Smoke run）。
7. **確認這項變更值得保留。** 衡量成功的標準是降低閱讀者的認知負擔（遵循 **principle-minimize-reader-load**）。如果這份 Diff 沒有在任何地方減輕閱讀負擔，請將它退回（Revert）。
8. **在所屬的獨立 Git 子專案中整理為小而有序的提交（Commits）。** 先是一個減法提交（Subtraction commit），接著是結構重塑（Reshape），最後是任何後續清理。使用 **sequence-verifiable-units** 原則技能塑造提交序列，確保每個保持行為不變的切片（Slice）在進入下一步前皆維持綠燈。最後執行 **Opening a PR**（`playbooks/opening-a-pr.md`）。

**回覆要求（Reply）：** 改變了哪些結構、用來鎖定行為的測試依據（Pin）、等價性證明（Equivalence proof）、閱讀負擔的變化（Reader-load delta）、最終交付了什麼以及退回了什麼。確認無任何新增或改變的外在行為。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
