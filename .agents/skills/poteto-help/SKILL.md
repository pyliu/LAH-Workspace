---
name: poteto-help
description: 引導使用者完成 pstack 設定、使用 /poteto-mode，以及為任務挑選合適的技能、劇本（Playbook）或原則。輸入 /poteto-help 加上問題即可查詢。
disable-model-invocation: true
---

# Poteto 使用說明與導覽

> **輸出語言規範**：所有回覆、說明、範例提示詞與導覽內容，**一律強制使用台灣繁體中文輸出**（檔案相對連結與技能識別名稱保持英文）。

回答使用者關於 pstack 的問題、提供一段可直接複製發送的提示詞（Prompt），並附上答案來源檔案的連結。面對求助問題時，請勿直接開始執行任務。使用者問的是「怎麼做」，而執行 pstack 會消耗實際的 Token，因此請讓使用者自行決定並發送提示詞。

若訊息是要求執行實際工作（例如「用 pstack 修復這個臭蟲」），則不屬於求助問題。請讀取 [`poteto-mode`](../poteto-mode/SKILL.md)，直接依其規範執行工作，並順帶提及一次可將其設為常駐工作階段或技能。

本檔案負責將問題對應至記載詳細解答的技能與指南頁面。具體細節以各該檔案為準；在引用前請先讀取你導向的目標檔案，若本導覽與目標檔案內容有所出入，請以目標檔案為準。此處連結指向已安裝於 `.agents/skills/` 的本機技能檔案，請同時提供點擊開啟的本地檔案連結。

## 釐清使用者需求

從訊息與對話脈絡推斷使用者的需求。若有明確指名情境（例如「哪個技能用來審查 PR？」），請直接跳至對應章節回答。若需求仍不明確，請使用 `ask_question` 提出一個單選題並提供以下選項，接著僅針對使用者選擇的章節作答：

- 完成初始設定
- 使用 `/poteto-mode` 開始任務
- 為特定情境挑選技能
- 修正執行偏離的任務
- 客製化專屬的 pstack

檢查會影響答案的環境狀態，並僅在確實有影響時提及：

- 若不存在 `.agents/rules/pstack-models.md`，代表尚未執行過 `/setup-pstack`，所有角色皆使用預設模型（Antigravity 預設為 `inherit`）。
- 若專案中沒有 `verify-*` 技能或其他應用程式驗證腳本（Harness），代表 Agent 沒有自動化方式驅動應用程式。當問題涉及如何證明變更有效時，請提及 `/create-verification-skill`。

當缺少模型設定規則且該規則與問題相關時（例如使用者是新手、問題與設定或成本有關，或答案取決於實際執行的模型），請詢問使用者是否要現在為各角色指定模型層級與推理預算。每個對話最多詢問一次。若使用者的核心需求也不明確，請將兩個問題合併詢問，並提供兩個選項：

- 現在設定：提供 `/setup-pstack` 讓使用者輸入，同時回答他們的問題。
- 稍後設定：直接回答問題，並附註一行說明在執行 `/setup-pstack` 之前，所有角色皆會維持預設模型（`inherit`）。

## 完成初始設定

1. 技能已安裝於工作區的 `.agents/skills/` 目錄下。
2. 執行 [`/setup-pstack`](../setup-pstack/SKILL.md)。它會詢問推理預算，將模型層級對應至各個角色，並寫入 `.agents/rules/pstack-models.md` 規則檔。
3. 使用 `/poteto-mode` 搭配明確目標與可判定通過或失敗的檢查條件，開始執行實際任務。

安裝技能本身不會改變任何行為，直到使用者主動呼叫技能為止。唯有 `/setup-pstack` 會根據使用者的自然語言描述自動載入。詳細資訊請參考 [`references/prompting.md`](references/prompting.md)，並主動提議協助使用者撰寫第一個提示詞。

