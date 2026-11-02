# ADR 0008: 自動更新工具 PM2 確定性冪等重建、PHP85 關聯防呆與發布同步強化策略

- **狀態 (Status)**: 已通過 (Accepted)
- **日期 (Date)**: 2026-11-02
- **決策者 (Deciders)**: 使用者 (User), Antigravity Agent

---

## 1. 背景與脈絡 (Context)

在智慧控管與監控系統之舊版伺服器（如 `\\220.1.34.75\C$\AppServ\`）進行原地升級時，發現以下架構與執行期問題：

1. **管理儀表板未同步部署**：
   維運同仁將更新包複製到伺服器暫存目錄（如 `\\220.1.34.75\C$\temp\v1.9.9\`）進行原地升級時，發現完成時未複製「智慧控管與監控系統 - 管理儀表板.exe」至 `C:\AppServ\`。追查原因為發布資料夾未同步包含該執行檔，同仁手動複製更新包時缺漏。
2. **PM2 程序重複啟動與堆疊**：
   舊伺服器原本已在背景運行舊版受管服務（如手動批次檔或舊版 PM2 服務），原機升級執行時，未經全域清空便直接喚醒舊程序並觸發 `pm2 start <eco>`。由於 `ecosystem.config.js` 採用 cluster 模式（如 `LAH-FE` 設定 `instances: 2`），二次啟動導致程序數量整整翻倍（4 個 LAH-FE、2 個 LAH-SCHEDULER、2 個 LAH-WSS），引發 Port 衝突與記憶體浪費。
3. **現代化 PHP8 API (lah-api-v85) 未啟動之盲區**：
   同仁於舊伺服器僅勾選基礎環境「PHP 8.5 執行環境 (php85.zip)」，未勾選應用模組「後端 PHP8 更新包 (LAH-API.zip)」。由於舊伺服器原本僅有 `C:\AppServ\www`（PHP 7.3 架構），不存在 `C:\AppServ\LAH-API` 及其 `ecosystem.config.js`，導致 PM2 巡檢時查無配置檔而跳過，同仁困惑為何 `lah-api-v85` 未在線。

---

## 2. 使用者裁決方案 (Decisions: 1B + 2A + 3A)

### 議題一：管理儀表板在安裝來源目錄缺漏時的部屬機制
- **裁決 (1B)**：
  保持 Updater 輕量架構（不透過內嵌增加 Updater 體積），由打包與發布流程強制同步至發布目錄。
- **具體實作**：
  - 更新 `tools/dashboard/build.py`：編譯完成後自動探測前端版號，並同步複製產物至開發機發布資料夾（`d:\DEV\@各所分享區\@智慧管控系統\@更新程式\<version>`）。
  - 已將最新 `智慧控管與監控系統 - 管理儀表板.exe` 同步至現行發布目錄 `v1.9.9`，維運同仁複製資料夾時自然包含該 EXE，使 Updater 執行時能依原始邏輯正常部署至 `C:\AppServ`。

### 議題二：PM2 啟動重複與服務覆蓋規範
- **裁決 (2A)**：
  貫徹「一律以本次安裝後的啟動為準」之原則，執行確定性冪等清空重建（Idempotent Clean & Restart）。
- **具體實作**：
  - 於 `tools/updater/src-tauri/src/pm2.rs` 實作 `idempotent_reconstruct_pm2_services`：在階段 4 重新配置服務前，先停止 WinSW 背景服務，強制執行 `pm2 delete all --no-color` 清空舊程序與既有註冊表。
  - 依據最新就緒之各模組 `ecosystem.config.js` 重新標準啟動，啟動完畢後執行 `pm2 save --force --no-color` 固化新狀態。
  - 重構 `audit_and_ensure_pm2_services` 與 `service_runner.js`：當部分服務離線時，強制使用 `--only <app_name>` 進行精準補啟動，徹底杜絕 cluster 模式 Worker 翻倍。

### 議題三：PHP 8.5 執行環境與 LAH-API 模組關聯性防呆
- **裁決 (3A)**：
  於 Updater UI 與執行日誌建立智慧型連鎖關聯與提示防呆。
- **具體實作**：
  - 當使用者選取 `php85` 且目標目錄尚未安裝 `LAH-API` 時，若更新包就緒自動連動勾選 `LAH-API.zip`。
  - 若使用者手動取消 `LAH-API.zip`，卡片即時顯示醒目警示「⚠️ 僅選取 PHP 8.5 執行環境，目標主機未安裝 LAH-API 程式碼，更新後將不會啟動 lah-api-v85 服務」。
  - 點擊「開始執行更新作業」時，若條件符合同步於日誌視窗中輸出警告提示。

---

## 3. 決策後果與影響 (Consequences)

### 正面效益
1. **PM2 狀態確定性與穩定性**：徹底杜絕多重進程與 double instances，記憶體占用收斂至標準額度（FE: 2 instances, SCHEDULER: 1, WSS: 1）。
2. **消除維運認知落差**：清楚區分「PHP 8.5 Runtime」與「LAH-API 業務應用」，提供精準引導與自動連動。
3. **發布一致性**：確保打包時所有發布目錄產物完整齊全，維運同仁現場部署順暢。
