### 錯誤修復（Bug fix）

**你對此任務負有全責。負責規劃、審查與驗證。** 將問題調查與程式碼修復委派給子代理（透過 `invoke_subagent`），你自己則坐鎮主導。請依據 `SKILL.md` 的「子代理調度（Subagents）」章節，為每個子代理選擇合適的模型層級（預設 `Model: "inherit"`）。

> **強制語言規範**：所有回覆、分析報告、待辦清單（Todo list）、決策紀錄、PR 描述與 Commit 訊息，**一律強制使用台灣繁體中文輸出**。在 LAH-Workspace 環境除錯時，務必確認 `./LAH-API/www/.env` 維持 `MOCK=true`，嚴禁未經授權關閉 MOCK 或對 Oracle 執行破壞性操作。

保持科學精神。每一行交付的程式碼都必須能追溯至執行期證據（Runtime evidence）。凡是抱持「說不定有幫助」心態的多餘防禦性修改（Belt-and-suspenders）都只是假設而非修復，絕不准交付。當證據推翻某個假設時，請立即還原由該假設所驅動的一切修改。只交付當前證據所支持的最小幅度變更，多一行都不要。

1. 透過對應的控制技能或工具（見 `SKILL.md`「不可妥協的鐵則」，例如透過 `chrome-devtools` 操控瀏覽器／Electron，或透過終端指令測試 API／CLI），在相同的介面上親自重現問題——即使某個除錯或插樁協定寫著「請要求使用者重現」也一樣。唯有當你已經將控制工具推到極限仍無法觸及目標，且能給出明確、具體的理由時，才允許請使用者協助重現。若問題無法直接重現，請合成觸發條件、收緊邊界條件，或加入日誌插樁（Instrumentation）直到問題浮現為止。
2. 以二元搜尋法（Binary-search）收斂根本原因。先列出所有候選假設，接著逐一排除直到只剩一個假設存活。針對受影響的子系統執行 **how**（`../how/SKILL.md`）技能，並透過 **why**（`../why/SKILL.md`）技能清查退步歷史（Regression history），以此作為建立假設的起點。每一輪測試都選擇能切掉最大剩餘問題空間的分割點，取得執行期證據並排除錯誤假設。當程式狀態不明確時，請加入插樁或日誌並在程式實際執行時讀取輸出，切勿盲目猜測。面對漫長或頑固的追查，可搭配 `schedule` 工具或自主循環推進。在進入步驟 3 的 `architect` / `interrogate` 平行扇出之前，必須先以執行期證據確認存活假設的具體*作用機制（Mechanism）*。
3. 規劃修復方案。若修復跨越了函式邊界（或跨越 `LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger` 介面契約），請先執行 **architect**（`../architect/SKILL.md`）技能。接著透過 `invoke_subagent` 將實作委派給子代理（使用配置的 `bug-fix` 模型或預設 `Model: "inherit"`），並給予明確限縮的修改範圍。
4. 在相同的介面上進行驗證。確保原本失敗的重現步驟現在能夠順利通過（且通過對應子專案的語法／Lint 檢查，如 `php -l`、`node -c`、`yarn lint`）。「結果不明確（Inconclusive）」或在錯誤介面上測試都不算通過，必須明確標記出來。請記住：單元測試只能證明特定分支的行為，無法單獨證明整個系統的 Bug 已經消失。
5. 妥善安排 Commit 順序，讓「會失敗的重現測試（Failing repro）」在 Git 歷史中落於「修復程式碼（Fix）」之前。當該 Bug 具備低成本的本機測試路徑時，請參考 **tdd**（`../tdd/SKILL.md`）技能採行「測試先紅後綠」的節奏；若撰寫該測試成本極高、高度依賴外部整合或邊界不清，則可略過。
   這正是 **sequence-verifiable-units**（`../principle-sequence-verifiable-units/SKILL.md`）原則技能的標準典範：先提交失敗測試，再疊上修復提交。
6. 執行 **開立 PR（Opening a PR）**（`playbooks/opening-a-pr.md`）。

**回覆（Reply，強制使用台灣繁體中文）：** 損壞的現象、根本原因、修復內容、驗證方式。請原封不動貼上修復前失敗、修復後通過的重現測試輸出（Repro output）。
