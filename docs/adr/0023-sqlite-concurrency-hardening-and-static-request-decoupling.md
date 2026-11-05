# 0023. SQLite 併發防護加固、靜態請求解耦與 Apache 韌性治理架構

- 日期：2026-11-05
- 狀態：Accepted
- 決策者：pyliu, Antigravity

---

## 1. 背景與問題脈絡 (Context)

於分析現場主機（`220.1.34.75`）之 Apache 錯誤日誌時，鑑識出多項影響系統穩定度之執行期異常：

1. **SQLite 並行鎖定引發致命磁碟 I/O 錯誤 (`AH01071 / PDOException 10 disk I/O error`)**：
   在 Apache 重啟或客戶端大量並行存取時，多個 FastCGI 工作行程於毫秒級同時進入 `GlobalConstants.inc.php`，呼叫 `SQLiteDBFactory::getRKEYNALLDB()` 嘗試執行 DDL 語法（`CREATE TABLE IF NOT EXISTS`）。因 Windows 檔案鎖定衝突且無忙碌退避逾時，引發 `SQLITE_IOERR` (10) 拋出未攔截的 Fatal 例外，導致 API 回傳 500 錯誤。
2. **高頻靜態請求與後端資料庫高度偶合**：
   桌面客戶端極度頻繁存取頭像（`/get_user_img.php`，每小時逾 2,600 次），所有請求皆經過 `init.php` 載入 `GlobalConstants.inc.php`，無條件連線並查詢 `RKEYN_ALL.db`（事務所對應表）與 `RKEYN.db`（登記原因對應表），形成嚴重的資料庫存取熱點與鎖定競爭。
3. **Apache 工作執行緒耗盡與排程強制終止 (`AH00326 / AH00431`)**：
   平日尖峰時段 Apache 工作執行緒（原設定 64）迅速耗盡，導致請求排隊。而每小時 55 分由 Windows 工作排程執行的 `restart_Apache24.bat` 在執行緒受阻無法優雅退出時，被父程序強制終止（`Forcing termination of child process`），硬性切斷在途中之業務連線。
4. **FastCGI 後端重啟瞬斷 (`AH01067 / AH00957`)**：
   PM2 監管之 PHP 8.5 FastCGI（8085 端口）因記憶體回收或重啟時，Apache `mod_proxy_fcgi` 未設定重試機制，直接向前端返回 503 服務不可用。
5. **未啟用之 SSL 模組造成日誌雜訊 (`AH01873`)**：
   Apache 僅監聽 80 端口，但載入了 `ssl_module` 且未配置快取，每次啟動固定輸出無效警告。

---

## 2. 決策方案評估 (Options Considered)

1. **方案 A：靜態請求快速路徑 + SQLite 忙碌逾時防護 + 常數安全降級 + Apache 韌性加固 (Adopted)**
   - **靜態請求快速路徑 (`LAH_FAST_PATH`)**：於 `/get_user_img.php`、`/get_carousel_img.php`、`/get_blob_img.php` 及 PDF 串流端點宣告快速路徑標記，在 `GlobalConstants.inc.php` 中完全繞過 SQLite 查詢，改採預載之事務所對應陣列（涵蓋桃園轄區八所），使 80% 以上之高頻請求與資料庫徹底解耦。
   - **全域常數例外屏蔽與安全降級**：常規 API 請求之資料庫查表以 `try...catch (Throwable $e)` 完整包覆。若遇資料庫暫時性不可用或異常，記錄警告並自動降級為預設映射，嚴禁向上拋出 Fatal 錯誤阻斷整個 API 生命週期。
   - **SQLite 連線忙碌等待與惰性 DDL**：在 `DynamicSQLite::initDB()` 設定 `PRAGMA busy_timeout = 10000;` 與 `PRAGMA journal_mode = WAL;`；並於 `SQLiteDBFactory` 改為僅在實體檔案不存在時才執行 DDL 建表。
   - **Apache 參考組態強化 (`httpd.conf-ref`)**：
     - 配置 `KeepAliveTimeout 2` 與 `MaxKeepAliveRequests 500`，快速回收桌面端長連線所佔用之 worker 執行緒。
     - 整合 `ThreadsPerChild 150` 與 MPM 記憶體治理（`MaxConnectionsPerChild 10000`、`MaxMemFree 2048`），透過進程自生自滅取代每小時外部 `net stop` 硬重啟批次檔。
     - FastCGI 代理設定加入 `ProxySet retry=1`，平滑容忍 PM2 重啟空窗。
     - 註解停用未監聽 443 端口之 `ssl_module`，清除無效日誌警告。
   - **優點**：架構最小更動、向後相容 100%、徹底消除高頻靜態請求之資料庫競爭、杜絕代碼 10 磁碟 I/O 崩潰。
   - **缺點**：若新增非轄區地政事務所代碼，快速路徑端點預設僅提供桃園 8 所基本映射（但靜態圖檔請求本就不涉及跨區外所映射）。

