# 0016: 即時通虛擬網卡雜訊過濾、單一出站路由 IP 遴選與舊版 Electron 程式碼清理

**狀態**: 已採納 (Accepted)  
**日期**: 2026-11-04  

### 決策背景與脈絡
桃園即時通（`lah-messenger`）啟動時會透過 `local_ip_address::list_afinet_netifas()` 列舉本機所有 IPv4 網路介面，並於 `add_ip_entry` 迴圈中將每一張網卡的 IP 逐一發送至後端 `ip_json_api.php` 寫入 `IPResolver.db`。當資訊課或開發人員電腦裝有 VMware（如 `VMnet8` `192.168.17.1`、`VMnet1` `192.168.86.1`）、Hyper-V、WSL、VirtualBox 或第二張實體網卡時，虛擬網卡網段恰好落入各所優先網段（`192.168.[10..89].x`），導致 `dimension.db` 使用者靜態 IP 綁定至虛擬網卡位址或觸發多 IP 衝突，使操作員在連線 `LAH-FE` 時因來源 IP（如 `192.168.13.96`）比對落空而被降級為「訪客」。此外，`lah-messenger` 早已完成 Rust + Tauri v2 底層遷移，但儲存庫中仍留存已不再執行的 Electron 舊版主程序目錄（`main/`、`app/`）、過時工具檔（`renderer/assets/js/ip.js`）與 `package.json` 依賴宣告。

### 決策內容與原因
1. **介面識別名稱黑名單過濾（Virtual NIC Noise Filtering）**：於 `lah-messenger`（`src-tauri/src/commands/sysinfo.rs`）採集本機 IPv4 網卡時，檢查網路介面名稱（不分大小寫）並排除包含 `vmware`、`vmnet`、`vethernet`、`wsl`、`hyper-v`、`virtualbox`、`vbox`、`docker`、`tailscale`、`zerotier`、`wireguard`、`tap`、`tun`、`npcap`、`bluetooth`、`loopback` 等虛擬或隧道介面，同時排除第四碼為 `.254`（交換器閘道）及常見虛擬主機 `.1` 位址。
2. **UDP 零封包出站路由探測優先（Outbound Route Probe）**：結合 `std::net::UdpSocket` 對目標 API 伺服器（或地政局內部網段端點）執行非阻塞路由綁定探測（`bind("0.0.0.0:0")` 後 `connect` 取 `local_addr().ip()`），直接取得作業系統路由表實際用於連往地政伺服器的有效公務網卡位址（Effective Office NIC Address）。若探測所得位址通過虛擬網卡過濾，優先將其選為代表 IP；否則才退回地政局 `192.168.[10..89].x` 網段排序遴選。
3. **單一最佳公務 IP 回報**：將 `add_ip_entry` 由「迴圈回報本機所有網卡」改為「僅回報唯一遴選出之有效公務網卡位址」，與 `get_userinfo` 的 `final_ip` 完全一致。
4. **移除舊版 Electron 程式碼與依賴**：刪除 `lah-messenger/main/`、`lah-messenger/app/` 與 `renderer/assets/js/ip.js`，將 `renderer/plugins/electron-shim.js` 簡化為純 Tauri v2 IPC + Web Mock 轉接層（保留 `$ipcRenderer` 與 `window.electron` 介面契約），並清理 `package.json` 中的 Electron/Nuxtron 套件與腳本。

### 取捨與後續影響 (Consequences / Trade-offs)
- **正面影響**：徹底杜絕 VMware、WSL、VirtualBox 等虛擬網卡與多網卡雜訊寫入 `IPResolver.db` 與 `dimension.db`，確保 `LAH-FE` 與 `LAH-API` 依來源 IP 識別操作員身分與課室權限的準確性；將客戶端每次啟動的 IP 回報請求數由 N 次縮減為 1 次；並消除專案內雙套桌面框架並存的維護負擔。
- **取捨與防禦縱深**：針對尚未更新客戶端版本的舊版即時通，同步於後端 `LAH-API`（`SQLiteUser::isPriorityIp`）排除 `.254` 與常見虛擬網卡 `.1` 位址，形成前後端雙重防禦。
