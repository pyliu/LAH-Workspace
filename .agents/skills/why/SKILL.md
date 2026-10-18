---
name: why
description: "適用於查詢「為什麼 X 會這樣設計（why does X work this way）」、「為什麼我們當初選擇 Y」、設計背後的理由、迴歸錯誤脈絡、事後檢討（Postmortems）或有數據支撐的閾值來源。會自動探索可用的工具與 MCP，並平行查詢各類證據來源（版本控制、議題追蹤、長篇文件、即時團隊對話、基礎設施可觀測性、錯誤追蹤、產品分析資料倉儲），最後回傳一份附帶明確引用的決策與權衡分析報告。若要查詢執行期運作行為，請改用 how。"
disable-model-invocation: true
---

# Why（程式碼設計動機與歷史考古）

> **輸出語言規範**：所有調查分析報告、假設推論、未知事項說明與約束建議，**一律強制使用台灣繁體中文輸出**（檔案相對連結、Commit Hash、PR 編號與程式碼符號保持原樣）。

深入調查程式碼背後的動機與原始意圖。它的姊妹技能 [`how`](../how/SKILL.md) 負責回答「程式碼做了什麼以及如何運作」；而 `why` 則負責回答「是什麼力量與歷史脈絡塑造了它今天的模樣」。

下方啟動的每個子代理（Subagent）皆對應 `.agents/rules/pstack-models.md` 規則中的角色設定；若無該規則檔或角色設為 `inherit`，則一律將 `invoke_subagent` 的 `Model` 設為 `"inherit"`（遵循 Antigravity 預設規範）。

在 Antigravity 環境中，請透過 `invoke_subagent`（設定 `TypeName: "research"`，具備唯讀檔案搜尋與 MCP 查詢能力）平行啟動各個調查子代理與綜合分析員。**調查子代理嚴禁修改任何檔案。**

## 運作姿態（Operating Posture）

請以一位**嚴謹、審慎且精確的調查員**姿態運作。誠實區分「有明確文獻記載的已知事實」與「你個人的推論」。請先完整閱讀 [`references/epistemics.md`](references/epistemics.md) 以掌握可信度分級框架（Confidence Framework）與措辭指南。綜合分析員（Synthesizer）必須嚴格遵守該框架。

## 步驟 1：理解調查目標與問題本質（Understand the Target and the Question）

- **調查目標（Target）**：通常是一段程式碼、一個設計模式、一項功能，或一個具名的設計決策。
- **核心問題（Question）**：通常是詢問設計理由、權衡取捨（Tradeoff）、引發該設計的邊界情況（Edge case）、外部系統限制、疑似廢棄的程式碼（Dead code），或是廣泛的歷史演進回顧。

若使用者的目標指涉模糊（例如只問了一句「為什麼我們要這樣寫？」而沒有明確指明對象），請根據當前對話脈絡（已開啟的檔案、近期編輯紀錄、游標位置、剛討論過的內容）做出最合理的推斷。先用一兩句話簡短向使用者說明你的理解（方便使用者在方向偏離時糾正），接著直接往下執行。

## 步驟 2：建立程式碼錨點（Establish the Code Anchor）

在派出調查子代理之前，請先在主對話中建立基礎種子脈絡（Seed Context）：
- 目標檔案路徑與行號範圍。
- 關鍵符號（函式、類別、常數名稱）。
- 近期最後修改到該目標的幾個 Commit。
- 從合併 Commit 中提取出的 PR 編號（標題中形如 `(#1234)` 的模式）以及任何關聯的工單 ID。

請在對應的子專案 Git 儲存庫目錄下（注意 LAH-Workspace 的 `LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger` 為各自獨立的 Git 儲存庫）執行：
- `git blame -L <start>,<end> <file>`：找出最後修改各行的 Commit。
- `git log --follow -p -- <file>`：追蹤跨檔案重新命名的完整歷史與 Patch。
- `git log --oneline -20 -- <file>`：檢視近期 Commit 與 PR 編號。
- `git log -1 --format=%B <commit>`：提取完整的 Commit 訊息內容（在 LAH-Workspace 中，標準繁體中文 Commit Body 會包含修改目的、修改項目與相容性說明）。
- 若環境支援 `gh` 且連接遠端 GitHub，可執行 `gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews` 取得 PR 討論內容。

這份「程式碼錨點（Code Anchor）」將同時傳遞給每一位調查子代理與最終的綜合分析員。

