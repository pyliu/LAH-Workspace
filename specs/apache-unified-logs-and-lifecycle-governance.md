# 功能規格書：Apache 統一日誌儲存庫歸集與全自動生命週期治理

## 1. 問題陳述 (Problem Statement)

桃園地政智慧控管與監控系統（LAH）在各地政事務所伺服器運維中，觀察到主機磁碟空間隨時間持續耗損與膨脹。經現場調閱組態與目錄結構，鑑識出核心問題：

1. **Apache 日誌孤立且無自動清理與壓縮**：
   Apache 2.4 在 `httpd.conf` 透過管道指令 `bin/rotatelogs.exe -l C:/AppServ/Apache24/logs/access.%Y.%m.%d.log 100M` 寫入。`rotatelogs.exe` 僅在跨日或滿 100MB 時切出新檔，**完全不具備過期刪除（Retention）或壓縮功能**。單日存取紀錄高達 20MB ~ 70MB，歷史檔案沉澱於 `C:\AppServ\Apache24\logs\`，數週即膨脹至數十 GB。
2. **PM2 日誌輪替邊界受限**：
   PM2 內建之 `pm2-logrotate` 模組僅能透過 RPC 監控向 PM2 註冊之應用進程（前端、即時通、排程、API FastCGI）。Apache 2.4 為 Windows 獨立系統服務（`LAH_Web_Service`），無法由 PM2 原生感知與輪替。
3. **目錄結構割裂**：
   全系統受管服務日誌已統籌於主機 `<根目錄>\logs`（如 `api/`、`service/`、`web_service/`），唯獨 Apache 孤立於 `Apache24\logs\`，增加備份與巡檢之複雜度。

---

## 2. 解決方案 (Solution)

落實「**統一日誌儲存庫 (Unified Logs Repository)**」與「**日誌生命週期治理 (Log Lifecycle Governance)**」架構：

1. **目錄統籌歸集**：
   將 Apache 2.4 日誌全面收攏至主機 `<安裝根目錄>\logs\apache\` 獨立子目錄。
2. **rotatelogs 切日命名防護**：
   維持 Apache 端 `rotatelogs.exe` 切日命名模式（`logs/apache/access.%Y.%m.%d.log`）。跨日零點工作程序（`httpd.exe`）自動開啟新檔並解鎖昨日舊檔，徹底規避 Windows NT 核心之強制性檔案鎖定（Mandatory File Lock）。
3. **24/7 常駐守護治理引擎**：
   由開機無人登入常駐運行的 `LAH_PM2_Service`（可攜沙盒 `pm2_service_runner.js`，每 60 秒常態心跳）注入日誌生命週期治理排程：
   - **當日活躍日誌**：維持純文字明文，供線上除錯與管理儀表板即時串流追蹤。
   - **歷史日誌壓縮**：非當日（或已輪替）之歷史舊檔，透過 Node 原生 `zlib` 串流壓縮為 `*.log.gz`（縮減 90% 儲存體積），壓縮確認無損後安全釋放原 `.log`。
   - **過期自動刪除**：留存週期嚴格對齊 PM2 之 30 天標準（`retain: 30`）。最後修改時間超過 30 天之 `*.log` 與 `*.log.gz` 自動安全清除，將硬碟佔用永久壓制在 200MB 以內。
4. **全工具鏈聯動自癒**：
   - `LAH-Updater`（`apache_conf.rs`）：更新與全新安裝時自動自癒重寫 `httpd.conf`，確保路徑正規化為 `logs/apache/`。
   - `LAH-Dashboard`（管理儀表板）：日誌檢視器優先探測 `logs\apache\`（向下相容舊目錄）；快捷維運「手動日誌壓縮輪替」同步納入 `logs\apache\`。

---

## 3. 使用者故事列表 (User Stories)

1. **US1 (自動路徑歸集)**：作為維運工程師，我想要在執行安裝或自動更新工具時，系統能自動將 Apache 日誌管道重寫為 `logs/apache/`，以便於全系統日誌集中管理且零人工修改 `httpd.conf`。
2. **US2 (全自動歷史壓縮)**：作為主機系統，我想要在每日換日後，由常駐守護服務自動將非當日的 Apache 歷史存取與錯誤日誌以 Gzip 壓縮為 `.log.gz`，以便於節省 90% 儲存空間。
3. **US3 (過期日誌安全清除)**：作為維運工程師，我想要系統自動刪除超過 30 天之歷史日誌與 `.gz` 壓縮檔，以便於將硬碟佔用嚴格壓制在 200MB 以內，杜絕磁碟空間被吃光之風險。
4. **US4 (線上即時除錯零受阻)**：作為現場管理師，我想要當日的 Apache 活躍日誌維持純文字明文，以便於管理儀表板即時串流追蹤與 Windows 記事本直接開啟排查。
5. **US5 (儀表板一鍵快控)**：作為現場管理師，我想要在管理儀表板的快捷維運工具箱點擊「手動觸發日誌壓縮輪替」時，Apache 日誌也能一併被安全壓縮並回收磁碟空間。
6. **US6 (新舊環境無痛相容)**：作為維運工程師，當舊主機尚未升級組態前，管理儀表板仍能相容讀取舊 `Apache24\logs`，以便於升級過渡期間維運平滑無縫。

---

## 4. 實作決策 (Implementation Decisions)

### 4.1 檔案與目錄結構

```text
LAH-Workspace/
├── specs/
│   └── apache-unified-logs-and-lifecycle-governance.md  # 本規格書
├── docs/adr/
│   └── 0022-apache-unified-logs-repository-and-lifecycle-governance.md  # 對應 ADR 0022
├── GLOSSARY.md                                          # 領域術語更新
└── LAH-Updater/
    ├── tools/
    │   ├── updater/
    │   │   └── src-tauri/src/apache_conf.rs             # Apache 組態路徑重寫至 logs/apache
    │   ├── node-portable/
    │   │   ├── service/pm2_service_runner.js            # 24/7 常駐歷史壓縮與過期刪除治理
    │   │   └── src-tauri/src/console.rs                 # 便攜沙盒後端輪替目錄增補 logs/apache
    │   └── dashboard/
    │       └── src-tauri/src/
    │           ├── logs.rs                              # 日誌探測路徑適配 logs/apache (相容舊版)
    │           └── pm2.rs                               # 儀表板手動輪替目錄適配 logs/apache
    └── tests/
        └── test_log_lifecycle.js                        # Node 治理引擎單元測試套件
