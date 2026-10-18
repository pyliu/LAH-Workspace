# LAH 工作區工程技能庫（pstack 繁體中文移植版）

本目錄（`.agents/skills/`）收錄移植自 **pstack** 的 54 個工程技能（Skills），已全面轉譯為**台灣繁體中文**，並針對 **Antigravity Agent 架構**與 **LAH 系統全域架構契約（[`AGENTS.md`](../../AGENTS.md)）**完成深度適配。

> **強制輸出語言規範**：無論透過哪一個技能、劇本（Playbook）或子代理（Subagent）執行任務，所有對使用者的回覆、調查報告、架構設計、待辦清單、決策紀錄（TSV）、PR 描述與 Commit 訊息，**一律強制使用台灣繁體中文輸出**。

---

## 1. 快速上手

1. **主要入口 [`poteto-mode`](./poteto-mode/SKILL.md)**：處理任何非瑣碎的工程任務（臭蟲修復、效能調校、跨專案功能開發、重構、深入調查）時，直接啟動 `poteto-mode`。它會依據任務性質自動配對 23 個劇本（Playbooks），並按步驟調度其他技能與工程原則。
2. **動工前防呆質詢（`/grill-me` + `/poteto-mode`）**：在設計跨專案架構或修改核心邏輯前同時觸發兩者，Agent 會先自行查明程式碼事實，並針對 LAH 四大雷區（Oracle 9i、SQLite 並行鎖定、PHP 7.3 相容性、跨專案契約）透過 `ask_question` 進行精煉無廢話（`unslop`）的決策對齊；實作後的死角審查則可搭配 [`interrogate`](./interrogate/SKILL.md)。
3. **技能導覽 [`poteto-help`](./poteto-help/SKILL.md)**：若不確定該使用哪個技能、劇本或原則，可啟動 `poteto-help` 取得建議與提示詞範本。
4. **模型角色配置 [`setup-pstack`](./setup-pstack/SKILL.md)**：在 Antigravity 中，子代理（`invoke_subagent`）預設遵循系統規範使用 `Model: "inherit"`；若需針對特定角色設定模型層級，可透過 `setup-pstack` 產生 `.agents/rules/pstack-models.md`。

---

## 2. Antigravity 與 LAH 專案適配重點

| 原版 pstack (Cursor) | LAH 工作區適配規範 (Antigravity) |
|---|---|
| `Task` 工具 / 子代理派遣 | 改用 Antigravity 原生 `invoke_subagent`（搭配 `TypeName: "self"` 或 `"research"`，或以 `define_subagent` 註冊專用角色），並透過 `send_message` / `manage_subagents` 協作 |
| `AskQuestion` 工具 | 改用 Antigravity 原生 `ask_question` 工具 |
| 預設模型指派 | 預設使用 `Model: "inherit"`（除非使用者明確指定或於 `.agents/rules/pstack-models.md` 設定 `pro` / `flash` / `flash_lite`） |
| 對話紀錄（Transcripts） | 讀取 `<appDataDir>\brain\<conversation-id>\.system_generated\logs\transcript.jsonl`（必要時讀取 `transcript_full.jsonl`） |
| 註解清理（`no-comments`） | 遵循 [`AGENTS.md`](../../AGENTS.md) 文件完整性規範：**嚴格保留與本次修改無關的所有既有註解與 Docstring**，僅清除本次新增的 AI 廢話敘事註解、死碼與規避藉口 |
| 資料庫與環境安全紅線 | `LAH-API` 強制維持 `MOCK=true`；嚴禁對 Oracle 9i 自動執行 `DROP` / `TRUNCATE` / `ALTER` 或無條件 `DELETE` / `UPDATE`；安裝套件、修改 `.env`、打包發布前須取得人工授權 |
| 獨立 Git 儲存庫與 Commit | 根目錄與五個子專案（`LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger`、`LAH-Updater`）各自獨立版控；Commit 訊息一律採用 Conventional Commits 前綴搭配台灣繁體中文詳細說明 |

