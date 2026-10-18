### 唯讀調查（Investigation）

**你對最終解答負有全責。負責規劃、路由與撰寫報告。**

> **強制語言規範**：所有回覆、調查分析報告、待辦清單（Todo list）與架構權衡表格，**一律強制使用台灣繁體中文輸出**。提及檔案與程式碼符號時，務必附上可點擊的 `[名稱](file:///...)` 連結。

調查類型的請求屬於唯讀（Read-only）性質。它們的交付物是附帶實證引用的解釋報告或決策建議，而非修改程式碼。

1. 透過 **how**（`../how/SKILL.md`）技能進行路由調查。若問題涉及歷史演進或設計動機（「為什麼當初這樣寫」），則同時透過 **why**（`../why/SKILL.md`）技能進行路由。
2. 吞吐量檢查點（Throughput checkpoint）保持單行即可：`吞吐量檢查點：不適用，唯讀調查（throughput checkpoint: n/a, read-only investigation）`。
3. 產出符合 `how` 結構的調查報告（概覽 Overview ／ 核心概念 Key Concepts ／ 運作機制 How It Works ／ 檔案與模組位置 Where Things Live ／ 常見陷阱與注意事項 Gotchas），若請求是在多個替代方案間做出決策，則產出附帶權衡比較表（Tradeoffs table）的具體建議。
4. 對最終回覆套用 **unslop**（`../unslop/SKILL.md`）技能，確保文字精煉無贅字。

除非該次調查是為了緊接著進行程式碼修改，否則不開立 PR、不啟動 Babysit，也不執行 `architect`。若後續確實需要修改程式碼，請先將調查結論交還給使用者，再重新路由至 **Bug fix**（`playbooks/bug-fix.md`）或 **Feature**（`playbooks/feature.md`）劇本。

**回覆（Reply，強制使用台灣繁體中文）：** 調查報告內容。針對「我們確定嗎？（are we sure?）」類型的提問，請給出你真實的專業判斷與具體理由。若使用者的前提假設有誤，請坦率提出反駁（參見 `SKILL.md` 的「自治權限（Autonomy）」章節）。
