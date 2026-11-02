# 04: pack.py 打包整合與事務性錨點更新 (pack.py Pipeline & Transactional Anchor Commit)

**交付內容**: 將更新說明生成模組無縫掛載進 `pack.py` 打包流程末尾，支援 `--no-notes` 開關，並實作「僅在打包完成且 NAS 同步成功後才正式寫入發布錨點」的事務性守護。

**前置依賴 (Blocked by)**: 03 (模板渲染、差異化警示與雙軌輸出)

**驗收標準 (Acceptance Criteria)**:
- [ ] 於 `LAH-Updater/pack/pack.py` 中引入 `generate_release_notes` 模組：
  - 新增 CLI 參數 `--no-notes`（預設為 `False`，傳入時跳過更新說明生成）。
  - 在套件打包與驗證通過後、呼叫 `sync_artifacts_to_release_dir` 之前，自動調用產出最新更新說明至 `dist/`。
  - 在 `sync_artifacts_to_release_dir` 將打包產物成功同步至 NAS 發布資料夾後，呼叫 `commit_anchor()` 正式將當前 5 大 Repo 的 HEAD Commit Hash 寫入 `.release_anchor.json`。
- [ ] 若打包或 NAS 同步中途發生異常中斷，`.release_anchor.json` 保持原狀不被污染。
- [ ] 執行 `python pack/pack.py --api-only`，驗證更新說明成功產出、隨同 API 壓縮包同步至發布目錄，且錨點成功推進。

**建議驗證方式**:
- 執行 `python pack/pack.py --api-only` 檢驗打包流程輸出與日誌。
- 檢查 `pack/.release_anchor.json` 是否在發布完成後記錄了正確的 Commit Hash。
- 執行 `python pack/pack.py --api-only --no-notes` 驗證略過開關正常。
