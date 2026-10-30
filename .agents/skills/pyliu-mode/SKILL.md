---
name: pyliu-mode
description: "適用於 pyliu、/pyliu-mode，或要求以 pyliu 的個人工作模式與開發慣例執行任務時。"
disable-model-invocation: true
---

# Pyliu 模式（Pyliu mode）

本技能定義使用者在 LAH 智慧控管與監控系統工作區的工作模式與工程慣例。隨附技能位於相對於本檔案的 `../<name>/SKILL.md`。

## 回應風格（Response style）

- 全程使用台灣繁體中文與台灣慣用資訊術語（專案、伺服器、資料庫、陣列、物件、非同步、呼叫、程式碼、套件、部署、排程、批次檔、神網7派送、公務帳號、八個所、UNC 路徑）輸出。
- 每一則回覆與文件皆套用 [`unslop`](../unslop/SKILL.md) 規範：句子簡短直白、禁用破折號（`—` 或 `——`）、不寫客套開場與空泛總結。
- 提及任何檔案、類別或函式時，一律附上可點擊的 `file://` 連結。
- 排版偏好結構化 Markdown：表格、具體修改檔案清單與明確驗證結論。
- 面對方案抉擇時，提供具備比較基準的方案選項（如方案 A/B、方案 1/2）供使用者裁決。
- 若使用者糾正「改過頭」或「太過了」，立即精確微調回剛好範圍，不可過度縮減或過度擴張。
- 前端 UI 介面文字、按鈕標籤、日期選擇器與提示訊息一律使用繁體中文。

## 需求對齊與自主程度（Understand first & Autonomy）

- **重大任務兩階段對齊**：面對整頁體驗改版、跨模組新功能、測試規劃、架構拆分，或使用者下達 `/poteto-mode /grill-me` 複合指令時，先依循 [`grill-me`](../grill-me/SKILL.md) 流程透過 `ask_question` 提出結構化單選或多選題（首項標註 `(Recommended)`）。待使用者回覆放行或選定方案後動工。
- **漸進式授權與分層推進**：面對複雜安裝或重構時，依循使用者「先整合第一層」原則分階段交付驗收，避免一次冒進修改整體架構。
- **明確問題直接修復**：面對明確的臭蟲修復、編譯錯誤、單純版號調整或附帶具體測試路徑的微調，免除反問，直接定位根因並修改程式碼。
- **遵守工作區安全護欄**：嚴格遵守工作區根目錄 [`AGENTS.md`](../../../AGENTS.md) 的安全紅線，包含強制維持 `LAH-API` 的 `MOCK=true`，以及禁止未經授權執行資料庫破壞性操作或安裝外部套件。

## 子代理調度（Subagents）

- 面對跨專案影響分析、多檔案搜尋、對話歷史探勘或大規模調查時，依據 [`principle-guard-the-context-window`](../principle-guard-the-context-window/SKILL.md) 平行啟動唯讀子代理（`TypeName: "research"`，`Model: "inherit"`）收集證據，主對話僅保留精煉摘要。

## 程式碼、架構與維運紀律（Code, Architecture & Maintenance discipline）

- **零額外外部套件**：不在 `package.json` 或 `composer.json` 新增外部依賴。優先複用專案既有元件（如 `lah-header`、`lah-button`、`lah-button-xlsx`、`lah-reg-b-table`）與 Mixin（如 `dynamic-height-mixin.js`）。
- **後端雙軌對稱同步**：
  - 修改 [`LAH-API`](../../../LAH-API/AGENTS.md) 的 `www/api/*.php` 或 `www/include/*.class.php`（PHP 7.3/7.4 舊軌）時，同步更新 `API/v1/*.php` 與 `API/include/*.class.php`（PHP 8.5 `lah-api-v85` 新軌），並共用 `www/.env` 與 `www/assets/db/*.db` 單一真實來源。
  - 傳統根目錄 PHP 腳本平移至 `LAH-API/API/v1/`，由 Apache 閘道透明轉發。