若使用者擔心 Token 成本，請說明 Token 的消耗去向以及如何節省。pstack 會在子代理（Subagents，透過 `invoke_subagent` 啟動）與審查小組（Review Panels）上消耗額外 Token。可重新執行 `/setup-pstack` 並選擇較小的預算或較輕量的模型層級（如 `flash` 或 `flash_lite`）。將角色設為 `inherit` 會直接使用父對話的模型（Antigravity 的預設與建議做法）。縮短審查小組清單也能減少啟動的子代理數量（每個項目啟動一個子代理）。請將 `/poteto-mode` 留給真正需要嚴謹品質把關的工作。

pstack 已針對 Antigravity 環境完成適配：各工作流程技能（包含 `/poteto-mode`、`/how`、`/why` 與 `/teach`）皆透過 Antigravity 原生的 `invoke_subagent` 工具（搭配 `TypeName: "research"` 或 `TypeName: "self"`）平行調度子代理，並使用 `schedule` 工具支援排程或循環監控。

## 使用 `/poteto-mode` 開始任務

`/poteto-mode` 會將任務配對至對應的劇本（Playbook），將劇本步驟複製到待辦清單中，並在步驟需要時呼叫其他技能。被略過的步驟會保留在清單中並標註 `skip: <原因>`。一個好的提示詞只需陳述「目標」與「如何判定完成」，不需要自己列出技能清單，因為手寫的執行順序往往會遺漏或打亂劇本原本設計好的關鍵步驟。協助使用者撰寫提示詞前，請先讀取 [`references/prompting.md`](references/prompting.md)。

在對話中途，輸入「新任務（new task）」可讓模式重新配對全新的劇本。`/poteto-mode` 在劇本步驟啟動子代理時，會透過 `invoke_subagent`（唯讀調查使用 `TypeName: "research"`，實作任務使用 `TypeName: "self"`）執行。

## 挑選合適的技能

預設答案永遠是 `/poteto-mode`，因為它會在步驟需要時自動呼叫大多數其他技能。只有當使用者希望特定環節比劇本預設做得更深或更精簡時，才直接推薦個別技能。推薦前請先讀取該技能的 `SKILL.md`，並提供一個範例提示詞。

