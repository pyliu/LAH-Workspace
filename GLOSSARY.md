# LAH 系統全域領域詞彙表 (GLOSSARY)

本詞彙表定義桃園地政智慧管控與即時通訊系統（LAH 系統）在跨子專案協同開發時的核心業務術語與架構概念。

---

## 1. 地政業務核心術語 (Core Domain)

**案件 (Case)**:
地政事務所收件之登記、測量或地價業務單一處理單元，通常具備年度、字軌與流水案號。  
_避免使用_: 工單, 任務, 交易, 訂單

**事務所 (Land Office)**:
桃園轄區內各獨立運作之地方行政地政機關（含桃園、中壢、大溪、楊梅、蘆竹、八德、平鎮、龜山等 8 所）。  
_避免使用_: 分行, 部門, 站點

**操作員 (Operator)**:
登入智慧管控系統執行案件監控、跨所查詢或權限調度的內部地政公務人員。  
_避免使用_: 使用者, 客戶, 訪客

**權狀 (Title Deed)**:
證明不動產所有權或他項權利之法定紙本證書，為地政核心機敏產物。  
_避免使用_: 證書, 產權文件

---

## 2. 系統拓撲與架構術語 (System Topology)

**業務核心樞紐 (API Gateway / Hub)**:
指 `./LAH-API/`，負責承接前端所有地政核心 HTTP REST API 請求，為唯一具備連線 Oracle 9i 權限之服務端。  
_避免使用_: 後台, 伺服器

**推播頻道 (Broadcast Channel)**:
即時通訊中針對特定事務所、全區或群組建立之雙向長連線推播單元，其歷史訊息採獨立 SQLite 分庫（`db/<channel>.db`）儲存。  
_避免使用_: 聊天室, 房間, 群組

**候選伺服器陣列 (Candidate Server List)**:
各事務所即時通訊 WebSocket 與 API 伺服器之備援 IP 清單。桃園所具備新舊雙主機（`220.1.34.18` 與 `220.1.34.75`），其餘七所與局本部各配置一組正式主機。  
_避免使用_: 伺服器清單, 主機列表

**八所伺服器動態映射 (Eight-Office Dynamic Server Mapping)**:
前端智慧管控系統（`LAH-FE`）依據同仁登入所別（`site`）或後端回傳之主機資訊，自動自八所伺服器字典（`tySvrIp`）解析當前所屬轄區伺服器 IP 之動態綁定機制，杜絕單一所別 IP 寫死於程式碼。  
_避免使用_: 寫死IP, 固定網址

**探活與容錯切換 (Probe & Failover)**:
客戶端於連線逾時（3.5 秒）或連線異常時，自動依序切換至下一個候選主機進行重試之韌性機制。  
_避免使用_: 重試, 輪播

**智慧管控前端 (Smart Management FE)**:
指 `./LAH-FE/`，提供即時案件進度看板、排程監控與內嵌即時通元件（`lah-messenger-*.vue`）之 Web 控制台。  
_避免使用_: 官網, 前台

**維運部署工具 (Updater & Maintenance Tools)**:
指 `./LAH-Updater/`，以 Tauri 2 (Rust) 與 Python 構建之離線安裝、打包、備份與服務管理套件工具庫。  
_避免使用_: 安裝包, 腳本庫

---

## 3. 發布與部署術語 (Release & Deployment)

**發布資料夾 (Release Distribution Directory)**:
指開發機上供排程定時同步至公用 NAS 之發布基底目錄（`d:\DEV\@各所分享區\@智慧管控系統\@更新程式`）。  
_避免使用_: 共享夾, 輸出夾, 暫存夾

**版號發布資料夾 (Versioned Release Directory)**:
以前端智慧管控系統（`LAH-FE`）之 `package.json` 版本號（如 `v1.9.9`）動態建立之發布目標目錄，作為供公用 NAS 下載部署的最新標準版本容器。  
_避免使用_: 版本夾, 最新包目錄

**打包成品 (Packaged Artifacts)**:
指通過編譯與壓縮封裝後符合發布白名單（僅限 `*.txt`, `*.pdf`, `*.exe`, `*.zip`）的二進位產物與說明文件，明確排除非發布所需的圖解截圖（如 `*.jpg`）與除錯暫存檔。  
_避免使用_: 檔案, 打包結果

---

## 4. 桌面客戶端與顯示縮放術語 (Desktop Client & Display Scaling)

**邏輯像素 (Logical Pixels / DIP)**:
作業系統與 UI 框架定義的獨立設備像素（Device Independent Pixels），以 96 DPI 為基準（100%）。Tauri 視窗在設定檔中的寬度與高度預設採此單位。  
_避免使用_: 實體點, 原始點

**物理像素 (Physical Pixels)**:
顯示器硬體真實發光點個數，數值等於 `邏輯像素 * 縮放比率`。  
_避免使用_: 螢幕點, 顯示點

**螢幕工作區高度 (Available Work Area Height)**:
顯示器可供應用程式視窗完整展開的最大有效高度，為螢幕總解析度扣除 Windows 工作列與工作列停靠列後的實際可用區域。  
_避免使用_: 視窗高, 螢幕高

**縮放比率 (Display Scale Factor)**:
Windows 針對高解析度顯示器設定之版面放大乘數（如 100%、125%、150%），影響 Per-Monitor DPI-aware 視窗與 Web 控制項之渲染比例。  
_避免使用_: 放大倍率, 縮放參數

---

## 5. 監控與維運戰情面板術語 (Monitoring & Dashboard)

**AD 同步狀態監控 (AD Sync Status Monitor)**:
指戰情面板中監控 Active Directory 網域控制站目錄複寫作業之模組（`lah-monitor-board-adsync.vue`）。透過後端郵件快取解析 `repadmin /syncall` 執行日誌，以雙向嚴格比對機制確認目錄複寫作業完整終止且無任何網路或 RPC 錯誤。  
_避免使用_: AD檢查, 帳號同步

**目錄全分割區複寫 (SyncAll Replication)**:
Active Directory 針對所有目錄分割區（含 Schema、Configuration、DomainDnsZones、ForestDnsZones 與網域根節點）進行跨伺服器複寫之作業。日誌必須包含「SyncAll 完成」與「SyncAll 已終止，沒有錯誤」始判定為健康。  
_避免使用_: 全部同步, 資料庫複製

---

## 6. 即時通訊與訊息統計術語 (Messenger & Message Counting)

**核心未讀頻道 (Core Unread Channels)**:
即時通系統中計入操作員未讀總數之四大法定推播頻道：全所公告頻道（`announcement`）、全所公務交流頻道（`lds`）、所屬課室頻道（`userdept`，如 `inf`、`reg` 等）與個人私訊頻道（`userid`）。未讀統計採白名單加總機制，排除所有附屬公告、系統頻道與非所屬部門之頻道。  
_避免使用_: 聊天列表, 監控頻道, 訊息群組
