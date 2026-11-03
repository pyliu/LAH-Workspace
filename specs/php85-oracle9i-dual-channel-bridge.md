# 功能規格書：PHP 8.5 對接 Oracle 9i 雙通道 OCI8 橋接與全二進位透明封裝架構

## 1. 問題陳述 (Problem Statement)
桃園地政智慧控管與監控系統（LAH 系統）之後端核心樞紐（`LAH-API`）正處於「PHP 7.4 (`www/`) 與 PHP 8.5 (`API/`) 雙軌並行」的現代化遷移階段。由於各地政事務所核心資料庫仍為 **Oracle 9i (`9.2`)**，而 Oracle 官方自 Instant Client 12c 起移除對 9i 伺服器之連線支援（會拋出 `ORA-03134`），且 PHP 8.5 Windows 官方預編譯之 `php_oci8_12c.dll` 強依賴 Oracle 12c 才新增之 C 函式 `OCIStmtGetNextResult`，無法直接載入唯一支援 Oracle 9i 的 `instantclient_11_2`。

在現場主機關閉模擬模式（`MOCK=false`）並從前端智慧管控系統（`LAH-FE`）透過「API 雙軌切換器」切換至 PHP 8.5 新軌（`/LAH-API/api/*.php`）進行實機連線測試時，發生無法透過 PHP 7.4 橋接層（Bridge）抓回 Oracle 9i 業務資料之阻斷問題。經程式碼靜態追蹤，定位出以下四大痛點：

