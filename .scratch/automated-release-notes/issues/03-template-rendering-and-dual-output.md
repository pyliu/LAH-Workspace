# 03: 模板渲染、差異化警示與雙軌輸出 (Template Rendering, Alerts & Dual-Path Output)

**交付內容**: 完成 `generate_release_notes.py` 之模板渲染引擎，依據實際異動子專案自動注入差異化維運警示，提供 `--dry-run` 終端彩色預覽，並能將結果雙軌落盤至 `dist/` 與 `dist/patch/`。

**前置依賴 (Blocked by)**: 02 (跨專案 Git Commit 萃取與結構化過濾引擎)

**驗收標準 (Acceptance Criteria)**:
- [ ] 於 `LAH-Updater/pack/generate_release_notes.py` 實作：
  - `build_alert_section()`: 依異動子專案動態產生警示（包含 API 時警示 FastCGI 8085，包含 FE 時警示 PM2 8080，包含即時通時警示 WebSocket 8081）。
  - `render_release_notes()`: 讀取 `release_notes.tpl` 並替換變數，輸出寬度 80 字元之對齊排版，採 UTF-8 CRLF 編碼。
  - `write_dual_release_notes()`: 產出 `dist/<YYYYMMDD>_系統更新說明_<Version>.txt`、覆蓋 `dist/系統更新說明.txt`，且若 `dist/patch/` 目錄存在則同步寫入 `dist/patch/系統更新說明.txt`。
  - CLI 介面：支援 `--dry-run`（彩色列印於終端、嚴格唯讀不寫檔案、不改動錨點）、`--days`、`--since`、`--output-dir`。
- [ ] 於 `tests/test_generate_release_notes.py` 新增渲染、差異化警示與 `--dry-run` 唯讀防護之自動化單元測試。
- [ ] 終端執行 `python LAH-Updater/pack/generate_release_notes.py --dry-run` 能成功輸出完整排版之更新說明。

**建議驗證方式**:
- 執行 `python LAH-Updater/pack/generate_release_notes.py --dry-run` 檢查終端彩色輸出與格式對齊。
- 執行單元測試 `python -m unittest LAH-Updater/tests/test_generate_release_notes.py` 確認 100% 通過。