---

## 3. 核心與功能型技能總覽（30 個）

| 技能名稱 | 檔案路徑 | 適用情境 |
|---|---|---|
| `poteto-mode` | [`poteto-mode/SKILL.md`](./poteto-mode/SKILL.md) | 非瑣碎工程任務的預設總路由，內建 23 個劇本（Playbooks）與 24 項工程原則索引 |
| `poteto-help` | [`poteto-help/SKILL.md`](./poteto-help/SKILL.md) | 查詢適合目前任務的技能、劇本或工程原則，並提供可直接使用的繁體中文提示詞 |
| `in-your-own-words` | [`in-your-own-words/SKILL.md`](./in-your-own-words/SKILL.md) | 在動手前，要求 Agent 先用自己的話重述目標與問題核心以確認理解一致 |
| `sharpen` | [`sharpen/SKILL.md`](./sharpen/SKILL.md) | 將模糊提示詞精煉為頂尖專家視角的問題定義，同時保留設計空間不過度限縮 |
| `how` | [`how/SKILL.md`](./how/SKILL.md) | 深入追蹤並圖解說明某個子系統或資料流的實際運作機制 |
| `why` | [`why/SKILL.md`](./why/SKILL.md) | 透過版控歷史（Git archaeology）、文件與觀測紀錄，考證某項設計背後的真實原因 |
| `recall` | [`recall/SKILL.md`](./recall/SKILL.md) | 從近期對話紀錄（Transcript）與版控狀態重建特定主題的上下文簡報 |
| `ketchup` | [`ketchup/SKILL.md`](./ketchup/SKILL.md) | 快速摘要自上次訊息以來的變更進度、視覺化狀態與待決策事項 |
| `blast-radius` | [`blast-radius/SKILL.md`](./blast-radius/SKILL.md) | 分析看似微小的變更可能波及的所有呼叫端與跨專案介面，並以實際執行證明安全性 |
| `architect` | [`architect/SKILL.md`](./architect/SKILL.md) | 跨越函式、模組或跨專案邊界前，平行探索多種介面與型別設計方案 |
| `arena` | [`arena/SKILL.md`](./arena/SKILL.md) | 針對同一任務平行啟動 N 個獨立實作方案，比較優劣並嫁接最佳部分 |
| `swarm` | [`swarm/SKILL.md`](./swarm/SKILL.md) | 派遣 N 個平行子代理分別處理不同切片或檢查項目，最後彙整為單一繁中報告 |
| `interrogate` | [`interrogate/SKILL.md`](./interrogate/SKILL.md) | 對程式碼變更（Diff）進行對抗式嚴格審查，找出邊界條件漏洞與品質缺失 |
| `automate-me` | [`automate-me/SKILL.md`](./automate-me/SKILL.md) | 分析過往對話紀錄中的工作習慣，量身打造個人化的 `-mode` 路由技能 |
| `make-bot-ui` | [`make-bot-ui/SKILL.md`](./make-bot-ui/SKILL.md) | 建立可透過 Webhook 觸發遠端機器人任務的控制面板介面 |
| `setup-pstack` | [`setup-pstack/SKILL.md`](./setup-pstack/SKILL.md) | 設定各工程角色所使用的模型層級與推理預算（寫入 `.agents/rules/pstack-models.md`） |
| `reflect` | [`reflect/SKILL.md`](./reflect/SKILL.md) | 在大型任務完成後，從對話紀錄提煉經驗並轉化為技能或結構化規則更新 |
| `correct` | [`correct/SKILL.md`](./correct/SKILL.md) | 針對重複發生的 Agent 錯誤，按「架構 → 型別 → Lint/CI → 測試 → 文件」最高有效層級加以根治 |
| `teach` | [`teach/SKILL.md`](./teach/SKILL.md) | 結合 `how` 與 `why`，以循序漸進的圖表與繁體中文白話解說讓你真正理解某個子系統或變更 |
| `tdd` | [`tdd/SKILL.md`](./tdd/SKILL.md) | 測試驅動開發：先撰寫可重現問題的失敗測試，再實作最小修復使其通過 |
| `benchmark-checklist` | [`benchmark-checklist/SKILL.md`](./benchmark-checklist/SKILL.md) | 在回報效能數據或加速倍率前，嚴格檢驗瓶頸因子、暖機、誤差與端到端關聯性 |
| `no-comments` | [`no-comments/SKILL.md`](./no-comments/SKILL.md) | 審查前清理**本次新增變更**中的冗餘敘事註解與死碼（同時嚴格保留既有程式碼註解） |
| `typescript-best-practices` | [`typescript-best-practices/SKILL.md`](./typescript-best-practices/SKILL.md) | TypeScript / JavaScript 型別系統紀律與實務模式指南 |
| `figure-it-out` | [`figure-it-out/SKILL.md`](./figure-it-out/SKILL.md) | 當內建劇本皆不適用或面對大型跨專案遷移時，量身設計可稽核的專屬執行劇本 |
| `show-me-your-work` | [`show-me-your-work/SKILL.md`](./show-me-your-work/SKILL.md) | 維護結構化的 TSV 決策軌跡紀錄，方便事後審查各項假設與取捨 |
| `create-verification-skill` | [`create-verification-skill/SKILL.md`](./create-verification-skill/SKILL.md) | 為專案建立自動化行為驗證技能與功能地圖（Feature Map） |
| `maintain-verification-skill` | [`maintain-verification-skill/SKILL.md`](./maintain-verification-skill/SKILL.md) | 當驗證技能的功能地圖與實際程式碼產生偏移時，進行校準與更新 |
| `unslop` | [`unslop/SKILL.md`](./unslop/SKILL.md) | 清除文字中的 AI 罐頭語氣、空洞形容詞、過度破折號與生硬句型，使繁體中文精煉自然 |
| `bro` | [`bro/SKILL.md`](./bro/SKILL.md) | 用最直白、零術語的台灣日常白話文重新解釋上一則技術訊息 |
| `technical-writing` | [`technical-writing/SKILL.md`](./technical-writing/SKILL.md) | 結合 Diátaxis、Google 開發者風格與 LAH 繁中規範的技術文件、PR 與 Commit 撰寫標準 |

