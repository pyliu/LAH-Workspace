# 功能規格書：LAH 全系統更新說明自動化生成管線

## 1. 問題陳述 (Problem Statement)
桃園地政智慧控管與監控系統（LAH）跨越 5 個獨立 Git 子專案（`LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger`、`LAH-Updater`）。每次發布版本時，維運工程師需向局端 NAS 與各地政事務所派送 `系統更新說明.txt`，供自動更新工具（Tauri 2）內嵌視窗讀取與現場管理師查閱。

過去此文件採人工手動彙整，存在以下痛點：
1. **跨儲存庫人工彙整成本高**：每次改版需手動翻閱 5 個 Repo 的 Git Commit 與 CHANGELOG，極易漏列變更或用語不一致。
2. **缺乏全域 Tag 基準**：多數子專案並無常態 Git Tag 習慣，無法依賴 Git Tag 做版本比對；而固定 7 天滑動窗口則易在頻繁發布時重複列出、或在間隔較長時漏列。
3. **版本與檔案易脫節**：`dist/` 位在 `.gitignore` 內，手動撰寫之文字檔易遭 `git clean` 誤刪，且無法比對歷期歷史說明。
4. **現場 SOP 缺乏焦點**：管理師無法直觀辨識「本次更新到底改了什麼、需要特別重啟與檢驗哪些服務」。

---

## 2. 解決方案 (Solution)
建立「**全系統更新說明自動化生成管線**」：
1. **發布錨點機制 (Release Anchor)**：在 `LAH-Updater/pack/.release_anchor.json` 記錄前次發布之 Commit Hash 與時間戳。每次產出時精準萃取「前次錨點至當前 HEAD」的 Commit 差異，無錨點記錄時自動安全回退至近 7 天。
2. **結構化 Commit 萃取與白名單過濾**：自動解析 5 大 Repo 之 Conventional Commits，收錄 `feat`, `fix`, `perf`, `security`, `refactor`，過濾內部瑣碎之 `chore`, `test`, `style`；提取首行摘要為條目主旨，並自動自 Commit Body 提取修改目的。
3. **雙層式現場 SOP 與差異化維運警示**：底部維持固定 4 步驟 SOP 與 5 大通訊埠巡檢清單（Port 80, 8085, 8080, 8081, 8082）；頂部【本期重大維運重點】依本次實際異動子專案，動態注入專屬模組維運警示（如 FastCGI 8085、PM2 8080）。
4. **雙軌版本化命名與模板版控**：版面範本置於 `LAH-Updater/pack/templates/release_notes.tpl` 納入 Git 追蹤；產出歷史存檔 `dist/<YYYYMMDD>_系統更新說明_<Version>.txt` 供 NAS 留存，並同時覆蓋 `dist/系統更新說明.txt` 與 `dist/patch/系統更新說明.txt`。
5. **雙軌觸發與事務性落盤**：獨立腳本 `generate_release_notes.py` 支援 `--dry-run` 終端預覽；`pack.py` 打包流程自動調用，唯有全套打包成功且完成 NAS 同步後才更新 `.release_anchor.json`。

---

## 3. 使用者故事列表 (User Stories)
1. **US1 (自動打包連動)**：作為維運工程師，我想要在執行 `pack.py` 打包時自動產出最新系統更新說明，以便於一鍵完成打包與文件發布，免除人工漏發或格式錯誤。
2. **US2 (終端獨立預覽)**：作為維運工程師，我想要能單獨執行 `generate_release_notes.py --dry-run`，以便於在正式發布前於終端直接彩色預覽與校驗更新說明文字，而不變更任何檔案或錨點。
3. **US3 (時間範圍彈性覆寫)**：作為維運工程師，我想要能透過 `--days <天數>` 或 `--since <日期>` 覆寫起點，以便於因應特殊需求重產指定週期的更新說明。
4. **US4 (差異化維運焦點)**：作為現場地政事務所管理師，我想要在更新說明頂部看到針對本次實際異動模組的「⚠️ 特別注意事項」（如 FastCGI 8085 重載、PM2 8080 重啟），以便於在數秒內確認本次關鍵警戒範圍。
5. **US5 (標準 SOP 安全防護網)**：作為現場地政事務所管理師，我想要在說明底部保有完整的標準 4 步驟 SOP 與 5 大通訊埠檢驗清單，以便於依循手冊完成通盤巡檢，維持作業一致性。
6. **US6 (NAS 歷史留存與相容性)**：作為局端發布管理者，我想要在 NAS 分享目錄看到保留日期版號的歷史說明檔（如 `20261103_系統更新說明_v1.9.9.txt`），同時更新工具自動載入標準 `系統更新說明.txt`，以便於回溯版本並保持程式相容。

