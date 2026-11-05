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

**探活與容錯切換 (Probe & Failover)**:
客戶端於連線逾時（3.5 秒）或連線異常時，自動依序切換至下一個候選主機進行重試之韌性機制。  
_避免使用_: 重試, 輪播

**初次安裝自動偵測填入 (First-Install Auto-Discovery)**:
當同仁初次安裝或本機快取尚未設定伺服器 IP 時，即時通客戶端自動輪巡各所候選主機並將首台可用主機自動填入並保存之引導機制。  
_避免使用_: 自動註冊, 自動設定

**既有設定優先原則 (Saved Host Precedence)**:
若本機已有儲存或手動設定之伺服器 IP，即時通一律嚴格以該設定為主，不得在離線或重啟時擅自自動漫遊切換或覆蓋同仁設定。  
_避免使用_: 鎖定主機, 固定設定

**智慧管控前端 (Smart Management FE)**:
指 `./LAH-FE/`，提供即時案件進度看板、排程監控與內嵌即時通元件（`lah-messenger-*.vue`）之 Web 控制台。  
_避免使用_: 官網, 前台

**管理儀表板 (Management Dashboard)**:
指 `./LAH-Updater/tools/dashboard/`，以 Tauri 2 與純 HTML/JS 構建之指標優先（Metrics-Centric）監控桌面中樞，整合主機硬體指標、端口健康探針、就地服務快控、即時日誌流與核心組態編輯器。  
_避免使用_: 監控台, 戰情後台

**維運部署工具 (Updater & Maintenance Tools)**:
指 `./LAH-Updater/`，以 Tauri 2 (Rust) 與 Python 構建之離線安裝、打包、備份與服務管理套件工具庫。  
_避免使用_: 安裝包, 腳本庫

**可攜沙盒環境 (Portable Sandbox Environment)**:
指 `./LAH-Updater/tools/node-portable` 於主機建置之獨立 Node.js 與 PM2 隔離目錄（預設為 `<根目錄>\node`），採零全域變數污染原則，不登錄系統 PATH，僅供受管服務程序讀取。  
_避免使用_: 綠色版目錄, 私有 Node

**資安邊界自檢 (Security Boundary Audit)**:
指由維運工具或排程自動探測受管服務端口之 HTTP 回應標頭與沙盒狀態，驗證未洩漏敏感執行期特徵並產出合格佐證文件之檢核機制。  
_避免使用_: 漏洞檢查, 標頭測試

---

**API 雙軌機制 (API Dual-Track Mechanism)**:
指智慧管控系統前端（`LAH-FE`）支援即時切換後端 API 服務軌道（PHP 7.4 穩定舊軌 Port 80 ↔ PHP 8.5 現代化新軌 FastCGI Port 8085），透過前端 Axios 請求攔截器動態改寫端點路徑（`/api/*.php` ↔ `/LAH-API/api/*.php`）以利平滑演進與無中斷灰度驗證。  
_避免使用_: 雙核心, 雙版本

**戰情儀表板代理路徑 (Dashboard Proxy Routes)**:
指前端戰情儀表板透過 Nuxt 內建 `proxy`（基於 `http-proxy-middleware`）轉發至遠端主機之專屬監控代理路由（如 `/l05proxy` 轉發至建物圖籍主機、`/smsproxy` 轉發至簡訊主機），其網路通訊嚴格獨立於本地 `LAH-API` 雙軌調度邏輯之外。  
_避免使用_: 轉發路由, 監控接口

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

**自包含備援釋出 (Embedded Fallback Deployment)**:
指維運工具內部透過靜態二進位內嵌技術（如 Rust `include_bytes!`）封裝關鍵維運產物（如 `智慧控管與監控系統 - 管理儀表板.exe` 或 `lah-service.exe`）。當外部安裝目錄或暫存資料夾因人員操作缺漏時，系統自動啟動內嵌備援進行無損釋出，確保零外部相依。  
_避免使用_: 硬編碼, 內置安裝

**PM2 冪等重建 (PM2 Idempotent Reconstruction)**:
指於系統升級或配置覆蓋時，一律先強制清除舊有或重疊之 PM2 程序登記（`pm2 delete all`），再依據最新生態系設定檔統一標準啟動，最後強制作業系統保存（`pm2 save --force`），確保無論執行多少次皆收斂至確定之單一執行狀態。  
_避免使用_: 暴力重啟, 殺死重來

**情境快選設定檔 (Scenario Presets)**:
指自動安裝與更新工具依據地政機關標準維運手冊所收納之一鍵預設勾選範本（包含「全新安裝」全量佈署與「原地升級」PHP85+Node+API 雙軌遷移），一鍵精確連動安裝包選取清單與系統服務註冊設定，免除人工逐一勾選之出錯風險。  
_避免使用_: 預設按鈕, 快捷選項

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

