# 02: HTTP Loopback 高速主通道、雙重本機防禦與自動降級（雙通道完整切片）

**交付內容**:
在 PHP 7.4 站台新增常駐於 Apache `mod_php7` 的內部橋接端點 `LAH-API/www/api/ora_bridge.php`，並於 PHP 8.5 `OraDB` 實作「HTTP Loopback 優先 ➔ CLI `proc_open` 同請求無感降級」之雙通道調度。完成本票券後，正式環境查詢 Oracle 9i 可免除每次 `proc_open` 啟動 `php.exe` 與載入 `oci.dll` 的 OS 行程開銷，同時由本機 IP 檢查與 HMAC-SHA256 請求簽章確保端點無法被外部偽造呼叫。

**對應規格與文件**:
- 規格書：[specs/php85-oracle9i-dual-channel-bridge.md](../../../specs/php85-oracle9i-dual-channel-bridge.md)（3.1、3.3、AC-2、AC-5、AC-7）
- 架構決策：[docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md](../../../docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md)

**涉及儲存庫與檔案**:
- `LAH-API/www/api/ora_bridge.php`（新增）
- `LAH-API/API/include/OraDB.class.php`
- `LAH-API/API/tests/Unit/Query/OraDBTest.php`

**前置依賴 (Blocked by)**: `01`（依賴 `01` 建立之 Binary-Transparent Envelope 格式與 `OraDB` 橋接基礎架構）

**驗收標準 (Acceptance Criteria)**:
- [x] **AC-2.1 (`www/api/ora_bridge.php` 雙重本機防禦與 PHP 7.3 相容性)**：
  - 嚴格符合 PHP 7.3 語法（不使用 PHP 7.4+ / 8.x 語法）。
  - 雙重本機防禦（Dual Loopback Guard）：驗證 `REMOTE_ADDR` 必須為 `127.0.0.1` 或 `::1` 且無 `HTTP_X_FORWARDED_FOR` / `HTTP_CLIENT_IP` 標頭（否則回傳 `HTTP 403`）；驗證 `X-LAH-Bridge-Signature` 與 `hash_hmac('sha256', $raw_body, $secret)` 相符（採用 `hash_equals`，否則回傳 `HTTP 403`）。
  - 完整支援與 `ora_cli_worker.php` 相同之 Binary-Transparent Envelope（`action: "ping"` 與 `action: "query"`、`sql_b64`、`rows_b64`、`stmt_type`、`affected_rows`、UTF-8/Base64 安全錯誤結構）。
- [x] **AC-2.2 (`OraDB` HTTP Loopback 主通道與自動降級)**：
  - `OraDB::execute()` 在無原生 `oci8` 時，優先以 `127.0.0.1` 呼叫 `ora_bridge.php` 並附上 `X-LAH-Bridge-Signature`。
  - 當 HTTP Loopback 連線逾時、拒絕連線或回傳 `HTTP 404`（如舊版 `www.zip` 尚未包含 `ora_bridge.php`）時，於**同一個 HTTP Request 內**自動降級改由 `proc_open` CLI Worker 完成該次查詢，且在同次 Request 生命週期內標記暫停重試 HTTP Loopback 以避免重複等待逾時。
- [x] **AC-2.3 (單元測試覆蓋)**：於 `OraDBTest.php` 驗證 HMAC 簽章產生一致性，以及當 HTTP Loopback 端點不可達時自動降級至 CLI Worker 並正確取回資料列之行為。

**建議驗證方式**:
1. 語法檢查：
   - `php -l LAH-API/www/api/ora_bridge.php`
   - `php -l LAH-API/API/include/OraDB.class.php`
2. 單元與整合測試：
   - 於 `LAH-API/API/` 執行 `.\run_tests.bat`。
