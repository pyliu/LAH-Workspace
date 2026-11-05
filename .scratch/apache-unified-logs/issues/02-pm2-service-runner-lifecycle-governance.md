# 02: 常駐服務 pm2_service_runner.js 實作日誌生命週期治理巡檢

**交付內容**: 
於 24/7 開機自啟的系統級守護程序 `LAH-Updater/tools/node-portable/service/pm2_service_runner.js` 新增日誌生命週期治理常態巡檢函式 `auditLogLifecycle`。對 `logs/apache/` 與 `logs/` 之歷史日誌進行 Node 原生 Gzip 串流壓縮，並安全刪除超過 30 天之過期日誌與壓縮檔。

**前置依賴 (Blocked by)**: 無（可平行開始）

**驗收標準 (Acceptance Criteria)**:
- [ ] 判定歷史日誌：以檔名日期標籤小於今日者為歷史日誌，避免壓縮正在被 Apache 寫入之當日活躍檔案。
- [ ] 原生串流壓縮：使用 Node.js 核心內建 `zlib.createGzip({ level: 9 })`，串流壓縮完成無損後才安全移除原 `.log`。
- [ ] 30 天過期刪除：掃描 `logs/apache/` 與 `logs/` 下所有 `*.log` 與 `*.log.gz`，當最後修改時間（mtime）大於 30 天時安全刪除。
- [ ] 守護整合：於 `tick()` 主循環中加入節流防抖機制（例如每小時或跨日執行一次），並將重要治理事件寫入 `pm2-service-runner.log`。
- [ ] 建立專屬單元測試腳本 `tests/test_log_lifecycle.js` 驗證其沙盒模擬行為。

**建議驗證方式**:
- `node LAH-Updater/tests/test_log_lifecycle.js`
