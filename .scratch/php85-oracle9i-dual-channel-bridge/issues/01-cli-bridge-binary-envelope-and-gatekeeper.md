# 01: CLI 橋接二進位透明信封、環境自癒與 OraDBWrapper 放行（曳光彈基底切片）

**交付內容**:
打通 PHP 8.5 (`LAH-API/API/`) 透過本機 PHP 7.4 CLI Worker 存取 Oracle 9i 的端對端垂直鏈路。完成本票券後，即使尚未部署新版 `www.zip`，PHP 8.5 所有透過 `OraDBWrapper` 取用資料庫的 10 大業務類別（`Query`、`MOICAS`、`StatsOracle`、`XCase` 等）即可穿透橋接守門員，安全執行內含 `CP950`（Big5）中文字面量與中文欄位別名的 `SELECT` 與 DML（`INSERT`/`UPDATE`/`DELETE`）語句，並正確取得資料列與 `affected_rows`。

**對應規格與文件**:
- 規格書：[specs/php85-oracle9i-dual-channel-bridge.md](../../../specs/php85-oracle9i-dual-channel-bridge.md)（P1、P2、P3、AC-1、AC-3、AC-4、AC-7）
- 架構決策：[docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md](../../../docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md)

**涉及儲存庫與檔案**:
- `LAH-API/API/include/ora_cli_worker.php`
- `LAH-API/API/include/OraDB.class.php`
- `LAH-API/API/include/OraDBWrapper.class.php`
- `LAH-API/API/tests/Unit/Query/OraDBTest.php`
- `LAH-API/API/tests/Unit/Query/OraDBWrapperTest.php`

**前置依賴 (Blocked by)**: 無（可立即開始）

**驗收標準 (Acceptance Criteria)**:
- [x] **AC-1.1 (`ora_cli_worker.php` 二進位透明信封)**：支援 `action: "ping"` 與 `action: "query"`；優先解碼 `sql_b64` 與 `binds` 中的 `b64: true` 參數（向下相容舊版 `sql`），並將查詢結果之欄位鍵名與字串值封裝為 `rows_b64`、回傳 `stmt_type` 與 `affected_rows`（`oci_num_rows($stid)`），且 `oci_error()` 錯誤訊息經 Base64（`message_b64`、`sqltext_b64`）與 UTF-8 淨化後保證 `json_encode` 不因 `CP950` 位元組失敗。
- [x] **AC-1.2 (`OraDB` CLI 環境自癒與信封編解碼)**：`OraDB` 新增 `resolvePhp7CliPath()`、`resolvePhp7IniPath()`、`resolveInstantClientDir()` 與 `isDriverOrBridgeAvailable()`；於 CLI `proc_open` 呼叫時改用陣列形式 `[$php7_cli, '-c', $php7_ini, $worker_script]`，並為子行程組裝乾淨的 `PATH`（將 `instantclient_11_2` 與 `php7` 置於最前方）；完整解碼 `rows_b64` 並將 `affected_rows` 寫入 `$this->numrows`。
- [x] **AC-1.3 (`OraDBWrapper` 橋接守門員與空指標防護)**：`OraDBWrapper::isDBReachable()` 改呼叫 `OraDB::isDriverOrBridgeAvailable()` 取代 `function_exists('oci_connect')`；`OraDBWrapper::getError()` 加上空指標防護（`$this->db ? $this->db->getError() : false`）。
- [x] **AC-1.4 (單元測試覆蓋)**：更新並擴充 `OraDBTest.php` 與 `OraDBWrapperTest.php`，驗證 `CP950` 位元組 SQL 與欄位別名之 Base64 往返、DML `affected_rows` 映射，以及 `OraDBWrapper::getError()` 在 `$this->db === null` 時的安全行為。

**建議驗證方式**:
1. 語法檢查：
   - `php -l LAH-API/API/include/ora_cli_worker.php`
   - `php -l LAH-API/API/include/OraDB.class.php`
   - `php -l LAH-API/API/include/OraDBWrapper.class.php`
2. 單元與整合測試：
   - 於 `LAH-API/API/` 執行 `.\run_tests.bat`（確認 `MOCK=true` 下所有單元與整合測試全數通過）。