---

## 4. `poteto-mode` 內建 23 個劇本（Playbooks）

| 劇本檔案 | 適用任務類型 |
|---|---|
| [`playbooks/investigation.md`](./poteto-mode/playbooks/investigation.md) | 唯讀調查問題：系統如何運作、為何如此設計、確認某項假設是否成立 |
| [`playbooks/bug-fix.md`](./poteto-mode/playbooks/bug-fix.md) | 重現缺陷、定位根本原因（Root Cause），並以執行期證據完成修復與驗證 |
| [`playbooks/perf-issue.md`](./poteto-mode/playbooks/perf-issue.md) | 追蹤已量測到的效能瓶頸，並在基準線對照下完成改善 |
| [`playbooks/hillclimb.md`](./poteto-mode/playbooks/hillclimb.md) | 針對單一量化指標進行科學化迭代攀升（假設 → 量測前後對照 → 保留有效改善） |
| [`playbooks/runtime-forensics.md`](./poteto-mode/playbooks/runtime-forensics.md) | 透過即時埋點與觀測診斷執行期異常（記憶體洩漏、CPU 空轉、畫面閃爍） |
| [`playbooks/trace-forensics.md`](./poteto-mode/playbooks/trace-forensics.md) | 分析已擷取的效能剖析檔案（cpuprofile、trace、heap snapshot） |
| [`playbooks/feature.md`](./poteto-mode/playbooks/feature.md) | 從明確定義的資料結構出發，打造並驗證新功能或行為變更 |
| [`playbooks/refactoring.md`](./poteto-mode/playbooks/refactoring.md) | 在完全保留外部行為的前提下調整程式碼結構與模組形態 |
| [`playbooks/prototype.md`](./poteto-mode/playbooks/prototype.md) | 快速建立可執行的輕量原型，以實測結果決定設計方向而非空談猜測 |
| [`playbooks/visual-parity.md`](./poteto-mode/playbooks/visual-parity.md) | 達成兩個 UI 實作之間的像素級視覺與互動一致性 |
| [`playbooks/authoring-a-skill.md`](./poteto-mode/playbooks/authoring-a-skill.md) | 撰寫或修改 `SKILL.md` 技能文件 |
| [`playbooks/eval.md`](./poteto-mode/playbooks/eval.md) | 以盲測方式評估技能或提示詞修改對 Agent 行為的實際影響 |
| [`playbooks/babysit.md`](./poteto-mode/playbooks/babysit.md) | 盯場並推進 PR 至可合併狀態（處理衝突、審查意見與 CI 狀態） |
| [`playbooks/shipping.md`](./poteto-mode/playbooks/shipping.md) | 對通過檢查的變更進行獨立驗證並安全交付 |
| [`playbooks/autonomous-run.md`](./poteto-mode/playbooks/autonomous-run.md) | 長時間自主推進單一大型任務直到達成明確驗收條件 |
| [`playbooks/orchestrate.md`](./poteto-mode/playbooks/orchestrate.md) | 由主對話協調多個子代理、跨多階段或多儲存庫的大型專案計畫 |
| [`playbooks/autopilot-full.md`](./poteto-mode/playbooks/autopilot-full.md) | 全自動推進多個獨立變更分支並透過平行審查完成驗證 |
| [`playbooks/autopilot-stack.md`](./poteto-mode/playbooks/autopilot-stack.md) | 建立並驗證線性堆疊變更，交由開發者最終審核與合併 |
| [`playbooks/session-pickup.md`](./poteto-mode/playbooks/session-pickup.md) | 從既有對話紀錄或分支接手先前未完成的工作 |
| [`playbooks/pause-safely.md`](./poteto-mode/playbooks/pause-safely.md) | 安全暫停進行中的工作並記錄狀態，確保後續可無縫接手 |
| [`playbooks/multi-phase-plan.md`](./poteto-mode/playbooks/multi-phase-plan.md) | 規劃並執行跨多階段或跨多個子專案的結構化變更 |
| [`playbooks/worktree-cleanup.md`](./poteto-mode/playbooks/worktree-cleanup.md) | 在安全檢查門檻下清理已合併或廢棄的 Git Worktree 與暫存環境 |
| [`playbooks/opening-a-pr.md`](./poteto-mode/playbooks/opening-a-pr.md) | 整理最小可驗證提交、撰寫繁體中文 Conventional Commits 與 PR 簡報 |

