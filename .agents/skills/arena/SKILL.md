---
name: arena
description: "針對同一任務平行啟動 N 個候選子代理（Subagent），挑選一個最佳基底，並將落選方案中最強的部分嫁接進去。適用於 /arena、「arena 這個」、「丟進競技場」，或當非瑣碎產物若只嘗試一次容易鎖死錯誤形狀時。"
disable-model-invocation: true
---

# Arena（平行競技場）

在啟動任何動作之前，先建立一份待辦清單（todolist），每個階段對應一個項目（定框 Frame、扇出 Fan out、交叉評審 Cross-judge、挑選基底 Pick、嫁接優點 Graft、驗證 Verify）。

> **強制輸出語言規範**：所有評分標準、候選方案分析、交叉評審結論、綜合說明與最終回覆，**一律強制使用台灣繁體中文輸出**。

## 階段 A：定框（Frame）

每個候選者都會收到相同的提示詞，因此提示詞就是契約。

1. 明確定義每個候選者要產出的產物（artifact）。
2. 制定評分標準（rubric）：針對**這項**任務定義 3 到 6 個具體可評分的成功準則。這是階段 D 挑選基底的工具；候選者只會看到任務本身，不會看到評分標準。
3. 挑選執行者（runners）。在 Antigravity 環境中，使用 `invoke_subagent`（一般或實作任務使用 `TypeName: "self"`，唯讀探索使用 `TypeName: "research"`）。模型預設使用 `Model: "inherit"`（若 `.agents/rules/pstack-models.md` 有定義 `arena runners`，則依其設定對應模型層級）。當競技場涵蓋多個設計方向時，可啟動更多執行者；當工作屬於生成導向（generation-bound）而非判斷敏感（judgment-sensitive）時，可重複使用相同模型啟動 N 個平行子代理。請依據 **poteto-mode** 技能的 Subagents 章節配置適當的推理層級。
4. 依據 **separate-before-serializing-shared-state** 原則技能，為每個候選者提供獨立的輸出位置（若需要隔離工作區可使用 `Workspace: "branch"` 或 `"share"`，或寫入獨立目錄如 `<appDataDir>/brain/<conversation-id>/scratch/arena-<slug>/candidate-<n>/`）。

## 階段 B：扇出（Fan out）

在單次 `invoke_subagent` 呼叫中同時啟動所有 N 個平行子代理，傳入任務說明、共用基準認知（grounding）的路徑、各自的獨立輸出路徑，並指示子代理產出目標產物以及一份簡短的設計理由（點出它考量過哪些替代方案、淘汰了什麼及其原因）。

若某個候選者未產出結果，請直接以 N-1 個候選方案繼續推進，並記錄該棄權（dropout）情況。

## 階段 C：交叉評審（Cross-judge）

當階段 B 的所有候選者完成後，啟動一個唯讀評審子代理（`invoke_subagent`，`TypeName: "research"`，`Model: "inherit"` 或依 `.agents/rules/pstack-models.md` 的 `arena cross-judge pool` 配置）。評審子代理會看到評分標準（rubric）與以路徑標籤標示的各個候選方案，逐項為每個準則打分，並推薦一個基底方案及理由。它可以與你在階段 D 的閱讀平行進行。切勿在候選者仍在寫入時就提前啟動評審。

## 階段 D：挑選基底（Pick a base）

在挑選之前，從頭到尾完整閱讀每一個候選方案。依據評分標準逐項打分，而非憑整體感覺，並與交叉評審的結果進行比對。若對基底方案達成共識，即可確認選擇；若出現分歧，代表你們其中一方有偏見，或是評分標準本身不夠明確——請在決定前仔細閱讀雙方的理由。

請挑選未來維護者最容易擴充且不會破壞不變量（invariants）的基底方案。當兩個方案難分高下時，依據 **laziness-protocol** 原則技能，優先選擇邊界更乾淨或 API 更小的方案。

## 階段 E：嫁接優點（Graft）

再次檢視每個落選的候選方案，找出值得移植到基底方案中的亮點（通常每個候選方案只有一兩處，而非大部分）。請依據 **redesign-from-first-principles** 原則技能，親手將每個嫁接點融合進去，確保最終結果在單一心智模型下保持連貫一致。切勿機械式地剪貼拼湊。

如果各個候選方案不約而同收斂到同一種形狀，代表存在強烈共識：請記錄這一點並直接交付該共識形狀，無須嫁接。如果各方案極度分歧，代表階段 A 的規格定義不足：請重新定框（reframe）並重新執行，而非將分歧硬湊成平均值。

## 階段 F：驗證（Verify）

依據 **prove-it-works** 原則技能，像對待任何其他產出一樣嚴格驗證綜合後的產物。若驗證發現了競技場遺漏的問題，代表階段 A 有誤（請重新定框並重跑）或是某個候選方案其實有抓到但你在嫁接時漏掉了（請退回階段 E）。切勿粉飾問題。

## 產出（Outputs）

一份綜合後的最終產物，並附上一份簡短的綜合說明（synthesis note）：點出選定的基底方案及其原因、交叉評審的判定結果、每個嫁接項目的來源候選方案、淘汰了哪些項目及其原因、任何收斂或棄權情況，以及最終驗證結果。