## 5. 前端編譯與執行期術語 (Frontend Build & Runtime)

**Node 應用程式二進位介面 (Node ABI / Runtime Version)**:
Node.js 原生 C++ 擴充模組（如 `node-sass`）與底層 V8 引擎約定之二進位相容版本號。不同主版本號之 Node.js 對應不同 ABI（例如 Node 16 為 93，Node 26 為 147）。當原生模組未提供對應 ABI 之二進位檔時將引發崩潰。  
_避免使用_: Node版本, 模組編號

**Dart Sass (sass)**:
由 Sass 官方主導維護之純 JavaScript 樣式編譯器實作，不依賴本機 C++ 編譯或平台專屬二進位庫，具備跨 Node.js 執行期版本的完全相容性。  
_避免使用_: 舊版Sass, LibSass


---

## 6. 現代化前端架構過渡術語 (Frontend Modernization & Transition)

**Nuxt Bridge (@nuxt/bridge)**:
Nuxt 官方提供之漸進式過渡框架層。允許 Nuxt 2 (Vue 2) 應用程式在不重構現有業務程式碼（維持 Options API）的前提下，將底層打包器自 Webpack 4 升級至 Webpack 5 或 Vite，並導入 Nitro 引擎，使其具備原生運行於現代 Node.js (Node 18 至 Node 26+) 之能力。  
_避免使用_: Nuxt升級包, 過渡外掛

**Nitro 伺服引擎 (Nitro Engine)**:
Nuxt 官方之輕量跨平台伺服器引擎，提供統一之伺服器中介層、路由、快取與靜態資源傳輸標準，全面支援現代 Node.js 執行期與非同步生命週期。  
_避免使用_: 伺服器端, 後端引擎

---

## 7. 系統發布與更新維運術語 (Release & Maintenance Lifecycle)

**系統更新說明 (System Release Notes / 系統更新說明.txt)**:
統整全系統五大子專案在特定釋出週期內之重大架構演進、資安防護、子系統變更條目與現場主機部署 SOP 之純文字說明檔。由更新工具介面讀取展示，並經由打包管線派送至 NAS 分享區。  
_避免使用_: 更新檔, 說明書, changelog

**發布錨點 (Release Anchor)**:
自動化萃取跨專案 Git Commit 歷程時所記錄之前次發布基準點（包含各儲存庫之 Commit Hash 與時間戳紀錄）。做為計算「本次更新異動範圍」之下界起點，避免重複包含歷史提交或漏列更新。  
_避免使用_: 時間標籤, 檢查點, tag

**差異化維運警示 (Subproject-Differentiated Operational Alerts)**:
在全系統標準 SOP 基底之上，依據本次實際打包異動之子專案清單，動態向現場管理師提示之專屬重啟、快取清除或連接埠探針關注指引。  
_避免使用_: 自訂SOP, 分流說明

---

## 8. 跨版本資料庫橋接術語 (Cross-Version Database Bridge)

**雙通道 OCI8 橋接 (Dual-Channel OCI8 Bridge)**:
指 PHP 8.5 現代化軌道（`LAH-API/API/`）在連線舊版 Oracle 9i 資料庫時，優先透過 Apache `mod_php7` 本機迴路（HTTP Loopback）借用長駐之 `oci8_11g` 執行查詢，並於 HTTP 通道不可用時自動退回（Fallback）至環境變數隔離之 PHP 7.4 CLI 子程序（`proc_open`）的雙層韌性中介機制。  
_避免使用_: 轉接頭, 外掛連線, 代理查詢

**全二進位透明封裝 (Binary-Transparent Envelope)**:
指跨 PHP 版本橋接通訊時，將請求端之 SQL 語句、綁定參數及回應端之欄位名稱（Keys）、欄位資料值（Values）與錯誤訊息全面以 Base64 編碼傳輸之協定規範，確保內含 `CP950` (Big5) 雙位元組內碼或造字之資料在跨越 JSON 序列化邊界時零失真且不觸發 `JSON_ERROR_UTF8`。  
_避免使用_: 字串打包, JSON轉碼

**雙重本機鎖 (Dual Loopback Guard)**:
指內部 HTTP 橋接端點（`/api/ora_bridge.php`）同時強制驗證「實體來源 IP 必須為本機迴路且無代理轉發標頭」與「基於共用 `.env` 金鑰計算之 HMAC-SHA256 請求簽章」的雙層資安防禦邊界。  
_避免使用_: 本機白名單, 內部驗證

**連線能力守門員 (Reachability Gatekeeper)**:
指 `OraDBWrapper` 與系統探針在發起 Oracle 查詢前，綜合判定「原生 `oci8` 擴充或雙通道 OCI8 橋接至少其一就緒」且「目標資料庫網路埠可達」之前置檢查機制。  
_避免使用_: 連線檢查, ping測試


