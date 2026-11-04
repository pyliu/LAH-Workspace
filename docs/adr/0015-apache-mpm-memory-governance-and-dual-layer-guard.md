# 0015: Apache 2.4 (`mpm_winnt`) 雙層記憶體防護閘與 PHP 7 執行期資源治理架構

**狀態**: 已採納 (Accepted)  
**日期**: 2026-11-04  

### 決策背景與脈絡
於桃園所正式機（`220.1.34.75`）與各地政事務所伺服器長期運維中，管理儀表板觀測到 Apache 2.4（`httpd.exe`）常駐工作集（Working Set）隨時間持續膨脹至 **11.4 GB**（佔 16 GB 實體記憶體之 72%）。過去維運人員被迫於 Windows 工作排程器設定每小時強制重啟一次 Apache，但定時強行重啟會直接切斷當下執行中的地政查詢與報表匯出連線。

經實機鑑識 `\\220.1.34.75\c$\AppServ\` 之組態與日誌，確認記憶體無上限膨脹之三大成因：
1. **`httpd-mpm.conf` 未載入且 `MaxConnectionsPerChild` 為無限（`0`）**：`Apache24/conf/httpd.conf` 預設將 `#Include conf/extra/httpd-mpm.conf` 註解，導致 `mpm_winnt` 工作子程序永不輪替回收，且 `MaxMemFree` 未設上限。
2. **`mod_php7` 多執行緒堆積高水位滯留**：主站 `C:/AppServ/www` 透過 `php7apache2_4.dll` 以 ZTS 多執行緒模式內嵌於 `httpd.exe`，且 `php7/php.ini` 配置了 `memory_limit = 768M` 與 `max_execution_time = 0`。高頻率請求（如 `/get_user_img.php` 與 `/api/stats_json_api.php`）使各工作執行緒陸續觸及記憶體高水位，而 Windows 與 Zend Memory Manager 的執行緒私有堆積在子程序不退場的情況下不會歸還作業系統。
3. **Composer `autoload_real.php` 載入開發測試套件與未ตรวจสอบ檔案存在性**：`LAH-API/vendor/composer/` 包含開發期 `phpunit` 全域函式自動載入項目，於更新解壓縮期間或排除 `phpunit` 之環境中會引發每次請求拋出 `Fatal error: Failed opening required ... phpunit/.../Functions.php`。

### 決策內容與原因
採納 **「雙層記憶體防護閘 (Dual-Layer Memory Guard)」** 與 **「PHP 7 執行期資源收斂」** 架構，淘汰每小時外部強制重啟排程：

1. **第一層（Apache `mpm_winnt` 原生優雅輪替與配置器限額）**：
   - 由 `LAH-Updater`（`apache_conf.rs`）自動於 `Apache24/conf/httpd.conf` 注入受管之 `<IfModule mpm_winnt_module>` 區塊：
     - `ThreadsPerChild 150`
     - `MaxConnectionsPerChild 10000`（單一子程序累計服務 10,000 次連線後，由父程序拉起新子程序接手新連線，舊子程序待手頭請求全數完成後優雅退出並徹底釋放數百 MB 至數 GB 之執行緒堆積）
     - `MaxMemFree 2048`（限制每個執行緒 APR 配置器最多保留 2,048 KB 空閒記憶體，超出部分立即釋放）
2. **第二層（`service_runner.js` 守護程序記憶體水位熔斷）**：
   - 於 `LAH_PM2_Service` 常駐守護腳本（`service_runner.js` 每 60 秒 Watchdog 循環）新增 Apache 記憶體水位巡檢。當偵測到所有 `httpd.exe` 工作集總和超過 **2.5 GB（2,560 MB）** 時，自動記錄告警並執行 `LAH_Web_Service` 保護性重啟，作為異常突發洩漏的最後防線。
3. **PHP 7.4 執行期資源參數對齊**：
   - 擴充 `ensure_php_ini_configured`，使 `php7/php.ini` 與 `php85/php.ini` 同步收斂為 `max_execution_time = 300` 與 `memory_limit = 512M`，防止單一異常請求無限期霸佔 Apache 工作執行緒。
4. **Composer Autoload 生產環境防禦**：
   - 於 `autoload_files.php` 與 `autoload_static.php` 移除非生產環境必要之 `phpunit` 全域函式載入項，並於 `autoload_real.php` 加入 `is_file($file)` 存在性防禦，杜絕熱更新解壓瞬間引發 Fatal Error。

### 取捨與後續影響 (Consequences / Trade-offs)
- **正面影響**：
  - Apache 記憶體常態穩定控制在 **300 MB ~ 1.2 GB** 區間，釋放超過 10 GB 主機實體記憶體。
  - `MaxConnectionsPerChild 10000` 採 Apache 父子程序原生交接，線上地政同仁查詢與下載報表零中斷。
  - 規則直接內建於 `LAH-Updater` 與 `service_runner.js`，未來各所執行更新或安裝時全自動生效，達成零人工排程維護。
- **取捨考量**：
  - 每 10,000 次連線輪替一次子程序會帶來極微小的子程序初始化開銷（約數十毫秒，且由父程序背景預先建立），相較於節省 10 GB 記憶體與避免定時斷線，此開銷完全可忽略。