| 使用者想要 | 對應技能 |
|---|---|
| 以嚴謹標準執行任何非瑣碎任務 | [`/poteto-mode`](../poteto-mode/SKILL.md) |
| 在開始前確認 Agent 是否真正理解目標與問題本質 | [`/in-your-own-words`](../in-your-own-words/SKILL.md) |
| 在開始前提升任務品質：更具專家水準、更聚焦結果、避免過度指定細節 | [`/sharpen`](../sharpen/SKILL.md) |
| 了解現有程式碼如何運作，或新程式碼應該放在哪裡 | [`/how`](../how/SKILL.md) |
| 了解程式碼為何如此設計，或某個數值與邏輯的歷史脈絡 | [`/why`](../why/SKILL.md) |
| 以白話易懂的方式理解某項變更或子系統 | [`/teach`](../teach/SKILL.md) |
| 回顧自己近期在某個主題上的工作脈絡 | [`/recall`](../recall/SKILL.md) |
| 用幾句白話與精簡視覺圖表，快速掌握自上次訊息以來的對話進展與待決策項目 | [`/ketchup`](../ketchup/SKILL.md) |
| 了解一小段程式碼變更（Diff）可能會破壞外部哪些地方 | [`/blast-radius`](../blast-radius/SKILL.md) |
| 在撰寫跨越函式邊界的程式碼前，先敲定型別與模組結構 | [`/architect`](../architect/SKILL.md) |
| 針對同一需求平行嘗試多種實作方案，並融合出最佳版本 | [`/arena`](../arena/SKILL.md) |
| 將工作切片平行檢查，或讓多個工作代理競速執行 | [`/swarm`](../swarm/SKILL.md) |
| 讓多個審查代理嚴格審查變更（Diff）並設法找出破綻 | [`/interrogate`](../interrogate/SKILL.md) |
| 當存在低成本本地測試時，以測試驅動（Test-First）方式修復臭蟲 | [`/tdd`](../tdd/SKILL.md) |
| 在 `.ts` 或 `.tsx` 開發中套用 TypeScript 最佳實踐規則 | [`/typescript-best-practices`](../typescript-best-practices/SKILL.md) |
| 在審查前清除多餘註解，並由非撰寫者的審查代理把關 | [`/no-comments`](../no-comments/SKILL.md) |
| 清除文章與說明中的 AI 罐頭語氣與贅字 | [`/unslop`](../unslop/SKILL.md) |
| 依循高標準撰寫技術文件、RFC、README、PR 描述或繁體中文 Commit 訊息 | [`/technical-writing`](../technical-writing/SKILL.md) |
| 用最直白的大白話重新聽一次上一段回覆 | [`/bro`](../bro/SKILL.md) |
| 為 Agent 建立可自動驅動應用程式並證明行為正確的驗證技能 | [`/create-verification-skill`](../create-verification-skill/SKILL.md) |
| 讓驗證技能及其功能地圖與應用程式最新狀態保持同步 | [`/maintain-verification-skill`](../maintain-verification-skill/SKILL.md) |
| 在回報或採取行動前，嚴格檢驗效能數據的真實性 | [`/benchmark-checklist`](../benchmark-checklist/SKILL.md) |
| 執行大型、跨領域變更，或適合離開座位後回來檢視的任務 | [`/figure-it-out`](../figure-it-out/SKILL.md) |
| 在執行期間保留決策紀錄（Decision Log），並在事後審視 | [`/show-me-your-work`](../show-me-your-work/SKILL.md) |
| 為各角色挑選模型層級與推理預算 | [`/setup-pstack`](../setup-pstack/SKILL.md) |
| 將自己的工作習慣轉化為個人專屬模式技能 | [`/automate-me`](../automate-me/SKILL.md) |
| 將已完成任務的經驗教訓轉化為對技能的具體改進 | [`/reflect`](../reflect/SKILL.md) |
| 防止 Agent 在此儲存庫中重複犯下相同的錯誤 | [`/correct`](../correct/SKILL.md) |
| 建立可透過 Webhook 觸發 Bot 的互動式操作頁面 | [`/make-bot-ui`](../make-bot-ui/SKILL.md) |
| 查詢 pstack 使用導覽與技能地圖 | `/poteto-help` |

若同層目錄下有未列於上表的技能目錄，請讀取其 YAML frontmatter 並依 `description` 進行導覽。`principle-*` 開頭的目錄則屬於下方的「原則（Principles）」。

容易混淆的技能比較：

- `/how` 解釋程式碼「如何運作」；`/why` 解釋「背後原因與歷史脈絡」；`/teach` 則會呼叫其中之一或兩者，並用深入淺出的方式向你講解。
- `/arena` 給每個子代理相同的需求簡報並融合最佳部分；`/swarm` 則是將工作拆分為不同切片或競速分支，最後彙整成一份報告。
- `/architect` 會在敲定設計後緊接著實作；若想在寫程式碼前先審查設計，可在提示詞加上「含檢查點（with checkpoint）」。
- `/interrogate` 負責審查 Diff 本身；`/blast-radius` 則專門尋找 Diff 以外可能被波及的損壞範圍，並證明讓變更安全的關鍵事實。
- `/recall` 會跨近期多個對話重建工作脈絡；`/ketchup` 僅涵蓋當前對話自使用者上一則訊息以來的變化。若要接手單一特定對話或分支，請使用 `Session pickup` 劇本。
- `/figure-it-out` 用於設計單次嚴謹的長時任務；`Orchestrate` 劇本用於執行橫跨多天與多個 PR 的大型計畫；`Autonomous run` 劇本則負責將單一任務一路推進至完成條件。

## 劇本（Playbooks）與原則（Principles）

劇本是內建於 `/poteto-mode` 中的步驟清單，並非獨立技能，因此沒有專屬的斜線指令。在 `/poteto-mode` 下，只要描述任務就會自動配對劇本，或使用以下關鍵詞直接指定：