---

## 5. 24 項工程原則技能（Principles）

| 原則技能 | 分類 | 核心準則 |
|---|---|---|
| [`principle-laziness-protocol`](./principle-laziness-protocol/SKILL.md) | 核心 | 傾向刪除程式碼與最小必要變更，拒絕無謂的抽象層 |
| [`principle-foundational-thinking`](./principle-foundational-thinking/SKILL.md) | 核心 | 寫邏輯前先定好核心型別與資料結構；資料結構對了，邏輯自然清晰 |
| [`principle-redesign-from-first-principles`](./principle-redesign-from-first-principles/SKILL.md) | 核心 | 將新需求視為第一天就存在的基礎假設來重新設計，而非硬貼補丁 |
| [`principle-attack-the-premise`](./principle-attack-the-premise/SKILL.md) | 核心 | 當共用同一前提的兩次修復都失敗時，先質疑並直接測試該前提本身 |
| [`principle-subtract-before-you-add`](./principle-subtract-before-you-add/SKILL.md) | 核心 | 新增功能或重構前，先移除死碼、冗餘驗證與廢棄引用 |
| [`principle-minimize-reader-load`](./principle-minimize-reader-load/SKILL.md) | 核心 | 減少問題與答案之間的跳轉層數與隱藏狀態，收斂可變動範圍 |
| [`principle-outcome-oriented-execution`](./principle-outcome-oriented-execution/SKILL.md) | 核心 | 分階段遷移時直接收斂至目標架構，不保留拋棄式的過渡相容層 |
| [`principle-experience-first`](./principle-experience-first/SKILL.md) | 核心 | 使用者體驗優先於實作便利性；寧可交付少而精良的功能 |
| [`principle-exhaust-the-design-space`](./principle-exhaust-the-design-space/SKILL.md) | 核心 | 面對無前例的設計決策時，先建立 2–3 個競爭原型並排比較 |
| [`principle-build-the-lever`](./principle-build-the-lever/SKILL.md) | 核心 | 非瑣碎工作應打造可重跑的腳本、產生器或檢測工具，而非純手工修改 |
| [`principle-model-the-domain`](./principle-model-the-domain/SKILL.md) | 架構 | 用明確的領域結構（狀態機、查表、型別模型）取代散落各處的條件分支 |
| [`principle-boundary-discipline`](./principle-boundary-discipline/SKILL.md) | 架構 | 將驗證與防呆集中在系統邊界（API 入口、設定、網路），保持核心業務邏輯純粹 |
| [`principle-type-system-discipline`](./principle-type-system-discipline/SKILL.md) | 架構 | 讓非法狀態無法被型別表示，在邊界解析外部資料並窮盡所有變體 |
| [`principle-make-operations-idempotent`](./principle-make-operations-idempotent/SKILL.md) | 架構 | 確保指令與排程具冪等性，無論重試或中斷後重跑皆收斂至相同最終狀態 |
| [`principle-migrate-callers-then-delete-legacy-apis`](./principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | 架構 | 在同一波變更中遷移所有呼叫端並移除舊內部介面，不留殭屍相容層 |
| [`principle-separate-before-serializing-shared-state`](./principle-separate-before-serializing-shared-state/SKILL.md) | 架構 | 平行作業時優先消除共享狀態（隔離檔案、分支或目錄），確有必要才序列化 |
| [`principle-prove-it-works`](./principle-prove-it-works/SKILL.md) | 驗證 | 宣告完成前必須對真實產物進行驗證（執行功能、讀取實際輸出），不靠猜測或「可編譯」交差 |
| [`principle-fix-root-causes`](./principle-fix-root-causes/SKILL.md) | 驗證 | 追查症狀至系統最初出錯的根源並修復，不以掩蓋錯誤的防呆守衛冒充修復 |
| [`principle-sequence-verifiable-units`](./principle-sequence-verifiable-units/SKILL.md) | 驗證 | 將多步驟變更拆解為可獨立驗證的最小單元，逐一驗證後再推進下一步 |
| [`principle-test-behavior-not-implementation`](./principle-test-behavior-not-implementation/SKILL.md) | 驗證 | 測試應斷言外部可觀察的行為，而非內部實作細節 |
| [`principle-explain-the-number`](./principle-explain-the-number/SKILL.md) | 驗證 | 信賴任何量測數據前，先找出其限制因子並排除量測失真 |
| [`principle-guard-the-context-window`](./principle-guard-the-context-window/SKILL.md) | 委派 | 將大量檔案讀取與平行探索委派給子代理，主對話僅保留精煉摘要 |
| [`principle-never-block-on-the-human`](./principle-never-block-on-the-human/SKILL.md) | 委派 | 可逆且安全的操作直接執行並展示結果，僅在不可逆操作或 `AGENTS.md` 授權紅線時暫停詢問 |
| [`principle-encode-lessons-in-structure`](./principle-encode-lessons-in-structure/SKILL.md) | 後設 | 將重複提醒的教訓編碼為 Lint、型別、測試或自動化腳本，而非僅靠文字叮嚀 |
