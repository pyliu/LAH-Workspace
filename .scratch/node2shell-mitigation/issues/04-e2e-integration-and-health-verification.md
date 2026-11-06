# 04: 跨專案端對端整合驗證與全系統健康檢查

**交付內容**:  
全面貫穿整合三大防禦層（Apache 標頭剝除、WinSW LocalService 降權、Nuxt 應用層 415 阻斷），執行語法檢查、單元測試、端對端模擬與健康檢查巡檢，確保系統於維持 Nuxt 2 SSR 運行下達成 100% 免疫與爆炸半徑收斂。

**前置依賴 (Blocked by)**: 01, 02, 03

**驗收標準 (Acceptance Criteria)**:
- [x] 執行 `LAH-FE` 前端程式碼檢查：`yarn lint` 零錯誤。
- [x] 透過測試請求驗證 Nuxt 2 應用層：帶有 `Content-Encoding: br` 之請求確實回傳 HTTP 415，一般請求與 gzip 請求正常放行。
- [x] 執行 `LAH-Updater` 與 `node-portable` 之所有單元測試，確認全數通過。
- [x] 驗證 Apache 組態語法（若環境中具備 `httpd.exe`，執行 `httpd.exe -t` 回傳 `Syntax OK`）。
- [x] 執行更新工具或沙盒工具乾跑或實機測試，驗證 PM2 服務能以 `LocalService` 正常讀寫 `.pm2` 與 `logs`，且五大 Port（80, 8080, 8081, 8082, 8085）全數 Online。

**建議驗證方式**:
- `yarn --cwd LAH-FE lint`
- `cargo test --manifest-path LAH-Updater/tools/updater/src-tauri/Cargo.toml`
- `cargo test --manifest-path LAH-Updater/tools/node-portable/src-tauri/Cargo.toml`
- 依照 `verify-lah` 規範進行實機巡檢驗證