## 步驟 3：平行啟動調查子代理（Spawn Parallel Investigators）

**預設展開完整的平行調查。** 目標是建立完整的證據覆蓋地圖，而非草率結案。即使某個來源查無結果，也要「記錄查無結果（Document the null）」，而不是直接跳過不查。

### 探索可用工具與 MCP（Discovery）

在啟動調查子代理之前，先盤點當前 Antigravity 環境中可用的工具與 MCP 伺服器，並將每個可用工具對應至以下七大證據類別之一：

1. **版本控制與程式碼考古（Source control history）**
2. **議題與工單追蹤（Issue / ticket tracker）**
3. **長篇設計與知識庫文件（Long-form documents）**
4. **即時團隊對話紀錄（Real-time team chat）**
5. **基礎設施可觀測性與監控（Infrastructure observability）**
6. **錯誤與例外追蹤（Error / exception tracking）**
7. **產品分析與資料倉儲（Product analytics warehouse）**

其中第 1 類「版本控制與程式碼考古」永遠可透過本地 `git` 與程式碼庫搜尋取得（在 LAH-Workspace 中還包含各專案的 `docs/`、`README.md`、`CHANGELOG` 與 SQLite 快取結構）。針對其餘六類，請根據環境中實際啟用的 MCP 伺服器進行分類。

針對每一個擁有對應工具或 MCP 的證據類別，透過單一 `invoke_subagent` 呼叫（設定 `TypeName: "research"`，`Model` 讀取 `why investigators` 設定，預設為 `"inherit"`）**同時平行啟動一個專屬的調查子代理**。每個調查子代理只專注負責一個資料來源類別，切勿要求同一個子代理同時跨越多個異質來源。

每個調查子代理的提示詞（Prompt）由以下內容組合而成：
- 填入實際內容的 [`references/investigator-prompt.md`](references/investigator-prompt.md) 範本。
- 該證據類別對應的專屬調查劇本 `references/sources/<source>.md`（總覽索引見 [`references/source-playbook.md`](references/source-playbook.md)）。
- **若目標程式碼看起來屬於防禦性設計**（例如 Null 檢查、重試邏輯 Retry、逾時處理 Timeout、速率限制 Rate limiting、功能旗標 Feature flags、Oracle/SQLite 鎖定防護、OOM 處理等），請一併附上 [`references/sources/incident-postmortem.md`](references/sources/incident-postmortem.md)。
- 步驟 2 建立的「程式碼錨點」與使用者的原始問題。

### 調查子代理編制表（每個可用證據類別配置一名）

以下每個類別都有其獨特的「最擅長發掘的 Why 面向（Best at）」。請利用這份特性來預期回傳結果、在某類別查無資料時點出知識缺口，並在極少數「可證明完全無關」的情況下作為略過依據：

1. **版本控制與程式碼考古（Source control）**（`git` 歷史、`gh` PR 紀錄、程式碼註解、測試案例，劇本見 [`references/sources/code-archaeology.md`](references/sources/code-archaeology.md)）：**永遠必須啟動**，是唯一保證存在的來源。最擅長發掘*實作當下與程式碼審查期間留下的設計理由*。
2. **議題與工單追蹤（Issue / ticket tracker）**（如 Linear、Jira、GitHub Issues MCP，劇本見 [`references/sources/linear.md`](references/sources/linear.md)）：最擅長發掘*產品面或業務面的驅動因素（Forcing function）*，當原因來自工程團隊外部時最為關鍵。
3. **長篇設計與知識庫文件（Long-form documents）**（如 Notion、Confluence、Google Docs MCP 或專案內 `docs/`，劇本見 [`references/sources/notion.md`](references/sources/notion.md)）：最擅長發掘*在寫下程式碼之前所撰寫的長篇架構設計理由與權衡*。
4. **即時團隊對話紀錄（Real-time team chat）**（如 Slack、Discord、Teams MCP 或即時通紀錄，劇本見 [`references/sources/slack.md`](references/sources/slack.md)）：最擅長發掘*從未寫入正式文件的即時討論與取捨*，當 Git、工單與文件紀錄都很單薄時尤其重要。
5. **基礎設施可觀測性（Infrastructure observability）**（如 Datadog、Grafana、Prometheus MCP，劇本見 [`references/sources/datadog.md`](references/sources/datadog.md)）：最擅長發掘*促使該段程式碼誕生的基礎設施與執行期真實狀況*（如逾時、重試、連線池耗盡、負載保護）。
6. **錯誤與例外追蹤（Error / exception tracking）**（如 Sentry、Rollbar、Bugsnag MCP，劇本見 [`references/sources/sentry.md`](references/sources/sentry.md)）：最擅長發掘*促使防禦性或修正性程式碼誕生的特定例外錯誤與崩潰軌跡*（如 `try/catch`、Null 守衛、型別檢查）。
7. **產品分析與資料倉儲（Product analytics warehouse）**（如 Databricks、BigQuery、Snowflake MCP，劇本見 [`references/sources/databricks.md`](references/sources/databricks.md)）：最擅長發掘*塑造程式碼的產品數據與資料分佈現實*（如實驗旗標、資料遷移，以及「這個魔法數字或閾值是從哪裡算出來的」）。

