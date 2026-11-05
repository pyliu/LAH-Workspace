# 0022. Apache 統一日誌儲存庫歸集與全自動生命週期治理架構

- 日期：2026-11-05
- 狀態：Accepted
- 決策者：pyliu, Antigravity

---

## 1. 背景與問題脈絡 (Context)

智慧控管與監控系統於各地政機關伺服器長期運維中，觀察到主機磁碟空間隨時間持續耗盡。經現場調閱日誌目錄與進程組態，鑑識出核心成因如下：

1. **Apache 日誌孤立且無自動清理與壓縮**：
   Apache 2.4 於 `httpd.conf` 透過管道呼叫 `bin/rotatelogs.exe -l C:/AppServ/Apache24/logs/access.%Y.%m.%d.log 100M`。`rotatelogs.exe` 僅在跨日或單檔滿 100MB 時開立新檔，**完全不具備過期刪除（Retention）或壓縮功能**。單日 access log 體積達 20MB ~ 70MB，歷史檔案永久沉澱於 `C:\AppServ\Apache24\logs\`，數週即可累積數十 GB。
2. **PM2 日誌輪替邊界限制**：
   PM2 內建之 `pm2-logrotate` 模組僅能透過內部 RPC 監控向 PM2 註冊之應用進程（前端、即時通、排程、API FastCGI）。Apache 2.4 為獨立之 Windows 系統服務（`LAH_Web_Service`），無法由 PM2 原生感知與輪替。
3. **目錄結構割裂**：
   系統所有受管服務日誌已統籌於主機 `<根目錄>\logs`（如 `api/`、`service/`、`web_service/`），唯獨 Apache 孤立於 `Apache24\logs\`，增加備份與巡檢之複雜度。

因此，亟需將 Apache 日誌拉入全系統統一日誌儲存庫，並建立 24/7 全自動歷史壓縮與過期刪除治理機制。

---

## 2. 決策方案評估 (Options Considered)

1. **方案 A：統一日誌儲存庫歸集 + rotatelogs 切日防鎖 + `pm2_service_runner.js` 24/7 常駐治理 + 全工具鏈聯動 (Adopted)**
   - **目錄拓撲**：收攏至 `<根目錄>\logs\apache\`（獨立子目錄：`access.%Y.%m.%d.log`、`error.%Y.%m.%d.log`）。
   - **寫入機制**：維持 `rotatelogs.exe` 切日命名。Apache 工作程序（`httpd.exe`）於換日零點自動關閉舊檔開啟新檔，舊檔自然解鎖，徹底規避 Windows 強制性檔案鎖定（Mandatory File Lock）。
   - **常駐治理引擎**：由開機自啟、24/7 運行的 Windows 系統服務守護腳本 `pm2_service_runner.js`（`LAH_PM2_Service`）於常態巡檢中執行日誌生命週期治理：
     - 當日即時日誌維持明文不壓縮，供線上除錯與即時串流追蹤。
     - 歷史舊日誌（非當日或已切檔）以 Node 原生 `zlib` 執行 Gzip 串流壓縮為 `.log.gz`（壓縮率達 90%）。
     - 超過 30 天之過期日誌與壓縮檔自動安全刪除，釋放磁碟空間。
   - **全工具鏈聯動**：
     - `LAH-Updater`（`apache_conf.rs`）：更新與全新安裝時自動將 `httpd.conf` 日誌路徑轉移並正規化至 `logs/apache/`。
     - `LAH-Dashboard`（管理儀表板）：日誌檢視器優先探測 `logs\apache\`（向下相容 `Apache24\logs`）；第三頁籤快捷按鈕「手動觸發日誌壓縮輪替」同步納入 `logs\apache\`。
   - **優點**：架構高度統籌、零外部套件相依、無人登入桌面亦全自動運作、與 PM2 `retain: 30` 政策完美對齊。
   - **缺點**：跨工具鏈（`updater`、`node-portable`、`dashboard`）需同步微調與測試驗證。

2. **方案 B：Apache 改採固定檔名 `access.log`，由外部程式強行截斷清空 (Truncate-on-the-fly)**
   - **做法**：Apache 寫入單一固定檔案，由背景程序直接截斷檔案長度。
   - **缺點**：在 Windows NT 核心下，`httpd.exe` 寫入句柄常駐佔用，外部進程強行 Truncate 極易拋出 `EBUSY` 或 `Permission Denied`，且易遺失瞬時請求紀錄。

3. **方案 C：維持 `Apache24\logs` 原目錄，僅擴充儀表板手動點擊壓縮**
   - **做法**：目錄不搬遷，僅在管理儀表板加入按鈕讓人員手動點擊清理。
   - **缺點**：目錄依然分裂；若維運人員未開啟儀表板，伺服器磁碟仍會無止境膨脹。

---

## 3. 決策結果 (Decision Outcome)

採納 **方案 A**。

1. **目錄規範 (Directory Topology)**：
   - Apache 2.4 日誌全面歸集至 `<安裝根目錄>\logs\apache\`。
   - 預設產出 `access.%Y.%m.%d.log` 與 `error.%Y.%m.%d.log`。
2. **Apache 組態自癒 (Configuration Self-Healing)**：
   - `LAH-Updater` 之 `apache_conf.rs` 於套用或更新組態時，動態將 `ErrorLog` 與 `CustomLog` 之 rotatelogs 管道重寫為 `<根目錄>/logs/apache/`，並自動建立該目錄。
3. **常駐生命週期治理 (24/7 Governance Engine)**：
   - 於 `pm2_service_runner.js` 擴充日誌生命週期治理巡檢函數（`auditLogLifecycle`）：
     - 掃描目標涵蓋 `logs/`（PM2 應用群組）與 `logs/apache/`（Web 伺服器群組）。
     - 留存週期（Retention）：30 天（`30 * 86400 * 1000` ms）。
     - 歷史舊檔：檔名日期小於當日之 `.log` 檔案，透過 `zlib.createGzip()` 壓縮為 `*.log.gz`，壓縮完成確認無損後安全移除原 `.log` 檔。
     - 過期清理：修改時間超過 30 天之 `*.log` 與 `*.log.gz` 自動安全清除。
4. **管理儀表板支援 (Dashboard Cohesion)**：
   - `logs.rs` 日誌探測清單更新 Apache 目錄為 `logs\apache\`，備援回退相容舊版 `Apache24\logs\`。
   - `pm2.rs` 手動壓縮輪替指令同步涵蓋 `logs\apache\`。

---

## 4. 取捨與後續影響 (Consequences / Trade-offs)

- **正面效益**：
  - **根本抑制磁碟膨脹**：單日 50MB 之 access log 經 Gzip 壓縮後約僅 3~5MB，30 天總量被牢牢壓制於 150MB 內，徹底消除動輒數十 GB 磁碟耗盡之風險。
  - **零人工干預**：依附於開機常駐之 `LAH_PM2_Service`，無須維運人員手動清理或依賴 Windows 外部排程器。
  - **符合公務資安稽核**：完整保留 30 天每日完整存取與錯誤軌跡。
  - **日誌目錄大一統**：全系統受管服務日誌收攏於 `<根目錄>\logs\`，備份與檢視一站化。
- **取捨考量**：
  - 歷史舊日誌轉為 `.log.gz` 壓縮檔，若人員需排查兩週前之存取紀錄，需解壓縮後檢視（當日與活躍日誌維持純文字明文，即時日誌檢視器追蹤無任何影響）。