- **LAH-Updater 維運工具庫規範**：
  - 模組化子目錄架構：每個工具設獨立目錄（`updater/`、`node-portable/`、`uninstaller/`、`backuper/`、`pack/`），產出之執行檔統一集中於根目錄 `dist/`。
  - 淘汰舊版 Python 原始碼，全面 Rust 化。
  - 根目錄提供繁體中文命名之一鍵建置批次檔（如 `建立自動更新工具.bat`、`建立可攜式NODE安裝工具.bat`）。
  - 更新套件三向分流：基礎服務包（`dist/base/`）、程式更新包（`dist/patch/`）、核心依賴包（`dist/node_modules/`），打包腳本 `pack/pack.py` 嚴格對齊此結構。
  - 可攜 Node 與 PM2 零全域污染：工具自給自足，嚴禁修改系統全域環境變數或污染一般 CMD 的 `node --version`，維運一律使用專屬沙盒終端 `lah-cmd.bat`。
  - 安裝根目錄動態適配：支援 `C:\AppServ` 或 `D:\AppServ` 等變動路徑，反向代理與腳本嚴禁寫死單一磁碟代號。
  - 介面純原生零 CDN 與緊緻無捲軸：100% 純原生 HTML/CSS/JS，視窗預設不可出現垂直捲軸，尺寸縮短到緊緻剛好不留死白；未偵測到 ZIP 壓縮包時強制禁用核取方塊並顯示 `cursor: not-allowed`。
  - 每個工具量身打造專屬圖示（`.ico`），嚴禁沿用通用圖示。
- **lah-messenger (Rust + Tauri v2) 桌面端紀律**：
  - 外部連結導向邊界：聊天室訊息內的外部 HTTP/HTTPS 與 LAN 連結導向系統預設瀏覽器開啟；內部路由、返回頻道、切換頁籤與錨點跳轉必須留在 WebView 內部處理，嚴禁跳出系統瀏覽器引發 404。
  - 權限控制：通知頁籤中的頻道切換選單與部門頻道切換僅限管理者（Admin）操作。
  - 八個所公務帳號白名單防護：正規表達式限制八個所公務帳號 `H[A-H]\d+`，阻擋 `ADMINISTRATOR` 等本機管理員帳號誤登入。
  - 拔除 WebView2 整合安裝：維持即時通桌面端安裝檔輕量化。
  - 維護 9 組地政事務所伺服器 IP 輪迴探測陣列。
- **Windows 維運排程與 PowerShell 腳本規範**：
  - 運行環境與編碼：原生 Windows PowerShell 5.1，檔案編碼嚴格維持 `CP950 / BIG5 + CRLF`。
  - 辦公時間限制：僅在公務上班時段與工作日執行巡檢，非辦公時間提早退出（Early Return）。
  - SYSTEM 帳號與 UNC 路徑存取：神網排程以 `NT AUTHORITY\SYSTEM` 執行時無法直接存取未認證 UNC 路徑，需透過 `filescan` 網域帳號掛載或複製到 `C:\Temp` 執行。
  - 批次檔注入空輸入穿透 `PAUSE`，避免無人值守時超時卡死；網路磁碟機中斷時具備自動重新掛載機制。
- **純離線說明手冊規範（No-CDN / Offline-first）**：
  - 手冊（如 `README.html`、`INSTALLATION.html`）必須為 100% 純原生 HTML/CSS/JS，絕對禁止引用外部 CDN，所有圖片與圖示收納於本機 `assets/img/`。手冊內建字體大小切換選單（一般、中、大，預設為「中」）。
- **前端版面與環境相容（LAH-FE）**：
  - 遵守 [`LAH-FE/AGENTS.md`](../../../LAH-FE/AGENTS.md) 規範（`lah-header` 主標題 `h3`、直屬操作控制項與「選單／家」按鈕等高對齊且不污染衍生彈出視窗、篩選條件變更時重設表格 `currentPage = 1`）。
  - 資料表格高度預設貼齊左下角 `.version` 元素下緣，預設每頁顯示 15 筆。表格上方包含可折疊區塊（`<b-collapse>`）時，在 `@shown` 與 `@hidden` 動畫完成後重新計算表格高度。
  - 表格工具列的搜尋與快篩控制項靠右排列（順序為 KEYWORD、進階篩選、清除篩選），左側單列放置已選條件標籤。收件字號與關鍵操作按鈕加上防折行（`text-nowrap`）。
  - 實作複製到剪貼簿功能時，提供非 HTTPS 區域網路環境（`window.isSecureContext === false`）的 Fallback，並避開 BootstrapVue `b-modal` 的 `enforceFocus` 焦點攔截。
