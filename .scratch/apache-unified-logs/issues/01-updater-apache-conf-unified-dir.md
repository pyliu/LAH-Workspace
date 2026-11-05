# 01: 更新工具 Apache 組態日誌路徑重寫至統一日誌儲存庫 (logs/apache)

**交付內容**: 
於 `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs` 擴充組態自癒邏輯，在執行安裝與更新時，自動將 `httpd.conf` 內之 `ErrorLog` 與 `CustomLog` rotatelogs 管道日誌路徑重寫至 `<安裝根目錄>/logs/apache/`，並自動建立該目錄。

**前置依賴 (Blocked by)**: 無（可立即開始）

**驗收標準 (Acceptance Criteria)**:
- [ ] `configure_apache_mod_php7` 與 `configure_apache_fcgi_proxy` 支援比對舊版 `Apache24/logs` 與新版 `logs/apache`，正確轉寫為 `<根目錄>/logs/apache/`。
- [ ] 執行組態重寫前，主動確保目標目錄 `<根目錄>\logs\apache` 存在（若無則自動建立）。
- [ ] 新增 Rust 單元測試 `test_configure_apache_mod_php7_rewrites_logs_to_unified_apache_dir` 並通過 `cargo test --lib`。

**建議驗證方式**:
- `cargo test --manifest-path LAH-Updater/tools/updater/src-tauri/Cargo.toml test_configure_apache_mod_php7_rewrites_logs_to_unified_apache_dir`
