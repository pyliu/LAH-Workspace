### 功能開發（Feature）

**你對整體設計負有全責。負責規劃、審查與驗證。** 將實作委派給子代理（透過 `invoke_subagent`），你自己則坐鎮主導。

> **強制語言規範**：所有回覆、分析報告、待辦清單（Todo list）、吞吐量檢查點（Throughput checkpoint）、決策紀錄、PR 描述與 Commit 訊息，**一律強制使用台灣繁體中文輸出**。在 LAH-Workspace 開發時，必須嚴格遵守 `AGENTS.md` 跨專案介面契約與安全護欄（維持 `LAH-API` 的 `MOCK=true`、嚴禁破壞性 Oracle SQL、遵守註解完整性原則）。

1. 針對受影響的子系統執行 **how**（`../how/SKILL.md`）技能。若涉及兩個以上子專案（如 `LAH-API` ↔ `LAH-FE` / `lah-messenger` / `lah-messenger-server`），必須先識別受影響的 HTTP API、WebSocket 或 SQLite 介面契約。
2. 執行 **architect**（`../architect/SKILL.md`）技能進行平行的設計探索。
3. 將「吞吐量檢查點（Throughput checkpoint）」寫成四個待辦事項（Todo items）。若某個維度確實不適用（例如僅修改單一檔案、無須平行扇出），仍須保留該項目並標註 `不適用：<原因>`（`n/a: <reason>`），不得直接刪除：
   - **具阻塞性的前置步驟（Blocking first steps）：** 在平行扇出之前必須先完成的檢查關卡與基底型別。
   - **獨立的工作流（Independent workstreams）：** 互不重疊的檔案、服務或子專案可平行推進；涉及共享寫入的部分則序列執行。
   - **共享的可變狀態（Shared mutable state）：** 預設先拆分目標（遵循 **separate-before-serializing-shared-state**，`../principle-separate-before-serializing-shared-state/SKILL.md` 原則技能）。唯有面對真實的不變量（Invariants）時才進行序列化。
   - **最小且安全的拆解粒度（Smallest safe decomposition）：** 若由單一工作代理（Single worker）執行最為合適，請明確說明原因。
4. 透過 `invoke_subagent` 將程式碼撰寫委派給子代理（使用配置的 `feature, refactoring` 模型或預設 `Model: "inherit"`），並給予明確具體的範疇：檔案路徑、依據 **principle-model-the-domain**（`../principle-model-the-domain/SKILL.md`）定義的資料結構與組織方式（優先使用狀態機而非散落的布林值、使用查表／註冊表而非深層條件分支、使用強型別模型而非重複假設資料結構——這些都必須在子代理動手寫業務邏輯前先選定），以及明確的成功標準。請依據 `SKILL.md` 的「子代理調度（Subagents）」章節為每個子代理選擇合適的模型層級。當實作方式存在多種合理的結構選擇（錯誤處理機制、抽象層設計、測試結構）時，請改透過 **arena**（`../arena/SKILL.md`）技能進行委派，讓多個競爭子代理展現不同方案，並由交叉評審把關最終選擇。這是強制規定：不允許以「略過並附理由」逃避，且「惰性法則（Laziness Protocol）」不得凌駕於此規則之上（因為其核心收益是「審查分離」，而非省下幾行程式碼）。若當前執行緒本身已是受禁止再次孵化的子代理，則透過親自負起 Diff 責任並維持同等審查分離標準來滿足此要求。絕不發出「待命中（standing by）」這類空等巢狀子代理的回覆。註解須遵循 `SKILL.md` 的 **註解規範（Comments）** 與 `AGENTS.md`（保留既有無關註解，新增程式碼僅寫必要的 Why）。進行外科手術般的精準修改；針對衍生自上游的檔案，務必對照上游原始碼重新確認。若改良了共用基礎元件（如 `lah-messenger-*.vue` 與桌面端共用邏輯），請同步移植到所有呼叫端並逐一驗證。養成頻繁提交（Commit liberally）的習慣。
5. 在對應的真實介面上進行驗證（並執行子專案適用的語法與 Lint 檢查，如 `php -l`、`node -c`、`yarn lint`）。「結果不明確（Inconclusive）」或在錯誤介面上測試都不算通過，必須明確標記。
6. 透過 Rebase 整理成小而有序的 Commits，並將後續項目依序堆疊。
   請運用 **sequence-verifiable-units**（`../principle-sequence-verifiable-units/SKILL.md`）原則技能，每建構、驗證並提交完一個小單元後，再推進下一個單元。
7. 若設計具有爭議或涉及重大架構權衡，在交付前先執行 **interrogate**（`../interrogate/SKILL.md`）技能。
8. 執行 **開立 PR（Opening a PR）**（`playbooks/opening-a-pr.md`）。

程式碼高度耦合的工作（單一功能、單一遷移）應交由單一負責人子代理，並將吞吐量檢查點內嵌給它；該負責人在完成阻塞性的前置階段後，再於內部自行扇出。主對話層級（Parent-level）的平行扇出則保留給能產出獨立交付物的切片（如稽核、跨子系統調查、競爭性實驗）。在階段邊界處重新改寫吞吐量檢查點。進入新一輪時請孵化全新的負責人子代理，而非透過中斷訊號連鎖喚醒舊代理。

**回覆（Reply，強制使用台灣繁體中文）：** 你建構了什麼、你做了哪些選擇及其原因、吞吐量檢查點內容、待決議事項。請使用 Markdown 表格呈現設計替代方案的比較（若涉及跨專案修改，並依 `AGENTS.md` 10.2 節附上跨專案變更摘要表）。
