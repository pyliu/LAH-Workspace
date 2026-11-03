# 0014: PHP 8.5 對接 Oracle 9i 之雙通道 OCI8 橋接與全二進位透明封裝架構

**狀態**: 已採納 (Accepted)  
**日期**: 2026-11-03  

### 決策背景與脈絡
桃園地政智慧控管系統之後端核心 `LAH-API` 採用「PHP 7.4 (`www/`) 與 PHP 8.5 (`API/`) 雙軌並行」架構。由於各地政事務所核心資料庫仍為 **Oracle 9i (`9.2`)**，而 Oracle 官方自 Instant Client 12c 起移除對 9i 伺服器之連線支援（會拋出 `ORA-03134`），且 PHP 8.5 官方預編譯之 `php_oci8_12c.dll` 強依賴 Oracle 12c 新增之 C 符號 `OCIStmtGetNextResult`，無法直接掛載唯一支援 Oracle 9i 的 `instantclient_11_2`。

在先前初步實作之單一 CLI 橋接模式中，線上實機切換至 PHP 8.5 軌道時發生無法抓回 Oracle 資料之阻斷問題，經追查有四大根因：
1. **外層守門員誤判**：`OraDBWrapper::isDBReachable()` 硬編碼檢查 `function_exists('oci_connect')`，在未直接載入 `oci8` 的 PHP 8.5 環境下永遠回傳 `false`，導致依賴 `OraDBWrapper` 的 10 大業務類別（`Query`、`MOICAS`、`StatsOracle`、`XCase` 等）在建立 `OraDB` 前即被攔截。
2. **`CP950` 雙位元組內碼引發 `json_encode` 崩潰**：地政資料庫採 `US7ASCII` 儲存 `CP950` (Big5) 內碼，業務程式碼大量在 `$sql` 內直接拼接 `CP950` 字串或使用中文欄位別名；原橋接層未對 `sql` 本身、回傳欄位鍵名（Column Keys）及錯誤訊息（`sqltext`）進行 Base64 編碼，導致 `json_encode()` 因 `JSON_ERROR_UTF8` 回傳 `false`。
3. **CLI 子程序環境與啟動開銷**：每次 `execute()` 透過 `proc_open` 衍生 `php7\php.exe` 時，未顯式指定 `-c php7\php.ini`，且繼承自 PM2 (`lah-api-v85`) 的 `PATH` 將 `php85` 置於 `php7` 之前，加上部分主機之 `instantclient_11_2` 位於 `C:\Tools\instantclient_11_2`，易造成 CLI 子程序無法載入 `oci8_11g`；同時高頻率 `CreateProcess` 亦帶來額外延遲。
4. **缺乏線上可觀測性**：`/LAH-API/ver.php` 僅顯示 PHP 8.5 原生 `oci8: false`，無法反映橋接層是否就緒。

### 決策內容與架構規範

1. **雙通道 OCI8 橋接架構 (Dual-Channel OCI8 Bridge)**：
   - **通道 1（主通道 - Apache `mod_php7` HTTP Loopback）**：於 `LAH-API/www/api/ora_bridge.php` 建立本機內部橋接端點。當 PHP 8.5 之 `OraDB::execute()` 處於橋接模式時，優先透過 `127.0.0.1` HTTP Loopback 呼叫 Apache 已長駐記憶體且驗證無誤之 `mod_php7` 執行 SQL，省去 Windows 重複建立行程與載入 DLL 之開銷，並 100% 繼承線上既有 PHP 7.4 的 OCI8 連線能力。
   - **通道 2（備援通道 - 環境隔離之 PHP 7.4 CLI Worker）**：若本機 HTTP Loopback 無法連通或回傳 404（例如 CLI 排程環境、本機無 Apache 開發環境，或現場僅先更新 `LAH-API.zip` 尚未更新 `www.zip`），`OraDB` 於同請求週期內自動無縫退回（Fallback）至 `proc_open` 執行 `API/include/ora_cli_worker.php`。
   - **CLI 環境變數與路徑強化**：CLI 備援通道自動從安裝根目錄動態探測 `php7\php.exe`、`php7\php.ini` 與 `instantclient_11_2`（含 `<根目錄>\instantclient_11_2` 與 `C:\Tools\instantclient_11_2`），顯式帶入 `-c <php7/php.ini>`，並重組子程序 `PATH` 將 `instantclient_11_2` 與 `php7` 置於最前端以隔離 `php85` DLL 干擾。

