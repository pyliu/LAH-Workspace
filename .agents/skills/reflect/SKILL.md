---
name: reflect
description: 針對當前對話紀錄平行啟動三個審查子代理（Subagents），挖掘具持久價值的經驗教訓，並將每項發現導向對既有技能的具體修改。當使用者輸入 reflect 時使用。
disable-model-invocation: true
---

# Reflect（對話經驗反思與技能演進）

> **輸出語言規範**：所有審查發現、綜合評估報告、修改提案與給使用者的摘要，**一律強制使用台灣繁體中文輸出**。

從當前對話中挖掘具有持久價值的經驗教訓（Durable Learnings），並將其轉化為對技能（Skills）的具體修改。

當使用者說「reflect」或「/reflect」時啟動本技能。若當前對話非常瑣碎、偏離主題，或父代理已正確遵循既有技能且該技能已完整涵蓋相關情境，則請略過。一次性的巧合或特例不屬於具持久價值的經驗教訓。

## 1. 定位當前對話紀錄（Active Transcript）

在平行展開審查前，請先找到本次對話的紀錄檔。在 Antigravity 環境中，對話紀錄位於 `<appDataDir>\brain\<conversation-id>\.system_generated\logs\transcript.jsonl`（以及完整版 `transcript_full.jsonl`）。切勿跨越工作區去讀取無關專案的私密對話。

請讀取當前對話的 `transcript.jsonl`（若某步驟有 `truncated_fields`，則可搭配讀取 `transcript_full.jsonl` 的對應行）。若無法直接存取檔案路徑，則整理一份緊湊完整的對話過程摘要（Digest）傳遞給審查子代理。

## 2. 平行啟動三個審查子代理（Spawn Three Reviewers in Parallel）

透過單一 `invoke_subagent` 呼叫平行啟動三個審查子代理（設定 `TypeName: "research"`，使子代理具備唯讀檔案與 MCP 查詢工具權限，可查閱對話中引用的工單、討論串與追蹤紀錄）。

每個審查子代理與後續的綜合分析員（Synthesizer）皆對應 `.agents/rules/pstack-models.md` 規則中的角色設定；若無該規則檔或角色設為 `inherit`，則一律將 `Model` 設為 `"inherit"`。

| 審查視角（Lens） | 對應角色行（Role line） | 預設 `Model` | 提示詞範本（Prompt template） |
|---|---|---|---|
| 判斷與決策（Judgment） | `reflect judgment, divergent, synthesizer` | `inherit` | `references/judgment-reviewer.md` |
| 工具與技術細節（Tooling） | `reflect tooling` | `inherit` | `references/tooling-reviewer.md` |
| 逆向與盲點（Divergent） | `reflect judgment, divergent, synthesizer` | `inherit` | `references/divergent-reviewer.md` |

請讀取並完整傳遞各個提示詞範本，並將 `<ABSOLUTE_PATH>` 替換為當前對話紀錄的絕對路徑（或附上對話摘要）。各審查子代理完成後會將發現回傳。

## 3. 綜合分析與篩選（Synthesize）

啟動一個綜合分析子代理（透過 `invoke_subagent`，設定 `TypeName: "research"`，`Model` 依 `reflect judgment, divergent, synthesizer` 設定，預設為 `"inherit"`）。它會透過唯讀與 MCP 工具抽查驗證引用來源。請完整傳遞 `references/synthesizer.md` 範本，並將三個審查子代理的完整輸出填入對應位置。綜合分析員會回傳一份包含 **Accepted（採納）**、**Rejected（駁回）** 與 **Backlog（待辦事項）** 的繁體中文清單。

## 4. 結構化強制機制檢查（Structural Enforcement Check）

將任何屬於「透過 Lint 規則、腳本、Metadata 旗標或執行期檢查（Runtime Check）能更可靠地強制執行」的 Accepted 項目移至 Backlog。詳見 **encode-lessons-in-structure** 原則技能。

## 5. 確認與套用修改（Apply）

向使用者完整呈現綜合分析員產出的 **Accepted（採納）**、**Rejected（駁回）** 與 **Backlog（待辦事項）** 清單，並在套用任何 Accepted 修改前**等待使用者的明確核准**。使用者可以挑選要套用的子集，或調整導向目標（Routing）。由於技能變更會影響未來所有的 Agent 行為，**嚴禁未經確認自動套用**。

待使用者核准後，嚴格依照每個核准項目的導向目標（Routing）執行：

- **微幅的既有技能修改**（新增單行條列、精煉句子、修正過時資訊）：由父代理直接使用 `replace_file_content` 修改。
- **實質的既有技能擴充**（新增章節、新增模式表格、超過約 10 行的修改）：交由技能撰寫流程進行草擬、測試與迭代。
- **`tune description: <技能路徑>`**（該技能已存在，但在應該觸發時未能觸發）：調整該技能 `SKILL.md` frontmatter 中的 `description` 觸發關鍵字。
- **`new skill via create-skill: <kebab-name>`**：建立新技能，遵循標準 `.agents/skills/<kebab-name>/SKILL.md` 格式，切勿隨意自創結構。

## 6. 為使用者總結成果（Summarize for the User）

以簡短的繁體中文條列呈現最終結果，不需冗長開場白：

- **已套用的技能修改**：`<技能路徑>` — 單行說明修改內容。
- **新建的技能**：`<技能路徑>` — 單行說明（罕見）。
- **列入待辦清單（Backlog）的結構化改進**：`<議題標題>`（`<標籤>`）— 單行說明。
- **已捨棄項目（Dropped）**：每項被駁回的發現一行，並附註綜合分析員給出的駁回理由。
