# ADR 0010: PM2 生態系設定檔工作目錄自動修補與執行期目錄隔離策略

- **狀態 (Status)**: 已通過 (Accepted)
- **日期 (Date)**: 2026-11-02
- **決策者 (Deciders)**: 使用者 (User), Antigravity Agent

---

## 1. 背景與脈絡 (Context)

在智慧控管與監控系統之舊版伺服器（如 `\\220.1.34.75\C$\AppServ\`）執行原地升級時，發現 `LAH-WSS`（即時通訊伺服器）未正常啟動，檢視 `install.log` 出現以下錯誤：

```text
[2026-11-02 18:49:29] [INFO] 🚀 正在以標準配置啟動 [即時通訊伺服器 (LAH-WSS)]：C:\AppServ\lah-messenger-server\ecosystem.config.js...
[2026-11-02 18:49:31] [WARNING]   ⚠️ 啟動 [C:\AppServ\lah-messenger-server\ecosystem.config.js] 回傳警示: [PM2] cron restart at 0 7 * * *
[PM2][WARN] Applications LAH-WSS not running, starting...
 [PM2][ERROR] Error: Script not found: C:\temp\v1.9.9\server.js
```

追查根本原因：
1. **呼叫端工作目錄污染**：維運同仁自 `C:\temp\v1.9.9\` 啟動自動安裝與更新工具（`智慧控管與監控系統 - 自動安裝與更新工具.exe`），更新工具之行程工作目錄為 `C:\temp\v1.9.9\`。
2. **舊版生態系缺少 `cwd` 屬性**：目標伺服器之 `C:\AppServ\lah-messenger-server\ecosystem.config.js` 屬於早期部署版本，尚未包含 `cwd: __dirname`。原地升級預設不勾選 `lah-messenger-server.zip`（以保護頻道分庫 SQLite 資料庫與現行設定），因此該設定檔維持舊版狀態。
3. **PM2 相對路徑解析回退**：當設定檔缺少 `cwd` 宣告且 `pm2 start` 指令在未切換目錄下執行時，PM2 將進入點 `./server.js` 解析為相對於當前終端行程之工作目錄（`C:\temp\v1.9.9\server.js`），導致啟動失敗並標記為離線。

---

## 2. 決策方案 (Decisions)

貫徹 `principle-fix-root-causes`（修復根本原因）與 `principle-make-operations-idempotent`（確保操作冪等性），採行以下多層縱深防禦機制：

### 決策一：程序執行器強制工作目錄隔離
- **實作**：於 `tools/updater/src-tauri/src/system.rs` 擴充 `run_cmd_hidden_in_dir(cmd, args, dir)`，在衍生 Windows 子程序時明確綁定 `.current_dir(dir)`。
- **效果**：執行 `pm2 start <eco>` 時，強制將行程工作目錄鎖定在生態系設定檔所在子資料夾（如 `C:\AppServ\lah-messenger-server`），徹底切斷呼叫端暫存目錄對 PM2 執行期之污染。

### 決策二：生態系設定檔動態無害自動修補 (In-place Sanitization)
- **實作**：於 `tools/updater/src-tauri/src/pm2.rs` 實作 `sanitize_ecosystem_config(eco_path)`。在掛載啟動任何生態系設定檔前，若偵測其內容缺少 `cwd:`，立即於應用程式名稱（`name:`）行後方安全注入 `cwd: __dirname,\r\n`。
- **冪等性**：若設定檔已存在 `cwd:` 設定，則維持原樣不進行重複注入。
- **效果**：無論日後由終端手動、批次檔、或是 Windows 服務在任何工作目錄下重啟 PM2，`cwd: __dirname` 均能確保 PM2 正確鎖定專案根目錄。

### 決策三：系統常駐服務守護端同步加固
- **實作**：於 `tools/updater/service/service_runner.js` 新增 `sanitizeEcosystemCwd(validPath)`，並在 `spawnSync(PM2_BIN, ...)` 時加入 `cwd: appCwd`。
- **效果**：當 WinSW 背景服務在系統開機喚醒或巡檢補齊服務時，同樣具備目錄隔離與自動修補能力。

---

## 3. 決策後果與影響 (Consequences)

### 正面效益
1. **徹底解決原地升級進入點遺失問題**：舊版伺服器無須重新解壓縮即時通伺服器安裝包，亦能由更新工具自動修復工作目錄並順利在線。
2. **多重安全防線**：結合「子行程工作目錄鎖定」與「生態系設定檔持久化修補」，即使使用者手動在任意目錄輸入 `pm2 restart all` 亦不會崩潰。
3. **保護既有資料庫**：原地升級流程依然無須覆蓋 `lah-messenger-server.zip`，完好保留各所已累積之歷史頻道分庫 SQLite 與設定。
