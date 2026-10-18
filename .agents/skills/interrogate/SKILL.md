---
name: interrogate
description: "適用於「interrogate」、「對抗性審查（adversarial review）」、「多模型審查」、「挑戰這段設計」、「對這段程式碼進行壓力測試」、「找出盲點」或「把這段設計拆穿」。由多個審查子代理從獨立視角對變更發起挑戰。"
disable-model-invocation: true
---

# Interrogate（對抗性程式碼與設計審查）

啟動多個審查子代理（Reviewer Subagents）對程式碼變更或設計草稿進行嚴格的對抗性審查。對抗性訊號來自獨立的審查視角與模型多樣性，而非流於表面的角色扮演。最終交付成果是一份經主審官（Lead Reviewer）綜合裁決的報告。**切勿自動套用修改。**

> **強制輸出語言規範**：所有變更意圖陳述、子代理審查意見、主審裁決分類與最終報告，**一律強制使用台灣繁體中文輸出**。

## 步驟 1：界定審查範圍（Scope）

從對話脈絡中識別要審查的目標：

- 若使用者指定了特定檔案或 Diff，直接使用該範圍。
- 若位於功能分支上，執行 `git diff main...HEAD`（或適當的基底分支）取得完整變更集。
- 若使用者的訊息提及近期工作，收集相關的修改檔案。

將 Diff 或檔案內容連同審查者理解程式碼所需的周邊脈絡檔案一併打包。

## 步驟 2：確立變更意圖（Intent）

在啟動審查子代理之前，先根據使用者的訊息、Commit 訊息、PR 描述（若有的話）與程式碼，用一段清晰的話陳述本次變更的意圖。如果你對變更意圖不確定，請先詢問使用者再繼續。

## 步驟 3：啟動平行審查子代理（Spawn Reviewers）

在單次 `invoke_subagent` 呼叫中平行啟動所有審查子代理（標記為 Reviewer A、Reviewer B 等）：

| 子代理角色 | `TypeName` | 預設模型 (`Model`) |
|---|---|---|
| Reviewer A | `research` | `inherit`（或依 `.agents/rules/pstack-models.md` 之 `interrogate reviewers` 設定） |
| Reviewer B | `research` | `inherit`（或依 `.agents/rules/pstack-models.md` 之 `interrogate reviewers` 設定） |

每個審查子代理皆以唯讀模式（`TypeName: "research"`）執行。

請讀取 [`references/reviewer-prompt.md`](references/reviewer-prompt.md)，並為每一位審查子代理填入相同的範本內容：包含步驟 2 確立的變更意圖、Diff 或檔案內容、來自 [`references/rubric.md`](references/rubric.md) 的審查標準（Rubric），以及來自 [`references/code-quality-review.md`](references/code-quality-review.md) 的程式碼品質透鏡（Code Quality Lens）。請依據 **poteto-mode** 技能的 Subagents 章節配置適當的推理層級。

## 步驟 4：綜合分析（Synthesize）

當所有審查子代理回傳結果後，建立統一的全局視角。解析每位審查者的發現：將描述同一個問題但表述方式不同的項目合併，並標註是哪些審查者提出了該問題。**兩個以上審查者各自獨立提出的問題具有最高信號價值**。單一審查者提出的問題也要仔細閱讀，但依證據強度給予適當權重。記錄審查者之間的分歧：如果某位審查者標記了某個問題，而另一位審查者明確指出相反意見，這正是主審裁決的重要脈絡。

## 步驟 5：主審官裁決（Lead Judgment）

你是主審官（Lead Reviewer）——一位務實的資深工程師，而不是毫無立場的意見彙整機。請完整閱讀 [`references/lead-judgment.md`](references/lead-judgment.md) 的裁決框架，將每一個審查發現歸入以下四個分類桶（buckets）之一，並附上提出該問題的審查者標籤以及一句話裁決理由：

- **必須處理（Act on）**：在實際目標下，確實影響正確性、資安或可維護性的真實問題。在真實 PR 中屬於會阻擋合併（blocking）的問題。
- **值得考量（Consider）**：合理的顧慮，但你不確定現在處理它的效益是否大於成本。值得提請使用者注意並做取捨。
- **僅供參考（Noted）**：技術上成立，但目前無須採取行動。屬於視脈絡而定、過早最佳化，或在現階段影響極小的項目。
- **予以駁回（Dismissed）**：錯誤的判斷、吹毛求疵（nitpick），或因缺乏上下文而產生的誤判，並附上簡短駁回理由。

## 輸出格式（Output Format）

### 變更意圖（Intent）
> [步驟 2 確立的變更意圖段落]

### 審查陣容（Reviewers）
- Reviewer [標籤]: [模型/角色名稱]，共提出 [N] 項發現（每位審查者列一點）

### 必須處理（Act On）
[每一項列出：問題描述、由哪些審查者提出、為什麼這很重要。]

### 值得考量（Consider）
[每一項列出：問題描述、由哪些審查者提出、背後的取捨考量。]

### 僅供參考（Noted）
[簡短清單。]

### 予以駁回（Dismissed）
[每一項附上簡短的駁回理由。]

### 共識與分歧地圖（Agreement Map）
[各審查者在哪些地方達成共識、在哪些地方產生分歧，以及這個分佈模式告訴我們什麼。]
