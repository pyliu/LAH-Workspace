### 撰寫或修改技能（Authoring or modifying a skill）

**你對該技能的語氣與規範精準度負有全責。**

> **強制語言規範**：所有回覆、分析報告、待辦清單（Todo list）、決策紀錄、PR 描述與 Commit 訊息，**一律強制使用台灣繁體中文輸出**。技能的 `name` 欄位、檔案路徑連結與跨技能引用識別碼（kebab-case）則保留英文，以便系統檢索與跳轉。

1. 遵循 Antigravity 技能規範（參考 `agy-customizations` 技能與既有 `.agents/skills/` 架構）撰寫或更新 `SKILL.md` 檔案。
2. 驗證技能完整性：YAML frontmatter 必須包含 `name` 與 `description`，所有引用的檔案（如 `references/*`、`playbooks/*`、`scripts/*`）確實存在，且跨技能連結（如 `../<name>/SKILL.md`）皆能正確解析。
3. 若屬於結構化變更，請執行對應測試案例；若屬於主觀散文調整則可略過。
4. 執行 **開立 PR（Opening a PR）**（`playbooks/opening-a-pr.md`）。

當拿不定主意時，直接刪除贅字。僅保留能夠實際改變決策的文字。直接指示 Agent 該做什麼，略過冗長的背景說教；唯有在缺乏解釋會導致規則令人困惑時才加上說明。讓語氣與適用範疇相匹配。依據 **encode-lessons-in-structure**（`../principle-encode-lessons-in-structure/SKILL.md`）原則技能，優先指向結構化來源（型別定義、README、`AGENTS.md`、設定檔）。透過相對路徑委派給其他技能，切勿重複抄寫規則。若發現某個反覆遇到的工作流尚未被收錄 → 提議建立一個新技能。

**回覆（Reply，強制使用台灣繁體中文）：** 技能摘要、關鍵設計決策、驗證紀錄。