### 何時可以略過某個調查子代理（When to Skip an Investigator）

唯有具備**明確的書面理由**（且該理由必須寫入最終報告的「已查閱資料來源（Sources Consulted）」中）時才可略過。合法的理由只有兩種：

- **當前環境未配置該類別的 MCP 工具**：請將其標記為「搜尋限制缺口（Gap）」，而非主觀選擇不查。例如：「已略過即時團隊對話：當前環境未配置對應的聊天 MCP，因此無法檢索非正式討論紀錄。」
- **該來源可被證明與目標完全無關（Provably irrelevant）**，而不只是「大概沒關係」。門檻極高，例如：「已略過錯誤與例外追蹤：調查目標為純編譯期建置腳本，無任何執行期程式碼路徑。」

若經評估發現目標僅是一個極其單純的單一 Commit，且 Commit 訊息或 PR 描述已經完整交代了百分之百的原因，則你可以在確認其餘類別搜尋皆屬多餘後直接在主對話作答，但必須明確向使用者說明。這種情況應屬罕見。

## 步驟 4：綜合分析（Synthesize）

當平行調查子代理完成回報後，可由主代理直接依循規範綜合，或透過 `invoke_subagent`（設定 `TypeName: "research"`，`Model` 讀取 `why synthesizer` 設定，預設為 `"inherit"`）啟動一個綜合分析子代理，並提供以下完整資訊：
1. 所有調查子代理的發現（包含查無結果的項目，以及附帶理由略過的類別）。
2. 步驟 2 的程式碼錨點（Code Anchor）。
3. 使用者的原始問題。
4. [`references/epistemics.md`](references/epistemics.md) 中的知識論與可信度分級框架。
5. [`references/synthesizer-prompt.md`](references/synthesizer-prompt.md) 中的綜合分析員提示詞範本。

## 步驟 5：向使用者呈現報告（Present）

將綜合分析的繁體中文報告呈現給使用者。你可以為了閱讀流暢度進行微幅潤飾或補充當前對話脈絡，但**嚴禁竄改或削弱報告中代表證據可信度的保留語氣（Confidence language）**。

## 輸出格式（Output Format）

報告結構嚴格遵循 [`references/synthesizer-prompt.md`](references/synthesizer-prompt.md) 的定義：
1. **調查問題（The Question）**
2. **目標程式碼（The Code in Question）**
3. **我們找到的確切證據（What We Found）**
4. **我們可以合理推論的事項（What We Can Reasonably Infer）**
5. **競爭假設（Competing Hypotheses）**
6. **我們尚不知道的事（What We Don't Know）**
7. **已查閱資料來源（Sources Consulted）**
8. **可信度總結（Confidence Summary）**

請保持不同可信度層級之間的嚴格分離，並在「已查閱資料來源」中為每個調查類別保留一行（包含查無結果或被略過的類別及其理由）。

在「已查閱資料來源」之後，**若使用者的 `why` 問題是為了準備修改這段程式碼**，請將歷史脈絡發現進一步轉化為規劃變更所需的四項約束條件：**必須保留（Preserve）**、**可以變更（Change）**、**必須避開的陷阱（Avoid）** 與 **潛在風險（Risk）**。

## 必須避免的常見失敗模式

- **近因偏誤（Recency bias）**：切勿盲目假設最近一次 Commit 就是該設計的權威原因。程式碼目前的模樣往往是早期多次決策層層堆疊（Accretion）的結果——請務必往回追溯到最初引入該設計的根源 Commit。
