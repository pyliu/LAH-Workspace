# Slack 即時團隊對話調查劇本（Slack Conversations）

## 如何搜尋與挖掘

不同環境的團隊對話 MCP 工具（如 Slack、Discord、Microsoft Teams、Mattermost，或 LAH-Workspace 的 `lah-messenger-server` SQLite 頻道訊息紀錄）結構各異。請先檢查環境中可用的對話搜尋工具與 Schema；若需要 `mcp_auth` 驗證且驗證失敗，請立即停止並將其回報為「搜尋缺口（Gap）」。

1. **限定作者與時間範圍的精準搜尋（Author-bounded search）**：搜尋該 PR 作者在 PR 合併日期前後幾天內發送的訊息。這能大幅縮小搜尋範圍，而且極常直接命中當時的設計討論。
2. **PR 連結或編號搜尋（PR URL search）**：工程師在審查或討論 PR 時，常會在頻道貼出 PR 連結。請直接搜尋該 PR 的網址（或 `/pull/<編號>`、Commit 短 SHA）。
3. **錯誤字串搜尋（Error string search）**：若目標程式碼負責處理某個特定錯誤訊息，請直接搜尋該錯誤字串——往往能直接挖出當年的線上事故討論串（Incident threads）。

## 常見陷阱（Common Pitfalls）

- **頻道歷史保存期限限制（Channel archaeology limits）**：太久以前的訊息可能因保存期限政策（Retention policy）而被清除。若在某個日期之前完全查不到任何訊息，請註明遇到了「保存期限斷崖（Retention cliff）」。
- **無法搜尋的私訊（Unsearched DMs）**：許多關鍵決策發生在無法被公開搜尋的私人訊息（DM）中。這屬於已知的搜尋限制，請誠實反映於未知事項中。
- **把隨口開玩笑當成「正式決策」**：即時聊天非常口語隨興。就算在 Commit 之前有人回了一句「哈哈乾脆直接寫死算了」，那也未必是真正的設計決策。請尋找認真權衡利弊的討論脈絡。
- **單一訊息脫離脈絡（Context collapse）**：只看單一則訊息很容易斷章取義。找到關鍵訊息時，**請務必拉取整個討論串（Thread）的前後文**。
- **驗證失敗（Auth failures）**：若對話 MCP 未通過驗證或無法連線，請直接停止並回報「即時團隊對話無法搜尋」，嚴禁憑空捏造對話發現。
