# 0013: 系統更新說明自動化生成管線與發布錨點機制

**狀態**: 已採納 (Accepted)  
**日期**: 2026-11-03  

### 決策背景與脈絡
桃園地政智慧控管與監控系統（LAH 系統）跨越 5 個獨立 Git 子專案（`LAH-API`、`LAH-FE`、`lah-messenger-server`、`lah-messenger`、`LAH-Updater`）。每次發布版本時，維運人員需向局端 NAS 與各事務所派送 `系統更新說明.txt`。  
過去此說明文件採手動人工彙整撰寫，存在以下問題：
1. **跨儲存庫人工成本高**：手動查閱 5 個 Repo 容易漏列變更或詞彙口徑不一。
2. **缺乏全域 Tag 基準**：多數子專案無打 Git Tag 習慣，無法依賴 Git Tag 做版本比對。
3. **版本與檔案易脫節**：`dist/` 被 `.gitignore` 排除，檔案易遭清理遺失；且無法追溯歷史版本。
4. **現場 SOP 缺乏焦點**：管理師無法直觀辨識「本次更新到底影響哪些關鍵服務與連接埠」。

### 決策內容與架構規範

1. **發布錨點機制 (Release Anchor)**：
   - 捨棄純依賴 Git Tag 或固定 7 天滑動窗口的方案，改採狀態化「發布錨點」策略。
   - 記錄基準檔存於 `LAH-Updater/pack/.release_anchor.json`（納入 Git 版控），記錄前次發布之時間戳、版本號及 5 大子專案之 HEAD Commit Hash。
   - 執行萃取時，精確比對「錨點 Commit 至當前 HEAD」；初次執行或無記錄時自動安全回退至最近 7 天，亦支援命令列參數覆寫。
   - **事務性落盤守護**：單獨手動執行 `generate_release_notes.py` 或啟用 `--dry-run` 時採**唯讀模式**（僅預覽不更新錨點）；唯有在 `pack.py` 完成全量套件打包、自檢無誤並成功同步至 NAS 發布目錄後，才正式更新寫入 `.release_anchor.json`，避免中途打包失敗導致歷史錨點提早失效。

2. **Commit 訊息結構化萃取與過濾白名單**：
   - **類型白名單**：收錄 `feat:`（新功能）、`fix:`（修復）、`perf:`（效能優化）、`security:`（資安加固）與 `refactor:`（核心架構重構）；自動忽略純內部瑣碎之 `chore:`, `test:`, `style:`。
   - **結構化雙層提取**：以首行 Conventional Commits Summary 作為條目主旨，並自動自 Commit Body 精煉提取「修改目的」或重點變更作為次級清單，依子專案自動分組，兼具易讀性與問題追溯脈絡。

3. **雙層式現場 SOP 與差異化維運警示**：
   - **核心底線防護**：底部維持標準 4 步驟 SOP 與 5 大通訊埠巡檢清單（Port 80, 8085, 8080, 8081, 8082），確保現場操作一致性。
   - **動態差異化焦點**：頂部【本期重大維運重點】依據本次實際有異動之子專案，自動注入「⚠️ 本期異動模組特別注意事項」（如：API 異動需重載 FastCGI 8085、前端異動需重啟 PM2 LAH-FE 8080、即時通異動需重載 WebSocket 8081）。

4. **雙軌版本化命名與模板版控**：
   - 原始模板定義於 `LAH-Updater/pack/templates/release_notes.tpl`，納入 Git 追蹤。
   - 每次產出雙軌落盤：
     - 歷史留存：`dist/<YYYYMMDD>_系統更新說明_<Version>.txt`（便於 NAS 留存查閱）。
     - 標準覆蓋：同時寫入 `dist/系統更新說明.txt` 及 `dist/patch/系統更新說明.txt`（若 patch 目錄存在），確保 `tools/updater` 之 `read_release_notes()` 優先級探測能精準命中最新版本。

5. **雙軌觸發管線 (Pipeline Integration)**：
   - 核心邏輯實作為獨立腳本 `LAH-Updater/pack/generate_release_notes.py`，支援 `--dry-run` 終端彩色預覽與 `--days` 手動覆寫。
   - 自動內嵌掛載至 `LAH-Updater/pack/pack.py` 打包流程，每次執行打包自動觸發並同步派送至 NAS 發布目錄，提供 `--no-notes` 開關供除錯略過。

### 取捨與後續影響 (Consequences / Trade-offs)
- **正面效益**：
  - 徹底免除人工跨專案翻閱 Git Log 的繁瑣工作，打包一鍵生成完整說明。
  - 現場管理師既有標準檢查底線，又能一眼看見本期需緊盯之重點服務。
  - 確保開發端、更新工具（Tauri 2）與局端 NAS 派送目錄的三方版本與內容一致性。
- **維護邊界與約束**：
  - Commit 訊息必須持續遵循全域 `AGENTS.md` 之 Conventional Commits 規範（`feat:`, `fix:`, `perf:` 等），否則萃取出的標題可能語意不全。
  - 打包發布成功後，`pack/.release_anchor.json` 會自動更新並需隨同打包變更提交至 Git。