---

## 4. 實作決策 (Implementation Decisions)

### 4.1 檔案與目錄結構
```text
LAH-Workspace/
├── specs/
│   └── automated-release-notes.md            # 本規格書
├── docs/adr/
│   └── 0013-automated-release-notes-and-release-anchoring.md  # 對應 ADR
└── LAH-Updater/
    ├── pack/
    │   ├── .release_anchor.json              # 發布錨點基準檔 (Git 追蹤)
    │   ├── templates/
    │   │   └── release_notes.tpl             # 說明檔版面範本 (Git 追蹤)
    │   ├── generate_release_notes.py         # 核心生成引擎 (新增)
    │   └── pack.py                           # 打包整合呼叫與錨點更新 (增補)
    ├── tests/
    │   └── test_generate_release_notes.py     # 自動化測試套件 (新增)
    └── dist/
        ├── 系統更新說明.txt                   # 標準工作副本 (覆蓋)
        ├── patch/
        │   └── 系統更新說明.txt               # patch 目錄探測副本 (同步覆蓋)
        └── 20261103_系統更新說明_v1.9.9.txt    # 歷史留存快照 (新增)
```

### 4.2 發布錨點資料結構 (`pack/.release_anchor.json`)
```json
{
  "version": "1.9.9",
  "released_at": "2026-11-03T00:00:00+08:00",
  "anchors": {
    "LAH-API": "a1b2c3d...",
    "LAH-FE": "461ad9b...",
    "lah-messenger-server": "e4f5g6h...",
    "lah-messenger": "7i8j9k0...",
    "LAH-Updater": "16e0d44..."
  }
}
```

### 4.3 Commit 過濾與解析規格
1. **掃描目標**：工作區 5 大子專案目錄（`LAH-API`, `LAH-FE`, `lah-messenger-server`, `lah-messenger`, `LAH-Updater`）。
2. **區間界定**：
   - 若錨點存在且對應 repo 包含該 commit：執行 `git log <anchor>..HEAD`。
   - 若錨點不存在或指定 `--days N`：執行 `git log --since="N days ago" HEAD`。
3. **分類解析器 (Conventional Commits Parser)**：
   - 匹配模式：`^(feat|fix|perf|security|refactor)(\(.*\))?:\s*(.+)$`。
   - 忽略模式：`^(chore|test|style)(\(.*\))?:\s*.*$`。
   - Body 目的擷取：自 Commit Body 尋找以 `- 修改目的：`、`- 目的：` 或首個非空說明段落，擷取最多 2 行核心說明。
4. **模組分群**：
   - 後端 RESTful API 核心 (`LAH-API`)
   - 智慧監控管理前端 (`LAH-FE`)
   - 即時通伺服端與桌面客戶端 (`lah-messenger-server` / `lah-messenger`)
   - 維運部署工具庫 (`LAH-Updater`)

### 4.4 差異化維運警示映射規則 (Alert Rules)
當本次變更之子專案集合包含以下模組時，自動於【本期重大維運重點】注入專屬警示標籤：
* **包含 `LAH-API`**：
  * 標註：「⚠️ 【後端核心更新】涉及 API 業務邏輯或設定異動，請務必確認 Apache 2.4 (Port 80) 反向代理正常，並確認 PHP 8.5 FastCGI (Port 8085) 已重載就緒。」
* **包含 `LAH-FE`**：
  * 標註：「⚠️ 【前端監控更新】涉及 Web 介面或前端排程更新，請確認 PM2 進程 `LAH-FE` 與 `LAH-SCHEDULER` 正常運作 (Port 8080)。」
