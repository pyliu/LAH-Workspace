---
name: architect
description: "在撰寫程式碼之前先勾勒型別、簽章與模組結構，並在實作填充期間持續參與把關。適用於 /architect、「設計這個架構」、「規劃這個設計」，或任何直接寫程式碼會鎖死錯誤形狀的非瑣碎工作。"
disable-model-invocation: true
---

# Architect（架構設計）

以 `not implemented`（未實作）主體與虛擬碼（pseudocode）勾勒型別、函式簽章、類別形狀與模組邊界。綜合多個模型視角後，再依據選定的草稿填入實際程式碼。

> **強制輸出語言規範**：所有架構分析、設計草稿說明、取捨評估、審查報告與最終回覆，**一律強制使用台灣繁體中文輸出**（程式碼識別字、型別名稱與簽章維持專案既有語言規範）。

## 啟動

在開始之前，先建立一份待辦清單（todolist），每個階段對應一個項目：

1. 建立基準認知（Ground）
2. 勾勒草稿（Sketch）
3. 達成共識（Agree）
4. 依草稿實作（Implement）
5. 廢棄重來（Scrap）

## 階段 A：建立問題基準認知（Ground the problem）

對新程式碼觸及的每個系統建立真實的心智模型。針對相關子系統執行 **how** 技能。光唸出檔案名稱不叫建立基準認知，必須產出 `how` 所規範的架構說明。若設計會重新定義所有權（ownership）或分層（layering），請同時對既有形狀執行 **why** 技能，讓背後的設計理由成為明確的約束條件，而非猜測。

僅在工作屬於真正的全新開發（greenfield）且無須整合周邊系統時，才可跳過階段 A。

## 階段 B：勾勒草稿（Sketch）

帶著設計草稿任務與階段 A 的基準認知產物，執行 **arena** 技能。將 [`references/runner-prompt.md`](references/runner-prompt.md) 作為每個候選執行者（runner）的提示詞傳入。

在 Antigravity 環境中，使用 `invoke_subagent`（`TypeName: "self"`，預設 `Model: "inherit"`，若 `.agents/rules/pstack-models.md` 有定義 `architect runners` 則依其設定）啟動平行子代理（Subagent）。

**設計兩次（Design it twice）**。在進行綜合（synthesis）之前，要求至少產出兩個結構截然不同的候選方案，即使第一個方案看起來已經足夠。這是將 **exhaust-the-design-space** 原則技能具體落實——必須是整體架構形狀的替代方案，而非同一個形狀內的局部修補。

在進行綜合之前，先對照 [`references/design-red-flags.md`](references/design-red-flags.md) 篩選每個候選方案。假設下一位貢獻者是一個只能看到自己所開啟檔案、直接複製最近範例、並採取能通過編譯的最短路徑的代理（Agent）。優先選擇「從單一檔案看起來正確的修改，對整個專案儲存庫而言也是正確的」那種設計。

比較可行候選方案的**介面深度（interface depth）**。優先選擇能將更多複雜度隱藏在更小、更簡單的公開表面（public surface）背後的設計。豐富的介面能集中能力，而非將能力分散到各個分層中，藉此維持簡短的呼叫鏈。

Arena 會回傳一份綜合後的設計套件。其綜合決策會填入設計理由（rationale）中的「綜合決策（Synthesis decision）」章節。

## 階段 C：達成共識（Agree，選擇性啟用）

預設行為：直接採用綜合後的設計進入實作階段，不設人工檢查點（checkpoint）。

當呼叫者明確要求時才啟用檢查點，例如：「/architect 並附上檢查點」、「實作前先停下來給我看」或類似指示。此時請呈現綜合後的設計並暫停等待簽核。

無論哪種方式，綜合設計本身都可以作為獨立的 Commit 先行提交，即 **foundational-thinking** 原則技能中的「先建骨架（scaffold first）」模式。在填入實作期間發生有計畫且範圍受控的破壞是可以接受的（依據 **outcome-oriented-execution** 原則技能）。若要在實作前對設計施加對抗性壓力測試，請對綜合草稿執行 **interrogate** 技能。

若使用者對架構形狀提出異議（無論是在檢查點或事後），請將其視為階段 A 的新證據。在撰寫更多程式碼之前，重新建立基準認知並重新執行階段 B。

## 階段 D：依據草稿實作（Implement against the sketch）

將 `not implemented` 主體替換為真實程式碼，將虛擬碼替換為實際邏輯。綜合草稿即為契約。偏離草稿是必須浮現出來的訊號，而非默默吸收的摩擦。如果某個函式需要草稿未預見的參數，請先自問：是草稿錯了、遺漏了需求，還是實作過度擴張了？

## 階段 E：當架構錯誤時果斷廢棄（Scrap when the architecture is wrong）

如果實作過程不斷產生草稿無法吸收的摩擦，請直接把草稿丟掉。依據 **redesign-from-first-principles** 與 **fix-root-causes** 原則技能，切勿在錯誤的設計上硬釘修補程式（bolt fixes）。

訊號在於**模式（pattern）**，而非單一案例。常見徵兆包括：

- 相同形狀的權宜解法（workaround）在無關的程式碼中反覆出現。
- 多個無關的邊界情況（edge cases）全都需要特例分支（special-case branches）處理。
- 型別需要逃生門（如 `any`、強制轉型、實務上總是會有值的選填欄位）才能通過編譯。
- 當草稿明明宣稱狀態不共用時，卻出現「我們需要加鎖（lock）」的反射動作。
- 呼叫端必須知道抽象層的內部規則才能正確使用它。
- 在實作過程中，出現兩個以上獨立但形狀相同的階段 D 偏離。

請運用判斷力。少數幾個邊界情況並不足以否定一個架構；有些問題本質上就是複雜的。資料本身的複雜度不等於設計的複雜度。

當你決定廢棄重來時：

1. 對目前已建構的部分重新執行 **how** 技能。
2. 依據 **redesign-from-first-principles**，將新發現的約束條件視為第一天就已知的前提，重新進行設計。
3. 依據 **subtract-before-you-add** 原則技能，先做減法再做加法。新草稿在成長之前，應該比舊草稿更精簡。
4. 回到階段 B 並重新執行 **arena**。

## 產出（Outputs）

先撰寫呼叫端的使用方式（caller's usage），再從中推導出型別草稿。小型變更產出單一檔案（包含新型別與簽章）；大型工作則產出模組地圖（module map）加上型別定義。設計理由（rationale）會一併附上，格式依循 [`references/rationale-template.md`](references/rationale-template.md)，其中包含使用方式草稿與綜合決策。
