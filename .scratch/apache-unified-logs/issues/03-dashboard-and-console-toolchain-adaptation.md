# 03: 管理儀表板與便攜終端工具鏈路徑適配

**交付內容**: 
於 `LAH-Updater/tools/dashboard/src-tauri/src/logs.rs` 與 `pm2.rs`，以及 `LAH-Updater/tools/node-portable/src-tauri/src/console.rs` 適配全新 `logs/apache/` 目錄，支援日誌檢視器優先探測與快捷維運一鍵壓縮輪替。

**前置依賴 (Blocked by)**: 01, 02

**驗收標準 (Acceptance Criteria)**:
- [ ] `logs.rs` 之 `list_available_logs` 優先探測 `logs/apache/` 下之 `access.*.log` 與 `error.*.log`；若不存在則回退相容舊版 `Apache24/logs/`。
- [ ] `dashboard/src-tauri/src/pm2.rs` 之 `pm2_trigger_logrotate` 搜尋目錄清單納入 `root_dir.join("logs").join("apache")`。
- [ ] `node-portable/src-tauri/src/console.rs` 之 `trigger_logrotate_now` 搜尋目錄清單同步增補 `root_dir.join("logs").join("apache")`。
- [ ] 執行 `cargo check` 確保 `dashboard` 與 `node-portable` 編譯無警告無錯誤。

**建議驗證方式**:
- `cargo check --manifest-path LAH-Updater/tools/dashboard/src-tauri/Cargo.toml`
- `cargo check --manifest-path LAH-Updater/tools/node-portable/src-tauri/Cargo.toml`
