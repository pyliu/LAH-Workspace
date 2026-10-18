# 程式碼考古學（Code Archaeology：git + 儲存庫內部紀錄）

## 此資料來源包含什麼

- **Commit 歷史紀錄**：提交訊息（在 LAH-Workspace 中包含繁體中文修改目的、修改項目與相容性說明）、日期、作者與 Diff 內容
- **PR 描述、審查留言與討論串**（透過 `gh` CLI 取得）
- **行內程式碼註解**：包含 `TODO`、`FIXME`、棄用說明（Deprecation notes）與防禦性說明註解
- **架構決策紀錄（ADRs）** 與專案文件（如 `AGENTS.md`、`README.md`、`docs/`）
- **測試案例（Tests）**：測試名稱與斷言（Assertions）往往直接編碼了當初促使某項修改誕生的邊界情況（Edge cases）
- **在同一個 Commit 中一併被修改的關聯檔案（Co-change signal）**
- 儲存庫內的 `CHANGELOG` 與版本發布說明
- Commit 訊息與 PR 內文中提及的議題或工單 ID

這是最值得信賴、與程式碼直接綁定、且最完整的保證來源。所有曾經進入過儲存庫的變更軌跡都保存在這裡（注意：在 LAH-Workspace 中，`LAH-API`、`LAH-FE`、`lah-messenger-server` 與 `lah-messenger` 為各自獨立的 Git 儲存庫，執行 `git` 指令時請務必指定正確的子專案工作目錄 `Cwd`）。

## 如何搜尋與挖掘

從種子 Commit 清單向外展開挖掘：

```bash
# 追蹤包含檔案重新命名在內的完整歷史
git log --follow --oneline -- <file>

# 十字鎬搜尋（Pickaxe）：找出「新增」或「刪除」了這段確切字串的 Commit
git log -S '<exact_string_from_code>' -- <file>

# 使用正規表示式搜尋變更內容（Patch regex）：
git log -G '<regex>' -- <file>

# 查出每一行是由誰、在什麼時候寫下的
git blame -L <start>,<end> <file>

# 檢視單一 Commit 的完整說明與 Diff
git show <hash>

# 檢視兩個時間點／版本之間影響此檔案的所有 Commit 與 Patch
git log <old>..<new> -p -- <file>
```

搜尋程式碼以外的儲存庫內文件與測試線索：

```bash
# 搜尋專案內的架構決策或設計說明文件
rg -l -i 'architecture|decision|設計|架構' --glob '*.md'

# 搜尋目標檔案附近的 TODO、FIXME、HACK、NOTE 註解
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>

# 搜尋提及該符號的相關測試檔案
rg -l '<symbol>' --glob '*test*'
```