2. **方案 B：重構全域常數為完全延遲載入（移除 `OFFICE` 常數，改為 `OfficeResolver::get()`）**
   - **缺點**：波及範圍過大，需全面審查與修改 `LAH-API` 雙軌數十支業務 API 程式碼，破壞既有架構契約，回退成本極高。

3. **方案 C：僅依賴增加 Apache `ThreadsPerChild` 與 SQLite `busy_timeout`，不改動全域常數與靜態請求**
   - **缺點**：治標不治本。高頻頭像請求依然每次連線資料庫，尖峰時段仍存在鎖定排隊延遲與資源浪費。

---

## 3. 決策內容與技術規範 (Decision)

1. **雙軌原始碼同步落地**：
   - 於 `LAH-API/API/v1/` 與 `LAH-API/www/` 之靜態檔案端點（`get_user_img.php`、`get_carousel_img.php`、`get_blob_img.php`、`get_adm_reserve_pdf.php`、`get_reg_foreigner_pdf.php`、`get_sur_destruction_pdf.php`）首行加入 `define('LAH_FAST_PATH', true);`。
   - 於 `LAH-API/API/include/GlobalConstants.inc.php` 與 `LAH-API/www/include/GlobalConstants.inc.php` 實作快速路徑分支與 `try...catch` 降級防護。
2. **參考設定檔與維運指引同步**：
   - 更新 `LAH-API/httpd.conf-ref` 納入 `KeepAliveTimeout 2`、`ProxySet retry=1`、`ThreadsPerChild 150` 與 WinNT 記憶體治理。
   - 建議現場維運人員評估停用 Windows 排程之 `restart_Apache24.bat`，改依賴 Apache 內建之連線計數平滑輪替機制。

---

## 4. 取捨與後續影響 (Consequences & Trade-offs)

### 正面效益
- **消除致命 500 錯誤**：高頻圖檔請求不再觸發 SQLite 鎖定爭奪，徹底根除 `SQLSTATE[HY000]: General error: 10 disk I/O error`。
- **大幅提升吞吐量**：頭像與靜態圖片請求無須連線 SQLite 與查詢兩張表格，請求回應延遲顯著降低。
- **執行緒資源回收加快**：`KeepAliveTimeout 2` 避免客戶端長連線霸佔 150 條工作執行緒，消弭 `AH00326` 告警。
- **PM2 重啟平滑容錯**：`retry=1` 確保 PM2 程序重啟的 1 秒空窗期內，Apache 自動重試連線，不向客戶端拋出錯誤。

### 潛在限制與維運注意
- 靜態圖檔請求中若有自訂程式碼依賴全台灣所有事務所完整名稱（罕見情境），快速路徑預設僅提供桃園 8 所代碼；常規 API 請求則不受任何影響，維持自資料庫動態載入完整清單。