- **動態伺服器 IP 與路徑可攜性**：
  - 前端連線 API 或 WebSocket 時，動態以當前擷取到的 API 伺服器 IP 為準，最後才 Fallback 至預設 IP，不寫死單一地政事務所 IP。
  - 編譯與打包腳本須相容 Windows Junction / Symlink 結構，並確保正式建置（`yarn build`）與開發伺服器（`yarn dev` 的 `.nuxt-dev`）互不衝突。

## 審查與實機驗證（Review and verify）

- **實測為憑（Measured vs Inferred）**：腳本跑完不等於運作正常。必須實測確認檔案到位、進程 PID 存在、日誌無報錯，絕不憑推論宣稱正常。
- 程式碼修改完成後，先執行對應的語法與 Lint 檢查（`php -l`、`node -c`、`yarn lint`）。
- 二進位產物實體驗證：Rust / Tauri 程式碼修改必通過 `cargo build --release` 實體編譯與產物輸出；Python 腳本通過 `py_compile`。
- 測試環境隔離：編譯輸出導向 `C:/Temp/cargo-target/`，測試檔案暫存於 `C:\Temp`，保護專案目錄整潔。
- 自動調用 [`verify-lah`](../verify-lah/SKILL.md) 透過無頭瀏覽器與 API 檢查驗證實際執行結果，確認畫面渲染、元素對齊與主控台零報錯。
- **沿用既有開發服務**：執行驗證前先偵測本機已啟動的服務（如使用者自行啟動的 `LAH-FE` `yarn dev`、常駐 Apache 2.4 或筆電端 `run_dev_http.bat`），直接沿用既有服務，不重複啟動或關閉使用者的開發程序。

## 開發流程與 Git 規範（Process & Git）

- **先實測驗收、後手動下令推送**：完成修改與實測驗證後，先向使用者回報結果並等待實機驗收。未收到使用者明確下達「`寫完整繁體中文修改歷程後提交並推送到 Git`」等指令前，絕不擅自執行 `git commit` 或 `git push`。
- **提交前文件同步**：重大變更或版本發布提交前，必須同步更新根目錄及子專案的 `CHANGELOG.md` 與 `README.md`。
- **繁體中文完整修改歷程**：待使用者下達提交指令後，依 [`AGENTS.md`](../../../AGENTS.md) 第 4.3 節規範，分別進入有變更的獨立 Git 儲存庫，以台灣繁體中文撰寫結構化 Commit 訊息（Conventional Commits 標題、修改目的、具體修改項目與檔案清單、相容性說明）後提交並推送。
- **排除暫存檔入庫**：備份檔、臨時紀錄與編譯快取嚴禁納入版控追蹤。

## 分層治理與文件同步（Docs, Skills & Rules）

- **分層 `AGENTS.md` 治理**：當使用者在對話中糾正了專案慣例、雙軌同步規則或環境差異時，依據 [`principle-encode-lessons-in-structure`](../principle-encode-lessons-in-structure/SKILL.md) 主動提議或同步將規則寫入根目錄 [`AGENTS.md`](../../../AGENTS.md)、子專案 `AGENTS.md`、子目錄專屬 `AGENTS.md`（如 [`LAH-API/www/AGENTS.md`](../../../LAH-API/www/AGENTS.md)、[`LAH-API/API/AGENTS.md`](../../../LAH-API/API/AGENTS.md)）或對應技能檔中固化。
- **實戰教訓固化（Lesson Learnt to Rules）**：遭遇重要踩坑經驗（如 Apache 跨磁碟遷移反向代理、Node/PM2 環境隔離、SYSTEM 帳號排程 UNC 存取失敗）後，主動將防護沉澱進根目錄 `AGENTS.md` 第 14 節與相關技能中。
- **兄弟模組主動巡查**：一個核心模組升級時，主動巡查關聯的周邊工具，確保生態架構與介面邏輯對齊。
- **重構與架構變更後主動同步文件**：完成大型元件拆分、架構遷移、新增部署壓縮包規格或變更路徑與埠號時，主動檢查並同步更新對應的 `README.md`、元件專屬說明檔（如 `home.vue.md`）、離線技術手冊（如 `migration.html`）與各層級 `AGENTS.md`。
