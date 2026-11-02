# 02: 跨專案 Git Commit 萃取與結構化過濾引擎 (Git Log Extraction & Parsing Engine)

**交付內容**: 實作 Python 核心引擎之 Git Commit 提取與過濾模組，具備跨 5 大子專案檢索能力，能依據發布錨點精準過濾非業務瑣碎提交，並提取結構化主旨與修改目的。

**前置依賴 (Blocked by)**: 01 (版面模板定義與錨點初始狀態)

**驗收標準 (Acceptance Criteria)**:
- [ ] 於 `LAH-Updater/pack/generate_release_notes.py` 實作：
  - `resolve_repo_dirs()`: 自動定位工作區 5 大子專案目錄（`LAH-API`, `LAH-FE`, `lah-messenger-server`, `lah-messenger`, `LAH-Updater`）。
  - `load_anchor()` / `save_anchor()`: 讀寫 `.release_anchor.json`。
  - `get_commits_for_repo()`: 支援以 `anchor..HEAD` 或 `--days N` 執行 `git log`，取得 Hash、Author、Date、Subject 與 Body。
  - `parse_commit()`: 依 Conventional Commits 正規表示式匹配 `feat:`, `fix:`, `perf:`, `security:`, `refactor:`，過濾 `chore:`, `test:`, `style:`。
  - `extract_commit_purpose()`: 自 Commit Body 中萃取 `- 修改目的：` 或關鍵說明前 2 行。
- [ ] 於 `LAH-Updater/tests/test_generate_release_notes.py` 建立測試套件，涵蓋 Commit 匹配、白名單過濾、Body 目的解析與錨點遺失時回退至近 7 天之邏輯。
- [ ] 單元測試全數通過（`pytest` 或 `python -m unittest`）。

**建議驗證方式**:
- 執行 `python -m unittest LAH-Updater/tests/test_generate_release_notes.py` 驗證解析與過濾邏輯。
- 檢查各專案的 commit 提取結果無中斷崩潰。
