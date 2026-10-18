---
name: how
description: "適用於「X 是如何運作的（how does X work）」、修改前的程式碼走讀，以及程式碼放置位置／所有權／分層問題（「這應該放在哪裡」、「哪個套件擁有這個」、「放在這一層對嗎」）。負責解釋子系統架構、執行期流程與建立心智模型。若要探究歷史動機請改用 why。"
disable-model-invocation: true
---

# How（子系統運作原理與架構走讀）

探索程式碼庫以回答「X 是如何運作的？」這類問題。產出適合資深工程師剛接手某個子系統時閱讀的架構說明——深度足以建立可運作的心智模型，但又不會繁瑣到像把原始碼逐行加上註解。

> **強制輸出語言規範**：所有探索發現、架構說明、流程圖標籤與最終呈現內容，**一律強制使用台灣繁體中文輸出**。

在 Antigravity 環境中，每一次啟動子代理皆使用 `invoke_subagent`（`TypeName: "research"`，唯讀探索模式）。模型預設使用 `Model: "inherit"`（若 `.agents/rules/pstack-models.md` 有定義 `how explorer` 與 `how explainer`，則依其設定對應模型層級）。請依據 **poteto-mode** 技能的 Subagents 章節配置適當的推理層級。

## 1. 評估複雜度（Assess complexity）

如果問題範圍不夠明確，請先陳述你的解讀並直接開始探索；使用者隨時可以引導修正方向。

- **簡單（Simple）**（單一模組、小型工具函式、或狹窄問題如「函式 X 是怎麼運作的」）：不需要啟動探索者（explorers）。直接使用 `invoke_subagent`（`TypeName: "research"`）啟動一個講解者（explainer），在單一流程中完成探索與說明（使用 [`references/explainer-prompt.md`](references/explainer-prompt.md) 範本，省略探索者發現章節），接著直接跳至步驟 4。
- **複雜（Complex）**（跨越多個檔案或服務的子系統、跨領域功能、或完整的架構總覽）：進入步驟 2。

若有疑問，優先採取簡單路徑。

## 2. 平行探索（Explore，僅限複雜問題）

將問題拆解為 2 到 4 個探索切角（angles），每個切角對應子系統的一個獨立切片。在單次 `invoke_subagent` 呼叫中平行啟動所有探索者子代理（`TypeName: "research"`），每個子代理皆填入 [`references/explorer-prompt.md`](references/explorer-prompt.md) 範本與其負責的探索切角。

## 3. 綜合解說（Synthesize，僅限複雜問題）

當所有探索者子代理皆回傳結果後，使用 `invoke_subagent`（`TypeName: "research"`）啟動一個講解者子代理，填入 [`references/explainer-prompt.md`](references/explainer-prompt.md) 範本與所有探索者的調查發現。

## 4. 呈現結果（Present）

呈現講解者的輸出內容。你可以為了清晰度或結合當前對話脈絡進行微幅潤飾，但切勿大幅改寫其內容。

## 輸出格式（Output format）

架構說明採用 [`references/explainer-prompt.md`](references/explainer-prompt.md) 中定義的章節結構（不適用的章節可直接省略）：總覽（Overview）、核心概念（Key Concepts）、運作原理（How It Works）、程式碼位置（Where Things Live）、常見陷阱（Gotchas）。