---

## 9. 系統效能與資源治理術語 (Performance & Resource Governance)

**工作子程序連線回收閾值 (Worker Connection Recycling Threshold / MaxConnectionsPerChild)**:
指 Apache `mpm_winnt` 單一工作子程序（Worker Process）在累計服務達指定 TCP 連線次數後，由父程序優雅輪替（Graceful Recycle）並釋放累積之 `mod_php7` 執行緒配置器的內建機制。  
_避免使用_: 強制重啟, 砍進程

**執行緒配置器水位上限 (Thread Allocator Free Cap / MaxMemFree)**:
指 Apache 每個工作執行緒之 APR 記憶體配置器（Allocator）在完成請求後最多保留不歸還作業系統的空閒記憶體容量上限（單位 KB）。  
_避免使用_: 記憶體限制, 快取大小

**雙層記憶體防護閘 (Dual-Layer Memory Guard)**:
指第一層由 Apache `mpm_winnt` 內建 `MaxConnectionsPerChild` 與 `MaxMemFree` 於子程序內部無感回收記憶體，第二層由系統守護程序（`service_runner.js`）依記憶體水位閾值執行保護性重啟的雙保險治理架構。  
_避免使用_: 定時重開, 排程殺進程

---

## 10. 終端網路識別與虛擬網卡過濾術語 (Client Network Identity & Virtual NIC Filtering)

**有效公務網卡位址 (Effective Office NIC Address)**:
指桌面客戶端排除虛擬網卡（VMware、Hyper-V、WSL、VirtualBox、VPN 等）與本機迴路介面後，經由作業系統出站路由探測（Outbound Route Probe）或地政事務所優先網段（`192.168.[10..89].x`）遴選出唯一用於代表該操作員終端機之實體 IPv4 位址。  
_避免使用_: 本機IP, 第一張網卡IP, 隨機網卡位址

**虛擬網卡雜訊過濾 (Virtual NIC Noise Filtering)**:
指即時通客戶端與後端 IP 同步機制在採集本機網路介面時，透過介面識別名稱黑名單與虛擬閘道位址特徵（如 `.1` 虛擬主機端點與 `.254` 交換器閘道），攔截非實體辦公網段 IP 進入 `IPResolver.db` 與 `dimension.db` 之防禦機制。  
_避免使用_: IP白名單, 網卡刪除

---

## 11. 跨系統沙盒治理與資安自檢術語 (Cross-System Sandbox Governance & Security Audit)

**地政業務 API 監測服務 (Tyland Monitoring Backend / tyland-monitoring-backend)**:
指於伺服器（如 `220.1.34.221`）以 Node.js 實作並監聽 Port 8082 之地政核心 API 監測與 WebSocket 服務端，受可攜 Node 沙盒與 PM2 守護管轄。  
_避免使用_: 即時通附件服務, 前端伺服器

**動態服務資安自檢 (Dynamic Service Security Audit)**:
指維運工具自動依據當前 PM2 受管進程實體識別動態推導受檢端口與服務定義，進行 HTTP 指紋過濾與沙盒零污染驗證之機制。  
_避免使用_: 固定端口檢測, 靜態掃描

**沙盒內嵌維運指南 (Embedded Sandbox Guidance)**:
指於維運控制台介面直接內嵌之零全域污染架構規範、常用 PM2 終端指令速查與快照固化 SOP，免除現場操作人員攜帶或翻閱外部文件之負擔。  
_避免使用_: 幫助文件, 說明書頁面

**大螢幕工作台佈局 (Large-Screen Studio Layout)**:
指維運工具偵測到桌面視窗最大化或高解析度空間時，自動將單欄緊湊表單切換為左右雙欄並列與內嵌即時日誌串流之響應式展現模式。  
_避免使用_: 全螢幕模式, 大版面

**內嵌即時日誌流 (Inline Live Log Stream)**:
指於監管控制台主畫面直接掛載受管進程日誌檢視終端，點選進程即刻於當前頁面輸出最新狀態，免除彈窗阻斷之整合機制。  
_避免使用_: 頁面日誌, 嵌內log
**縱向彈性填滿佈局 (Vertical Flexbox Fill Layout)**:
指維運工具於大螢幕或全螢幕視窗環境下，透過 CSS Flexbox `height: 100vh; flex: 1;` 將主工作台日誌終端與左側配置區縱向撐滿，消弭底部空白之佈局策略。  
_避免使用_: 滿版拉伸, 垂直填滿

**大螢幕字體縮放級距 (Large-Screen Typography Scaling)**:
指介面隨視窗擴展至工作台規格時，全域基準字體與按鈕 padding 適度放大 1px 至 1.5px，兼具高解析度易讀性與專業儀表板精緻度之比例調整機制。  
_避免使用_: 大字體, 全局放大
