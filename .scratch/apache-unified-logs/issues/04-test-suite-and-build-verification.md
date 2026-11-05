# 04: 全套自動化測試執行、建置驗證與發布產物檢查

**交付內容**: 
執行全套 Rust 與 Node 單元測試、重新編譯建置維運工具鏈（`updater`、`node-portable`、`dashboard`），並驗證無警告、無破壞性變更。

**前置依賴 (Blocked by)**: 01, 02, 03

**驗收標準 (Acceptance Criteria)**:
- [ ] 執行 `updater` 模組全套測試：`cargo test --manifest-path LAH-Updater/tools/updater/src-tauri/Cargo.toml` 全數綠燈。
- [ ] 執行治理引擎測試：`node LAH-Updater/tests/test_log_lifecycle.js` 全數綠燈通過。
- [ ] 執行 `dashboard` 與 `node-portable` 之 `cargo check` / `cargo test`。
- [ ] 重新編譯產出最新執行檔：
  - `python LAH-Updater/tools/updater/build.py`
  - `python LAH-Updater/tools/node-portable/build.py`
  - `python LAH-Updater/tools/dashboard/build.py`
- [ ] 產出變更摘要與介面相容性檢查表，嚴格遵守繁體中文 Commit 規範。

**建議驗證方式**:
- `cargo test --all`
- `node LAH-Updater/tests/test_log_lifecycle.js`