```

### 4.2 模組職責與介面契約

#### 1. `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs`
- **職責**：Apache 組態注入與路徑正規化。
- **規則**：
  - 目標路徑：`<根目錄>/logs/apache/`（若 `logs/apache/` 不存在則於更新時由 updater 自動 `create_dir_all` 建立）。
  - 正則表達式比對與替換：
    - `ErrorLog "|bin/rotatelogs.exe -l <logs_dir>/apache/error.%Y.%m.%d.log 100M"`
    - `CustomLog "|bin/rotatelogs.exe -l <logs_dir>/apache/access.%Y.%m.%d.log 100M" combined`
  - 同時相容舊版 `Apache24/logs` 與新版 `logs/apache` 之替換規則。

#### 2. `LAH-Updater/tools/node-portable/service/pm2_service_runner.js`
- **職責**：24/7 開機常駐守護程序之生命週期治理任務。
- **規則**：
  - 巡檢週期：於 `tick()` 循環中，以每小時（或換日）防抖節流觸發 `auditLogLifecycle(ROOT_DIR)`。
  - 掃描目錄：`<根目錄>/logs/apache` 以及 `<根目錄>/logs`。
  - 歷史日誌判定：
    - 檔名符合 `access.YYYY.MM.DD.log` 或 `error.YYYY.MM.DD.log`。
    - 取得今日日期字串 `today = YYYY.MM.DD`。
    - 若檔名日期標籤小於 `today`，且非 `.gz` 檔案，判定為可安全壓縮之歷史舊檔。
  - Gzip 串流壓縮：
    - 使用 Node 原生 `zlib.createGzip({ level: 9 })`。
    - 寫入目標為 `${file}.gz`。
    - 壓縮完成確認檔案存在且大小大於 0 後，安全刪除原 `.log` 檔案。
  - 過期清除（Retention: 30 天）：
    - 檢查所有 `*.log` 與 `*.log.gz` 之檔案 `mtime`。
    - 若 `now - mtime > 30 * 86400 * 1000` ms，執行 `fs.unlinkSync` 安全刪除。

#### 3. `LAH-Updater/tools/dashboard/src-tauri/src/logs.rs`
- **職責**：儀表板即時日誌檢視器探測。
- **規則**：
  - 優先檢查 `root_dir.join("logs").join("apache")`。
  - 若目錄或檔案不存在，安全回退回撥舊路徑 `root_dir.join("Apache24").join("logs")`。

#### 4. `LAH-Updater/tools/dashboard/src-tauri/src/pm2.rs` & `node-portable/src-tauri/src/console.rs`
- **職責**：手動一鍵日誌壓縮輪替。
- **規則**：
  - `search_dirs` 增補 `root_dir.join("logs").join("apache")`。
  - 支援將歷史切檔無損轉換為 `.gz` 並釋放磁碟空間。

---

## 5. 測試與驗證決策 (Testing Decisions)

### 5.1 測試接縫 (Test Seams)
1. **組態生成單元測試接縫 (`cargo test`)**：
   - 於 `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs` 驗證 `test_configure_apache_mod_php7_rewrites_logs_to_unified_apache_dir`。
   - 斷言輸出的 `httpd.conf` 內包含 `logs/apache/error.%Y.%m.%d.log` 與 `logs/apache/access.%Y.%m.%d.log`。
2. **生命週期治理引擎測試接縫 (`node tests/test_log_lifecycle.js`)**：
   - 於獨立暫存沙盒目錄建立：
     - `access.2026.10.01.log`（35 天前過期檔）
     - `access.2026.11.04.log`（昨日歷史檔）
     - `access.2026.11.05.log`（當日即時檔）
   - 調用治理函式後斷言：
     - 35 天前過期檔被徹底移除。
     - 昨日歷史檔被轉為 `access.2026.11.04.log.gz`，原 `.log` 已清除。
     - 當日活躍檔 `access.2026.11.05.log` 完整保留明文不變。
3. **儀表板編譯與路徑探測驗證 (`cargo check`)**：
   - 驗證 `dashboard` 與 `node-portable` 之 Rust 程式碼編譯無警告無錯誤。