- 「babysit this pr」或「檢查 PR 123」會執行 **Babysit** 劇本，將 PR 推進至可合併狀態後停止（除非使用者明確要求合併，否則不會自動合併）。
- 「land the stack」會執行 **Shipping** 劇本。
- 「take over this branch（接手這個分支）」會執行 **Session pickup** 劇本。
- 「pause safely（安全暫停）」會執行 **Pause safely** 劇本。
- 「full autopilot on this queue」會執行 **Autopilot-full** 劇本；「stack them, don't ship」會執行 **Autopilot-stack** 劇本。
- 「run the eval playbook」會執行 **Eval** 劇本。

[`poteto-mode`](../poteto-mode/SKILL.md) 的 Playbooks 章節列出了所有劇本及其適用時機。

針對跨越階段或堆疊 PR 的工作，要求 `/poteto-mode` 擬定計畫會執行 [Multi-phase plan 劇本](../poteto-mode/playbooks/multi-phase-plan.md)，它只會產出計畫而不直接實作。針對設計問題，則可透過 Prototype 劇本或 `/architect` 先在程式碼中驗證。

原則（Principles）是 `/poteto-mode` 會讀取並在回覆中引用的單一規則技能。使用者很少需要手動呼叫，通常只需在對話中直接點名引導，例如：「套用 prove it works 原則，給我看真實執行輸出。」當然，輸入 `/principle-<name>` 仍可隨時載入指定原則。

## 修正執行偏離的任務

| 症狀 | 解決方式 |
|---|---|
| 過了幾輪對話後，嚴謹模式不再維持 | 請在每個新任務開頭明確加上 `/poteto-mode`。 |
| 隨口問的問題被當成上一個任務的下一步 | 請明確說「新任務（new task）」，或說明這一輪不需要使用該模式。 |
| 新的模型選擇沒有生效 | `/setup-pstack` 寫入的 `.agents/rules/pstack-models.md` 規則會在新的對話生效，請開啟新對話或提醒 Agent 讀取該規則。 |
| 執行消耗的 Token 比預期多 | 請參閱上方「完成初始設定」中的成本說明段落。 |
| 某個技能沒有自動載入 | 只有 `/setup-pstack` 會從自然語言自動載入；其他技能需由使用者明確輸入，或由 `/poteto-mode` 依劇本步驟呼叫。 |
| 平行的子代理互相覆寫了對方的檔案 | 請讓每個子代理使用獨立的工作樹（`Workspace: "branch"` 或 `"share"`），避免共用同一工作目錄寫入相同檔案。 |
| 長時間自動執行有動作但沒有真正完成 | 循環排程（`schedule` 或 `/goal`）需要可判定通過或失敗的明確檢查條件，而非單純指定執行時間。 |
| 回覆僅憑建置成功（Green build）就宣稱完成 | 請要求提供真實指令輸出、實際操作流程、資料庫儲存值或效能剖析數據——這正是 `prove-it-works` 原則的核心。 |

若任務在執行中偏離方向，[`references/prompting.md`](references/prompting.md) 提供了單行修正提示詞。

## 客製化專屬的 pstack

- [`/automate-me`](../automate-me/SKILL.md) 可從使用者自身的對話歷史中草擬個人專屬模式技能，與 `/poteto-mode` 搭配使用。
- 工作結束後執行 [`/reflect`](../reflect/SKILL.md)，可將該次工作階段學到的教訓轉化為經使用者核准的技能修改。
- 輸入 `/poteto-mode write a skill for <工作流程>` 會執行技能撰寫劇本（Authoring Playbook）；而 Eval 劇本則可對技能變更進行盲測評估。
- 若發現某個技能表現不如預期，請在獨立的變更中修正該技能，不要混在正在開發的功能變更中一起修改。

## 回覆規範

開門見山直接給出答案。在程式碼區塊中提供至多一個範例提示詞（若合適，可改寫自 [`references/recipes.md`](references/recipes.md)），並附上對應技能檔案的連結。除非使用者要求列出完整技能地圖，否則請保持簡短精煉。
