# 03: 橋接健康度探針（ver.php）與 LAH-Updater 雙軌環境路徑對齊（可觀測性與部署切片）

**交付內容**:
在 PHP 8.5 `LAH-API/API/ver.php` 端點輸出不含本機敏感路徑的 `oci8_bridge` 健康度探針資訊，讓維運人員與前端管理頁能一眼識別目前橋接通道（`native`、`http_loopback`、`cli_proc_open` 或 `unavailable`）與 Worker `oci8` 就緒狀態；同時修正 `LAH-Updater` 內 `ensure_lah_api_ecosystem` 產生的 PM2 `ecosystem.config.js` 範本，補齊 `C:\Tools\instantclient_11_2` 多路徑自動探索。

**對應規格與文件**:
- 規格書：[specs/php85-oracle9i-dual-channel-bridge.md](../../../specs/php85-oracle9i-dual-channel-bridge.md)（P4、4.2、4.3、AC-6）
- 架構決策：[docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md](../../../docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md)

**涉及儲存庫與檔案**:
- `LAH-API/API/include/OraDB.class.php`（新增 `probeBridgeStatus()` 靜態方法）
- `LAH-API/API/ver.php`
- `LAH-API/API/tests/Integration/VerEndpointTest.php`（或 `OraDBTest.php`）
- `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs`

**前置依賴 (Blocked by)**: `01`, `02`（需完整探測 HTTP Loopback 與 CLI Worker 雙通道就緒狀態）

**驗收標準 (Acceptance Criteria)**:
- [x] **AC-3.1 (`ver.php` 輸出 `oci8_bridge` 探針物件)**：
  - `LAH-API/API/ver.php` 回傳 JSON 內新增 `oci8_bridge` 區塊，包含 `enabled` (bool)、`ready` (bool)、`mode` (`"native"` | `"http_loopback"` | `"cli_proc_open"` | `"unavailable"`) 與 `worker_oci8` (bool)。
  - 探針結果嚴格去敏，不洩漏伺服器絕對路徑、環境變數或密鑰。
  - 原有 `version`、`php_version`、`extensions`（含 `oci8` 布林欄位）維持 100% 向下相容。
- [x] **AC-3.2 (`LAH-Updater` PM2 `ecosystem.config.js` 路徑對齊)**：
  - 修改 `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs` 的 `ensure_lah_api_ecosystem` 函式，使產出的 `ecosystem.config.js` 與 `LAH-API/API/ecosystem.config.js` 一致，自動依序探索 `<rootDir>/instantclient_11_2`、`C:\Tools\instantclient_11_2` 與 `C:\AppServ\instantclient_11_2` 並注入 `PATH`。

**建議驗證方式**:
1. PHP 語法與測試檢查：
   - `php -l LAH-API/API/ver.php`
   - `php -l LAH-API/API/include/OraDB.class.php`
   - 於 `LAH-API/API/` 執行 `.\run_tests.bat`。
2. Rust 編譯檢查（`LAH-Updater`）：
   - 於 `LAH-Updater/tools/updater/src-tauri` 執行 `cargo check` 確認無編譯錯誤或警告。