1. **連線能力守門員誤判攔截（P0 必死阻斷）**：
   [`API/include/OraDBWrapper.class.php`](file:///c:/Temp/DEV/LAH-Workspace/LAH-API/API/include/OraDBWrapper.class.php#L14-L25) 的 `isDBReachable()` 硬編碼檢查 `if (!function_exists('oci_connect')) return false;`。由於 PHP 8.5 本身不載入 `oci8`，該條件永遠為真，導致依賴 `OraDBWrapper` 的 10 大核心業務類別（`Query`, `MOICAS`, `StatsOracle`, `XCase`, `MOIADM`, `MOICAD`, `MOICAT`, `MOIEXP`, `MOIPRC`, `MOISMS`）在建立 `OraDB` 實例前即被全數短路攔截，且呼叫 `getError()` 時會因 `$this->db` 為 `null` 觸發 Fatal Error。
2. **`CP950` (Big5) 雙位元組內碼引發 `json_encode` 序列化崩潰（P0 必死阻斷）**：
   地政 Oracle 9i 資料庫採 `US7ASCII` 儲存 `CP950` (Big5) 位元組，業務類別在呼叫 `$db->parse($sql)` 前會將中文常數轉為 `CP950` 直接嵌入 `$sql` 字串（全專案逾 100 處），且部分 SQL 含有中文欄位別名或於 `oci_error()` 錯誤訊息中帶回 `CP950` 之 `sqltext`。原橋接層僅對 `bind` 參數做 Base64 編碼，未對 `sql` 本身、回傳欄位鍵名（Column Keys）及錯誤訊息做 Base64 保護，導致 `json_encode()` 因 `JSON_ERROR_UTF8` 直接回傳 `false`，Worker 收到空輸入而崩潰。
3. **單一 CLI 子程序通道之環境落差與建立行程開銷（P1 環境與效能隱患）**：
   原實作每次呼叫 `OraDB::execute()` 皆透過 `proc_open` 衍生全新的 `php7\php.exe` CLI 子程序，不僅缺乏 `-c <php7\php.ini>` 顯式綁定、繼承了 PM2 將 `php85` 置於 `php7` 之前的 `PATH` 環境變數（易引發同名 DLL 衝突或漏載 `C:\Tools\instantclient_11_2`），且未能優先複用線上 Apache 2.4 (`mod_php7`) 已長駐記憶體且驗證無誤之 OCI8 執行環境。
4. **線上環境缺乏橋接健康度探針（P2 可觀測性盲區）**：
   [`/LAH-API/ver.php`](file:///c:/Temp/DEV/LAH-Workspace/LAH-API/API/ver.php) 僅回傳 PHP 8.5 原生 `extensions.oci8: false`，前端雙軌切換器與維運人員在現場部署後無法一眼判斷底層 PHP 7.4 OCI8 橋接是否就緒。

---

## 2. 解決方案 (Solution)
依據 [ADR 0014](file:///c:/Temp/DEV/LAH-Workspace/docs/adr/0014-php85-oracle9i-dual-channel-bridge-architecture.md) 與 [GLOSSARY.md](file:///c:/Temp/DEV/LAH-Workspace/GLOSSARY.md#L159-L179) 定義之領域模型，建構具備高相容性、高安全性與可觀測性的「**雙通道 OCI8 橋接與全二進位透明封裝架構**」：

1. **雙通道 OCI8 橋接 (Dual-Channel OCI8 Bridge)**：
   - **主通道（Apache `mod_php7` HTTP Loopback）**：新增 [`LAH-API/www/api/ora_bridge.php`](file:///c:/Temp/DEV/LAH-Workspace/LAH-API/www/api/ora_bridge.php)，讓 PHP 8.5 之 `OraDB` 優先透過本機迴路 `http://127.0.0.1/api/ora_bridge.php` 借用 Apache 已長駐的 `mod_php7` 執行 SQL，零 `CreateProcess` 開銷且 100% 繼承線上既有 PHP 7.4 OCI8 環境。
   - **備援通道（環境變數隔離之 PHP 7.4 CLI Worker）**：當本機 HTTP Loopback 無法連通或回傳 404（如無 Apache 的 CLI 排程、開發機，或現場僅更新 `LAH-API.zip` 尚未更新 `www.zip`），於同請求內自動無縫退回（Fallback）至強化版 CLI `proc_open`（動態探測 `<安裝根目錄>\php7\php.exe`、顯式帶入 `-c <php7\php.ini>`，並重組子程序 `PATH` 將 `instantclient_11_2` 與 `php7` 置頂）。
2. **雙重本機鎖 (Dual Loopback Guard)**：
   `www/api/ora_bridge.php` 同時強制驗證「實體 `REMOTE_ADDR` 必須為 `127.0.0.1` 或 `::1` 且無任何 Proxy 轉發標頭」與「基於共用 `www/.env` 金鑰計算之 `X-LAH-Bridge-Signature` (HMAC-SHA256) 請求簽章」，杜絕外部或未授權程序濫用。
3. **全二進位透明封裝 (Binary-Transparent Envelope)**：
   將請求端之 `sql` (`sql_b64`)、字串 `binds`，以及回應端之**欄位名稱（Column Keys）**、**字串欄位值（Column Values）**與 `oci_error()` 的 `message` / `sqltext` 全面以 Base64 編碼封裝傳輸；同時支援回傳非 `SELECT` 語句之 `stmt_type` 與 `affected_rows`（`oci_num_rows`），徹底根除 `CP950` 引發的 `JSON_ERROR_UTF8`。
4. **連線能力守門員與健康度探針 (Reachability Gatekeeper & Probe)**：
   於 `OraDB` 新增 `OraDB::isDriverOrBridgeAvailable()` 並串接至 `OraDBWrapper::isDBReachable()`，修補 `OraDBWrapper::getError()` 空指標防護；同時於 `/LAH-API/ver.php` 擴充去敏化之 `oci8_bridge` 狀態區塊。

---

## 3. 使用者故事列表 (User Stories)
1. **US1 (前端無縫切換 PHP 8.5 查詢 Oracle 9i)**：作為一名操作員或地政事務所管理師，我想要在 `LAH-FE` 將 API 軌道切換為「PHP 8.5 新軌」時，所有地政業務查詢（綜合查詢、登記/測量案件管控、即時統計看板、跨所案件等）皆能正常從 Oracle 9i 抓回資料，以便於在不中斷日常業務的前提下完成 PHP 8.5 現代化升級驗證。
2. **US2 (`CP950` 內碼與造字零失真傳輸)**：作為一名操作員，我想要在查詢含有中文條件、中文欄位別名或特殊造字的地政案件時，橋接層不會因 Big5/`CP950` 編碼而發生 JSON 序列化錯誤或亂碼，以便於獲得與舊軌 PHP 7.4 100% 一致的查詢結果。
3. **US3 (DML 更新與清楚的資料庫錯誤回報)**：作為一名系統管理員，我想要在透過 PHP 8.5 執行案件狀態修正、簡訊紀錄寫入或 `ANALYZE TABLE` 等非查詢語句時能正確取得受影響列數，且當 Oracle 報錯時能在日誌中看到完整的 `ORA-xxxxx` 錯誤訊息與 SQL 文本，以便於快速排查資料異常。
4. **US4 (部署順序容錯與雙通道自動備援)**：作為一名維運工程師，我想要在現場主機即使只先更新了 `LAH-API.zip`（尚未更新 `www.zip`）或於背景執行 CLI 排程時，系統能自動從 HTTP Loopback 通道退回至強化版 CLI Worker 通道完成查詢，以便於具備最大的部署韌性與容錯能力。
5. **US5 (內部橋接端點資安防護)**：作為一名資安稽核人員，我想要確保 `/api/ora_bridge.php` 僅能被同一台主機上持有共用 `www/.env` 金鑰的受管 PHP 程序透過實體 Loopback 呼叫，任何外部網路連線或偽造 `X-Forwarded-For` 的請求皆會遭到 `403 Forbidden` 攔截，以便於符合地政核心資料庫資安紅線。
6. **US6 (一鍵檢視橋接健康度探針)**：作為一名維運工程師，我想要在瀏覽 `/LAH-API/ver.php` 或開啟前端雙軌切換視窗時，直接看到 `oci8_bridge` 的就緒狀態（含通道模式與 PHP 7 `oci8` 載入結果），以便於在線上部署後 1 秒內確認 Oracle 橋接環境是否設定成功。

---

## 4. 實作決策 (Implementation Decisions)

### 4.1 涉及的子專案與檔案清單
```text
LAH-Workspace/
├── GLOSSARY.md                                                  # [已更新] 新增第 8 節：跨版本資料庫橋接術語
├── docs/adr/
│   └── 0014-php85-oracle9i-dual-channel-bridge-architecture.md  # [已新增] 架構決策紀錄
├── specs/
│   └── php85-oracle9i-dual-channel-bridge.md                    # [本規格書]
├── LAH-API/
│   ├── www/
│   │   └── api/
│   │       └── ora_bridge.php                                   # [新增] Apache mod_php7 本機 HTTP Loopback 橋接端點
│   └── API/
│       ├── ver.php                                              # [修改] 新增去敏化之 oci8_bridge 健康度自檢區塊
│       ├── include/
│       │   ├── OraDB.class.php                                  # [修改] 實作雙通道調度、全二進位透明封裝、動態路徑與環境隔離
│       │   ├── OraDBWrapper.class.php                           # [修改] 改用 OraDB::isDriverOrBridgeAvailable() 並修補 getError()
│       │   └── ora_cli_worker.php                               # [修改] 升級支援全二進位透明封裝、affected_rows、錯誤轉碼與 --ping 探針
│       └── tests/
│           └── Unit/Query/
│               ├── OraDBTest.php                                # [擴充] 驗證雙通道封裝、CP950 Base64 編解碼、路徑與簽章邏輯
│               └── OraDBWrapperTest.php                         # [更新] 驗證連線能力守門員與空指標安全防護
└── LAH-Updater/
    └── tools/updater/src-tauri/src/
        └── apache_conf.rs                                       # [修改] 對齊備援 ecosystem.config.js 之 instantclient_11_2 多路徑探測
```

### 4.2 全二進位透明封裝協定 (Binary-Transparent Envelope Protocol)

#### 1. 請求封裝結構 (Request JSON Envelope - UTF-8 Safe)
由 PHP 8.5 `OraDB` 送往 HTTP Loopback (`www/api/ora_bridge.php`) 或 CLI Worker (`API/include/ora_cli_worker.php`) STDIN：
```json
{
  "action": "query",
  "user": "ORA_USER",
  "pass": "ORA_PASS",
  "conn_str": "(DESCRIPTION=...)",
  "nls": "US7ASCII",
  "sql_b64": "<base64_encoded_raw_sql_bytes>",
  "binds": {
    ":bv_id": {
      "b64": true,
      "val": "<base64_encoded_raw_bind_bytes>"
    },
    ":bv_num": {
      "b64": false,
      "val": 100
    }
  }
}
```
* **向下相容**：Worker 同時支援讀取 `sql_b64`（優先，`base64_decode`）與舊版純文字 `sql`。
* **輕量健康探針動作 (`"action": "ping"`)**：當 `action` 為 `"ping"` 時，Worker 不建立 Oracle 網路連線，直接回傳 `{ "ok": true, "sapi": PHP_SAPI, "php_version": PHP_VERSION, "oci8": extension_loaded("oci8") }`，供 `/LAH-API/ver.php` 快速自檢。

#### 2. 成功回應封裝結構 (Success Response JSON Envelope)
```json
{
  "ok": true,
  "stmt_type": "SELECT",
  "affected_rows": 0,
  "rows_b64": [
    [
      { "k_b64": "<base64_encoded_column_key>", "v_b64": "<base64_encoded_string_value>" },
      { "k_b64": "<base64_encoded_column_key>", "v": null }
    ]
  ],
  "rows": [
    { "ASCII_COL": "<base64_encoded_string_value>" }
  ]
}
```
* **Key 與 Value 雙重二進位安全**：
  * 為徹底防止中文欄位別名（如 `AS "所別"` 在 `CP950` 下為非 UTF-8 位元組）導致 `json_encode` 失敗，Worker 將每一列封裝於 `rows_b64`（每個欄位以 `k_b64` 存放 `base64_encode((string)$k)`，字串值以 `v_b64` 存放 `base64_encode($v)`，非字串如 `null`/數值以 `v` 存放）。
  * PHP 8.5 `OraDB::execute()` 解碼時優先解析 `rows_b64` 還原出原始 `$row[$decoded_key] = $decoded_val`，並向下相容舊版 `rows` 結構；同時將 `affected_rows` 寫入 `$this->numrows`。

#### 3. 錯誤回應封裝結構 (Error Response JSON Envelope)
```json
{
  "ok": false,
  "error": {
    "code": 942,
    "offset": 15,
    "message_b64": "<base64_encoded_raw_error_message>",
    "sqltext_b64": "<base64_encoded_raw_sqltext>",
    "message": "ORA-00942: table or view does not exist"
  }
}
```
* Worker 捕捉到 `oci_error()` 時，將原始 `message` 與 `sqltext` 以 `base64_encode` 存入 `message_b64` 與 `sqltext_b64`，而明文 `message` 則經過 UTF-8 安全清洗（若含 `CP950` 則自動轉為 UTF-8），確保 Worker 的 `json_encode()` 100% 不會因為 `sqltext` 內含 `CP950` 中文字元而回傳 `false`。

### 4.3 雙重本機鎖與簽章驗證規範 (Dual Loopback Guard)
1. **實體 Loopback 檢查**：
   `www/api/ora_bridge.php` 檢查 `$_SERVER['REMOTE_ADDR']` 必須嚴格屬於 `['127.0.0.1', '::1']`，且 `$_SERVER['HTTP_X_FORWARDED_FOR']`、`$_SERVER['HTTP_CLIENT_IP']`、`$_SERVER['HTTP_X_REAL_IP']` 必須全數為空，否則立即回傳 HTTP `403 Forbidden`。
2. **共用 `.env` HMAC-SHA256 簽章**：
   - 金鑰衍生函式：`OraDB::getBridgeSecret()` 讀取共用設定檔 `www/.env` 之檔案內容雜湊（`hash_file('sha256', $env_path)`；若測試環境無 `.env` 則回退至固定內部 Salt 加安裝根目錄路徑雜湊）。
   - 請求端（PHP 8.5 `OraDB`）以 `hash_hmac('sha256', $raw_json_payload, $secret)` 計算簽章，置入 HTTP Request Header `X-LAH-Bridge-Signature`。
   - 接收端（`www/api/ora_bridge.php`）以相同方式計算並透過 `hash_equals()` 比對，不符者立即回傳 HTTP `403 Forbidden`。

### 4.4 雙通道調度與 CLI 環境隔離規範
1. **通道優先順序**：
   - 當 `OraDB` 的 `$this->use_cli_bridge` 為 `true` 時：
     - 若環境變數 `ORA_BRIDGE_MODE` 未強制指定為 `'cli'`，且當前並非在無 HTTP 服務的純測試強制 CLI 模式下，優先嘗試透過本機 HTTP Loopback (`http://127.0.0.1:{$apache_port}/api/ora_bridge.php`，連線逾時設為 `1.5` 秒、執行逾時 `120` 秒) 發送請求。
     - 若 HTTP Loopback 發生 cURL/Stream 連線失敗、HTTP 狀態碼非 `200`（如 `404 Not Found`），或回應非合法 JSON，`OraDB` 自動將靜態旗標 `self::$http_loopback_available` 標記為 `false`（同請求週期內不再重複嘗試 HTTP），並立即無縫切換至 CLI `proc_open` 通道執行同一筆查詢。
2. **CLI 動態路徑與環境變數重組**：
   - **動態探測 `php7\php.exe` 與 `php7\php.ini`**：依序檢查 `Env::get('PHP7_CLI_PATH')` ➔ `<安裝根目錄>\php7\php.exe`（由 `ROOT_DIR` 向上推導）➔ `C:\AppServ\php7\php.exe`。若同目錄存在 `php.ini`，啟動時顯式加入 `-c "<php7_dir>\php.ini"`。
   - **動態探測 `instantclient_11_2`**：依序檢查 `Env::get('OCI_DIR')` ➔ `<安裝根目錄>\instantclient_11_2` ➔ `C:\Tools\instantclient_11_2` ➔ `C:\AppServ\instantclient_11_2`。
   - **子程序 `PATH` 置頂隔離**：透過 `proc_open` 啟動 PHP 7 CLI 時，傳入明確的環境變數陣列 `$env_vars`，將 `<oci_dir>;<php7_dir>;` 置於 `PATH` 最前方，並設定 `PHPRC=<php7_dir>` 與 `NLS_LANG=American_America.US7ASCII`，避免 `php85` 目錄下的 DLL 干擾 PHP 7 載入 `php_oci8_11g.dll`。
   - **Windows `CreateProcess` 直接呼叫**：在 PHP 8+ 下對 `proc_open` 傳入命令陣列 `[$php7_cli, '-c', $php7_ini, $worker_script]`（若無 `php.ini` 則為 `[$php7_cli, $worker_script]`），自動啟用 `bypass_shell` 避開 `cmd.exe /c` 雙引號解析問題。

### 4.5 `OraDBWrapper` 連線能力守門員與 `ver.php` 探針
1. **`OraDB::isDriverOrBridgeAvailable()`**：
   - 若 `extension_loaded('oci8')` 為 `true`，回傳 `true`。
   - 否則檢查 `OraDB::resolvePhp7CliPath()` 找到之 `php.exe` 是否存在且可讀取（若在 PHPUnit 純單元測試中欲模擬無驅動環境，支援透過環境變數 `ORA_DISABLE_BRIDGE=true` 強制關閉）。
2. **`OraDBWrapper::isDBReachable()` 與 `getError()`**：
   - 將原本的 `if (!function_exists('oci_connect'))` 改為 `if (!OraDB::isDriverOrBridgeAvailable())`。
   - 將 `getError()` 改為 `return $this->db ? $this->db->getError() : false;`，消除 Null Pointer Fatal Error。
3. **`/LAH-API/ver.php` 擴充結構**：
   - 保留既有欄位（`status`, `channel`, `php_version`, `sapi`, `extensions`, `timestamp`）100% 不變。
   - 新增 `oci8_bridge` 欄位：
     ```json
     "oci8_bridge": {
       "enabled": true,
       "ready": true,
       "mode": "dual (http-loopback + cli-fallback)",
       "worker_oci8": true
     }
     ```

---

## 5. 測試與驗證決策 (Testing Decisions)

### 5.1 單元與整合測試接縫 (PHPUnit Test Seams)
1. **全二進位透明封裝與 `CP950` 編解碼單元測試 (`tests/Unit/Query/OraDBTest.php`)**：
   - 驗證含有 `CP950` (Big5) 中文字串的 SQL 語句、中文綁定參數與中文欄位別名（如 `所別`、`登記案件`）經封裝與解碼後，100% 還原且不觸發 `JSON_ERROR_UTF8`。
   - 驗證 `ora_cli_worker.php` 的 `"action": "ping"` 探針模式透過 CLI `proc_open` 實際呼叫本機 PHP 7 CLI 的回應結構。
   - 驗證 `OraDB::getBridgeSecret()` 與 HMAC-SHA256 簽章生成及驗證邏輯。
2. **連線能力守門員單元測試 (`tests/Unit/Query/OraDBWrapperTest.php`)**：
   - 驗證當 `getError()` 在未連線（`$this->db === null`）時安全回傳 `false` 而不拋出例外。
   - 驗證 `ORA_DISABLE_BRIDGE=true` 時 `reachable()` 回傳 `false`，以及正常橋接可用時的行為。
3. **本機雙軌 HTTP 端對端驗證**：
   - 對 `/LAH-API/ver.php` 發送請求，確認回傳 `oci8_bridge` 診斷資訊且無任何 PHP Deprecated / Warning 雜訊。
   - 對 `www/api/ora_bridge.php` 測試未帶簽章或偽造 `X-Forwarded-For` 時確實回傳 `403 Forbidden`，帶正確簽章與 `"action": "ping"` 時回傳 `ok: true`。
   - 執行 `LAH-API/API/run_tests.bat`（全套 PHPUnit Unit & Integration 測試）與 `LAH-Updater` 的 `cargo test`，確保零回歸錯誤。

---

## 6. 不在範圍內 (Out of Scope)
1. **不重新編譯 PHP 8.5 原生 `php_oci8_11g.dll`**：本次採雙通道 PHP 7.4 橋接架構，無須動用 Visual Studio C++ 編譯器。
2. **不修改既有 30+ 支業務 API 與 SQL 查詢邏輯**：所有 `:bv_` 參數綁定與 `CP950` 字串拼接維持原狀，由 `OraDB` 底層透明處理。
3. **不關閉開發環境之 `MOCK=true` 安全護欄**：本機開發與自動化測試依然嚴格維持 `www/.env` 中 `MOCK=true`。

---

## 7. 補充備註 (Further Notes)
* **資安邊界自檢相容性**：`/LAH-API/ver.php` 新增之 `oci8_bridge` 區塊僅回傳布林狀態與模式名稱，不暴露伺服器絕對檔案路徑（如 `C:\AppServ\...`）或敏感憑證，完全符合 [node-portable-sandbox-specification.md](file:///c:/Temp/DEV/LAH-Workspace/docs/security/node-portable-sandbox-specification.md) 之資安自檢規範。
