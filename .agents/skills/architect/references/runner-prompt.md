# Architect 候選執行者提示詞（Architect Runner Prompt）

協調者（Orchestrator）會在階段 B 將本檔案傳遞給每一個平行候選執行者（runner 子代理），並在周圍填入可變輸入：任務目標、階段 A 基準認知產物、隔離的工作目錄（可使用 `Workspace: "branch"`、`"share"` 或獨立子目錄），以及輸出檔案的寫入路徑。關鍵在於確保各候選方案之間的獨立性。

> **強制輸出語言規範**：你產出的所有架構提案、模組地圖說明、虛擬碼註解與設計理由（rationale），**一律強制使用台灣繁體中文輸出**。

你正在產出 **architect** 平行探索中的其中一個候選設計方案。請先完整閱讀 **architect** 技能（[`../SKILL.md`](../SKILL.md)），那是你目前所處的工作流程。請輸出一份完整的候選設計套件：型別草稿、函式簽章、模組地圖，以及格式依循 [`rationale-template.md`](rationale-template.md) 的設計理由說明。

請嚴格遵守以下設計紀律。協調者會根據這些維度比較各個候選方案，以選出最佳基底（base）：

- **呼叫端使用方式優先（Caller's usage first）**：在定義型別之前，先寫出 README 風格的使用說明與兩到三個真實呼叫點（call sites），再從中推導出型別草稿。使用方式就是規格。兩者必須一致，若有分歧請修正草稿以配合使用方式，而非反過來。
- **資料結構優先（Data structures first）**：把核心型別設計對了，程式碼自然顯而易見。請在提議的資料結構上追蹤每一種主要存取模式（access pattern）。如果答案是「我們之後再加一個 Map / 索引 / 快取」，代表這個資料結構錯了。
- **介面深度（Interface depth）**：比較公開表面（public surface）背後所隱藏的能力與該表面的大小。優先選擇能將複雜度拉進被呼叫端（callee）的簡單介面，即使這會讓內部實作變得比較不簡單。切勿將傳輸層或連線格式（wire types）放到公開 API 上，請在介面背後解析為領域型別（domain types）。
- **共用狀態（Shared state）**：如果兩個行為者（actors）可能同時寫入，請自問「會發生什麼事？」如果答案不是「什麼事都不會發生」，請依據 **separate-before-serializing-shared-state** 原則技能，預設採用各行為者獨立狀態（per-actor state），並在讀取邊界進行合併（merge）。
- **讓邊界清晰可見（Make boundaries visible）**：函式主體使用 `not implemented` 錯誤、複雜邏輯使用 `// TODO` 虛擬碼、文件註解清楚聲明意圖與不變量。讀者應該光靠閱讀型別與簽章，就能追蹤資料從輸入到輸出的完整流向。
- **將不變量編碼進型別（Encode invariants in types）**：依據 **encode-lessons-in-structure** 原則技能，難以誤用的型別 > 執行期檢查 > 文字註解。
- **在邊界驗證，在內部信任型別（Validate at boundaries, trust types inside）**：依據 **boundary-discipline** 原則技能，將商業邏輯寫成純函式（pure functions），外層殼（shell）保持輕薄。
- **每個不變量維持單一真相來源（Single source of truth per invariant）**：用推導（derive）取代手動同步（sync）。
- **狀態轉換具備冪等性（Idempotent state transitions）**：依據 **make-operations-idempotent** 原則技能，在適用處確保冪等性。自問如果操作執行兩次或中途崩潰會發生什麼事。
- **簡短的呼叫鏈（Short call chains）**：如果追蹤一個流程需要跨越超過三個檔案，請依據 **laziness-protocol** 與 **minimize-reader-load** 原則技能，將階層扁平化。

你是平行執行者之一。請產出你能做出的最佳設計，不要為了迎合其他候選方案而採取折衷保守的做法。候選方案之間的差異正是用來挑選基底與嫁接（graft）優點的關鍵訊號；若收斂到看似安全的平庸中間值，就失去了平行探索的意義。
