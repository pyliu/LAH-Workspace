### 視覺像素對齊 (Visual parity)

**你負責達成像素級精確等價（Pixel-exact equivalence）。基準畫面（Baseline）就是規格本身，你絕不可擅自改動它。** 等價性必須透過影像差異比對（Image diff）來驗證，而非僅憑肉眼目視。

1. **在進行任何遷移之前，先建立基準線（Baseline）：** 建置一套視覺回歸測試框架（Visual regression harness），針對當前元件（例如 `LAH-FE` 或 `lah-messenger` 中的 Vue 元件）在各種狀態下進行截圖；若是比對兩套實作（如 `lah-messenger` 桌面端與 `LAH-FE` 內嵌之 `lah-messenger-*.vue` 元件群），則同時建立目標實作的對照基準。沒有基準線，就沒有資格宣稱視覺對齊。這是具阻斷性的先決條件（Blocking prerequisite），而非事後補充項目。測試期間請確保 `./LAH-API/www/.env` 維持 `MOCK=true`，以提供穩定一致的 Mock 資料。
2. **嚴格遵守反捷徑條款（Anti-shortcut clauses）：** 禁止修改測試框架、禁止竄改基準截圖、禁止為了讓 Diff 僥倖通過而破壞元件結構。如果基準畫面看起來有誤，請立即停下並詢問使用者（可搭配 `ask_question`），切勿自行編輯基準圖。
3. **一次遷移一個元件。** 可跨多個工作樹（Worktrees）或透過 `invoke_subagent` 平行處理，但每個元件僅限單一擁有者（遵循 **separate-before-serializing-shared-state** 原則技能）。共用的基礎原語元件（Shared primitives）必須作為第一階段的阻斷性任務優先完成遷移。修改時請保留無關既有註解。
4. **透過對應的控制技能或工具（如 `chrome-devtools`），在目標表層上以影像差異比對（Image diff）逐一驗證每個元件與其基準線。** 只要像素差異不為零（Nonzero diff）即視為失敗。請深入調查像素差異（Pixel delta），並針對每個元件持續迭代（可搭配 `/loop` 或 `schedule`）直到差異值歸零為止。
5. **依單一元件或安全的批次為單位，執行 **Opening a PR**（`playbooks/opening-a-pr.md`）。**

**回覆要求（Reply）：** 已遷移的元件清單、每個元件的影像 Diff 結果、基準測試框架所在路徑，以及剩餘待處理項目。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