2. **雙重本機鎖資安防護 (Dual Loopback Guard)**：
   - `www/api/ora_bridge.php` 嚴格限制僅接受實體 `$_SERVER['REMOTE_ADDR']` 為 `127.0.0.1` 或 `::1` 之請求，且若存在 `HTTP_X_FORWARDED_FOR` 或 `HTTP_CLIENT_IP` 等代理轉發標頭一律拒絕（回傳 `403 Forbidden`）。
   - 請求端（PHP 8.5）與接收端（PHP 7.4）基於兩軌共用之單一真實來源設定檔 `www/.env` 衍生內部共用金鑰，對請求 Payload 簽署並驗證 `X-LAH-Bridge-Signature`（HMAC-SHA256），未通過簽章驗證者一律拒絕執行。

3. **全二進位透明封裝協定 (Binary-Transparent Envelope)**：
   - 橋接層（無論 HTTP Loopback 或 CLI Worker）一律不介入業務字元集轉碼，維持 100% 原始位元組透明傳輸：
     - **Request Envelope**：`sql` 語句（`sql_b64`）與所有字串型態之綁定參數（`binds`）一律經 `base64_encode` 後再行 JSON 封裝。
     - **Response Envelope**：`SELECT` 查詢回傳之每一列，其**欄位名稱（Column Key）**與**字串欄位值（Column Value）**均以 `base64_encode` 封裝；非 `SELECT` 語句一併回傳 `stmt_type` 與 `affected_rows`（`oci_num_rows`）。
     - **Error Envelope**：當 `oci_connect`、`oci_parse` 或 `oci_execute` 失敗時，對 `oci_error()` 中可能含有 `CP950` 位元組之 `message` 與 `sqltext` 進行 Base64 封裝與 UTF-8 安全轉碼保護，確保錯誤 JSON 永不因編碼問題而遺失。

4. **連線能力守門員與可觀測性探針 (Reachability Gatekeeper & Observability)**：
   - 於 `OraDB` 提供 `OraDB::isDriverOrBridgeAvailable()`，並更新 `OraDBWrapper::isDBReachable()` 改以此方法取代舊有的 `function_exists('oci_connect')` 檢查，同時修補 `OraDBWrapper::getError()` 在 `$this->db === null` 時之空指標安全防護。
   - 擴充 `/LAH-API/ver.php` 回傳去敏化之 `oci8_bridge` 狀態區塊（包含 `enabled`, `ready`, `mode`, `worker_oci8`），供前端「API 雙軌切換器」與維運人員於線上部署後即時確認 PHP 8.5 ↔ PHP 7.4 OCI8 橋接健康度。

### 取捨與後續影響 (Consequences / Trade-offs)
- **正面效益**：
  - 徹底打通 `OraDBWrapper` 轄下 10 大業務類別與含 `CP950` 內碼 SQL 在 PHP 8.5 下的查詢能力，且所有 30+ 支業務 API 程式碼與 `:bv_` 綁定邏輯完全不需改動。
  - 結合 Apache `mod_php7` Loopback 的低延遲、零環境落差優勢，與 CLI `proc_open` 的免 Apache 獨立執行韌性。
  - 當未來地政資料庫正式升級至 Oracle 12c/19c 並於 PHP 8.5 啟用原生 `oci8` 時，`OraDB` 將自動切回原生直連，橋接層自動退場，達成零成本平滑演進。
- **維護邊界與約束**：
  - 新增 `www/api/ora_bridge.php` 屬於雙軌基礎設施端點，隨 `www.zip` 派送；在現場尚未更新 `www.zip` 前，`LAH-API.zip` 會自動透過 CLI 備援通道運作，具備前後向部署相容性。