* **包含 `lah-messenger-server` 或 `lah-messenger`**：
  * 標註：「⚠️ 【即時通訊更新】涉及通訊協定或長連線服務，請確認 PM2 進程 `LAH-WSS` (Port 8081 WebSocket) 與 Port 8082 (HTTP 附件) 正常監聽。」
* **包含 `LAH-Updater`**：
  * 標註：「⚠️ 【維運工具庫更新】維運管理工具已升級，請以最新版管理儀表板或自動更新工具執行巡檢與部署。」

### 4.5 CLI 指令介面規格
```bash
# 1. 獨立測試預覽 (唯讀模式，終端彩色列印，不產生檔案，不改動錨點)
python LAH-Updater/pack/generate_release_notes.py --dry-run

# 2. 獨立手動覆寫產出 (覆寫指定天數)
python LAH-Updater/pack/generate_release_notes.py --days 14

# 3. 整合至 pack.py (常規打包自動執行，唯有發布成功後才更新錨點)
python LAH-Updater/pack/pack.py

# 4. pack.py 跳過更新說明
python LAH-Updater/pack/pack.py --no-notes
```

---

## 5. 測試與驗證決策 (Testing Decisions)

### 5.1 自動化單元測試 (`tests/test_generate_release_notes.py`)
1. **Commit 格式解析測試**：驗證 `feat:`, `fix:`, `perf:`, `security:`, `refactor:` 能被正確歸類，`chore:`, `test:`, `style:` 確實被過濾。
2. **Body 目的提取測試**：驗證多行 Commit Message 中的 `- 修改目的：` 區塊能精確提取為次級清單，去除多餘換行。
3. **錨點回退測試**：模擬不存在 `.release_anchor.json` 之情境，驗證自動安全回退至 `--days 7` 邏輯。
4. **差異化警示測試**：模擬僅修改 `LAH-FE` 時，輸出文字僅出現前端警示，不出現後端 FastCGI 警示；模擬全量子專案修改時，顯示全模組警示。
5. **Dry-Run 唯讀保護測試**：驗證傳入 `--dry-run` 時，磁碟上的 `.release_anchor.json` 與 `dist/` 檔案完全未被寫入或變更。

### 5.2 實機整合驗證接縫 (Integration Verification)
1. **終端渲染檢查**：執行 `python pack/generate_release_notes.py --dry-run` 檢查排版邊界（80 字元寬度）、中文等寬換行與 ASCII 分隔線。
2. **全流程打包驗證**：執行 `python pack/pack.py --api-only`，驗證：
   - `dist/系統更新說明.txt` 已更新且包含 API 專屬警示。
   - `sync_artifacts_to_release_dir` 成功將文字檔複製至 NAS 發布資料夾。
   - `.release_anchor.json` 之 Commit Hash 已更新為最新狀態。
3. **更新工具相容性驗證**：啟動 `智慧控管與監控系統 - 自動安裝與更新工具.exe`，點擊「📖 更新說明」，驗證 Tauri 視窗流暢載入最新內容，無亂碼，字體排版對齊。

---

## 6. 不在範圍內 (Out of Scope)
1. **不自動向外部 Git 遠端推送 Git Tag**：不更動現有版控流程，錨點純由內部 JSON 記錄。
2. **不修改子專案業務邏輯**：僅讀取 Git Log 與 package.json，完全不更動任何子專案代碼。
3. **不更動 Tauri 後端讀取架構**：Tauri Rust 後端 [`read_release_notes`](file:///c:/Temp/DEV/LAH-Workspace/LAH-Updater/tools/updater/src-tauri/src/lib.rs#L86-L135) 原生邏輯保持原狀，維持完全向下相容。

---

## 7. 補充備註 (Further Notes)
* **編碼與換行**：輸出檔案一律採用 **UTF-8 無 BOM**，換行符號採標準 Windows **CRLF (`\r\n`)**，確保現場使用 Windows 傳統記事本（Notepad）或專業編輯器皆能完美排版呈現。
* **詞彙一致性**：嚴格依循 [GLOSSARY.md](file:///c:/Temp/DEV/LAH-Workspace/GLOSSARY.md) 定義，使用「事務所」、「操作員」、「業務核心樞紐」、「維運部署工具」等規範詞彙。
