---
name: verify-lah
description: "驅動並驗證 LAH 智慧控管與監控系統工作區（涵蓋 LAH-FE Nuxt 2 網頁前端、LAH-API PHP 7.3 REST API、lah-messenger-server WebSocket/HTTP 附件伺服器、lah-messenger 桌面端與 LAH-Updater 工具）。適用於修改 LAH 任一子專案後進行實機驗證、跨專案介面契約檢查、擷取瀏覽器 ARIA 快照與螢幕截圖證據，或執行 /maintain-verification-skill。"
---

# Verify LAH Workspace（LAH 工作區跨專案實機驗證技能）

本技能提供一套無須人工介入、可直接由代理（Agent）冷啟動執行的腳本化驗證方法，用於啟動並驅動 `lah-workspace` 內的核心服務與使用者介面，並擷取可稽核的驗證證據（螢幕截圖、ARIA/DOM 快照、REST API 與 WebSocket/SQLite 實機回應）。

> **安全紅線與雙開發環境識別（必讀）**：
> 1. **強制 MOCK 模式**：啟動或呼叫 `LAH-API` 前，必須確認 `./LAH-API/www/.env` 中 `MOCK=true`，且 `/api/auth_json_api.php` 回傳 `configs.mock === true`。嚴禁對正式或測試環境 Oracle 9i 資料庫發起未授權連線或破壞性操作。
> 2. **SQLite 頻道隔離**：驗證 `lah-messenger-server` 的訊息寫入、刪除與附件上傳時，**一律強制使用 `verify_test_` 開頭的隔離測試頻道**（如 `verify_test_run`），嚴禁清空或汙染既有開發頻道資料庫（如 `lds.db`、`inf.db`、`announcement.db`）。
> 3. **雙開發環境識別（事務所開發 PC 常駐 Apache 2.4 vs 筆電折衷 `run_dev_http.bat`）**：
>    - **事務所開發 PC（標準環境）**：已安裝常駐型 **Apache 2.4 + PHP** 服務（程序名稱 `httpd`）監聽 Port `80`。在此環境下，`launch` 會自動偵測並直接沿用常駐 Apache，`cleanup` **絕不停止 `httpd`**。
>    - **筆電開發環境（折衷方案）**：因未安裝常駐型 Apache，才透過 `./LAH-API/www/run_dev_http.bat`（執行 `php.exe -S 0.0.0.0:80 -t .`）啟動 PHP 內建單執行緒開發伺服器。`launch` 僅在 Port `80` 無服務監聽時才會退回使用此折衷方案，且在筆電折衷模式下需注意 PHP 內建伺服器為**單執行緒（Single-threaded）**，不支援 `.htaccess` 且同時間僅能處理單一請求（若後端發生對自身 `:80` 的 Loopback HTTP 呼叫會死鎖），不可將 `run_dev_http.bat` 誤認為正式或事務所標準架構。
> 4. **優先沿用並保護使用者已啟動之前端開發環境（`LAH-FE` `yarn dev`）**：
>    - 使用者無論在筆電或事務所開發 PC，通常會自行啟動 `LAH-FE` 前端開發環境（`yarn dev` 監聽 Port `8080`）。
>    - `launch` 檢測到 Port `8080`（或 `:8081`）已有啟動中的服務時，**一律直接沿用，絕不重複啟動**；且在 `.state/pids.json` 中標記 `spawnedByUs: false`，確保執行 `cleanup` 時**原樣保留使用者自行啟動的前端開發環境，絕不誤砍**。

---

## 1. 啟動（Launch）

使用內建輔助腳本 [`scripts/control-lah.js`](scripts/control-lah.js) 檢查並補齊工作區驗證所需服務與無頭瀏覽器（Headless Chrome CDP）：

```powershell
node .agents/skills/verify-lah/scripts/control-lah.js launch
```

- **服務拓撲與連接埠（智慧偵測，已啟動則不重複啟動）**：
  - `LAH-API`（PHP 7.3 REST API）：`http://127.0.0.1:80`
    - **事務所開發 PC**：自動偵測到 Port `80` 常駐 `httpd`（Apache 2.4）時直接沿用，略過 `run_dev_http.bat`。
    - **筆電開發環境**：當 Port `80` 未被占用時，才會退回執行 `./LAH-API/www/run_dev_http.bat`（`php.exe -S 0.0.0.0:80 -t .`）折衷方案，並於 `cleanup` 時回收該臨時 `php` 進程。
  - `LAH-FE`（Nuxt 2.15.8 智慧管控前端）：`http://127.0.0.1:8080`
    - **已啟動（常態）**：使用者通常已在筆電或事務所 PC 自行啟動 `yarn dev`；`launch` 偵測到 Port `8080` 已在監聽時會直接沿用，不會再自行啟動，且 `cleanup` 時亦會保留該進程。
    - **未啟動**：僅在 Port `8080` 閒置時才會由測試架代為啟動（並於 `cleanup` 時回收）。
  - `lah-messenger-server`（Node.js 即時通伺服器）：WebSocket 監聽 `ws://127.0.0.1:8081`，附件 HTTP API 監聽 `http://127.0.0.1:8082`（若使用者已啟動則同樣直接沿用並於 `cleanup` 保留）。
  - `Headless Chrome CDP`（瀏覽器控制測試架）：監聽 `http://127.0.0.1:9222`，使用隔離設定檔目錄 `.agents/skills/verify-lah/.state/chrome-profile`。
- **就緒判定標準（Readiness）**：
  - 單純 Port 有回應不代表就緒（Nuxt 2 在 Webpack 編譯期間也會回傳 HTTP 200 的 Loading 畫面）。`launch` 會持續輪詢直到 `http://127.0.0.1:8080/` 回傳包含 `id="__nuxt"` 且不含 `nuxt_loading_screen` 的完整渲染 HTML，同時確認 `:80`、`:8081`、`:8082` 與 `:9222` 皆可正常服務後才返回。
- **關閉與拆除指令（Teardown）**：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js cleanup
  ```

---

## 2. 健康檢查（Doctor）

在第一次驅動前、切換工作階段前，或任何驅動步驟出現異常時，立即執行唯讀健康檢查：

```powershell
node .agents/skills/verify-lah/scripts/control-lah.js doctor --json .agents/skills/verify-lah/artifacts/doctor.json
```

`doctor` 會依序驗證以下 6 項不變量（任一失敗即回傳非零結束代碼 `1`）：
1. `./LAH-API/www/.env` 中明確設定 `MOCK=true`。
2. 實機呼叫 `POST http://127.0.0.1:80/api/auth_json_api.php`（`type=login&req_ip=127.0.0.1`）回傳 `status === 1` 且 `configs.mock === true`。
3. `GET http://127.0.0.1:8080/` 回傳 HTTP 200 且包含已就緒的 `__nuxt` 應用程式結構。
4. `ws://127.0.0.1:8081` 接受 WebSocket 連線並對 `register` 命令回傳 `ACK -1`（`success: true`）。
5. `GET http://127.0.0.1:8082/api/attachments/lds/1` 回傳 HTTP 200 且 JSON `status === 1`。
6. `GET http://127.0.0.1:9222/json/version` 回傳有效的 Headless Chrome CDP 版本資訊。

### 跨子專案靜態語法檢查

針對包含未啟動桌面端（`lah-messenger`）或部署工具（`LAH-Updater`）的程式碼修改，可執行跨專案靜態語法檢查（涵蓋 `php -l`、`node -c`、`python -m py_compile`）：

```powershell
node .agents/skills/verify-lah/scripts/control-lah.js static --json .agents/skills/verify-lah/artifacts/static-check.json
```

---

## 3. 驅動（Drive）

透過 `control-lah.js` 提供的三大驅動器（`browser`、`api`、`ws`）操作真實應用程式表面。所有面向使用者的功能配方請參閱 [`features/README.md`](features/README.md)。

### 3.1 瀏覽器 UI 驅動器（`browser` — 操作 `LAH-FE` `:8080`）

- **導覽至指定路由**：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser goto http://127.0.0.1:8080/reg --wait-ms 2500
  ```
- **等待特定文字或選擇器出現**：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser wait --text "智慧控管系統" --timeout 10000
  ```
- **點擊按鈕、連結或互動元素**（優先使用可見文字 `--text`、`--role` + `--name` 或穩定屬性選擇器 `--selector`）：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser click --text "時效流程控管"
  node .agents/skills/verify-lah/scripts/control-lah.js browser click --selector ".bars-button"
  ```
- **填寫輸入框（自動觸發 Vue 2 `v-model` 的 `input`/`change` 事件）**：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser fill --placeholder "搜尋功能、關鍵字" --value "外國人"
  ```
- **傳送鍵盤按鍵**（例如 `/` 聚焦搜尋、`Escape` 清除搜尋）：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser press Escape
  ```
- **擷取 ARIA / 互動元件與頁面文字快照**：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser snapshot --path .agents/skills/verify-lah/artifacts/sample/page.aria.txt
  ```
- **擷取 PNG 螢幕截圖**：
  ```powershell
  node .agents/skills/verify-lah/scripts/control-lah.js browser screenshot --path .agents/skills/verify-lah/artifacts/sample/page.png
  ```

### 3.2 後端業務 REST API 驅動器（`api` — 操作 `LAH-API` `:80`）

直接以 UTF-8 表單編碼呼叫 `./LAH-API/www/api/*.php` 並擷取結構化 JSON 證據：

```powershell
node .agents/skills/verify-lah/scripts/control-lah.js api auth_json_api.php --data type=login --data req_ip=127.0.0.1 --json .agents/skills/verify-lah/artifacts/sample/auth-login.json
node .agents/skills/verify-lah/scripts/control-lah.js api user_json_api.php --data type=search_user --data keyword=HAADMIN --json .agents/skills/verify-lah/artifacts/sample/search-user.json
```

### 3.3 即時通 WebSocket 與附件驅動器（`ws` — 操作 `lah-messenger-server` `:8081` / `:8082`）

所有寫入與附件測試強制使用 `verify_test_*` 隔離頻道，避免影響正式或開發頻道資料：

```powershell
# 1. 發送訊息至隔離頻道 verify_test_run
node .agents/skills/verify-lah/scripts/control-lah.js ws send --channel verify_test_run --sender HAADMIN --content "自動化驗證測試訊息" --json .agents/skills/verify-lah/artifacts/sample/ws-send.json

# 2. 以第二個唯讀客戶端連線查詢該頻道最新訊息，證明 SQLite 持久化成功
node .agents/skills/verify-lah/scripts/control-lah.js ws latest --channel verify_test_run --limit 5 --json .agents/skills/verify-lah/artifacts/sample/ws-latest.json

# 3. 針對該訊息 ID 上傳附件（自動遵守 channel -> message_id -> file 欄位順序契約）
node .agents/skills/verify-lah/scripts/control-lah.js ws upload --channel verify_test_run --message-id 1 --file .agents/skills/verify-lah/artifacts/sample/ws-send.json --json .agents/skills/verify-lah/artifacts/sample/ws-upload.json

# 4. 查詢該訊息的附件清單
node .agents/skills/verify-lah/scripts/control-lah.js ws attachments --channel verify_test_run --message-id 1 --json .agents/skills/verify-lah/artifacts/sample/ws-attachments.json
```

---

## 4. 證據（Evidence）

所有驗證產物一律存放於 `.agents/skills/verify-lah/artifacts/<feature-id>/` 目錄下（該目錄已加入 `.agents/skills/verify-lah/.gitignore`，不會弄髒 Git 版控狀態，且在 `cleanup` 後完好保留）。

**合格證據標準**：
1. **真實使用者路徑**：UI 驗證必須透過瀏覽器實際渲染與互動（點擊、輸入、路由切換），不得僅靠直接修改 Vuex Store 內部狀態冒充。
2. **動作與結果並存**：每個驗證旅程必須同時保存「操作動作或初始狀態」與「操作後的最終狀態」。
3. **雙重感官產物（UI）**：每個 UI 驗證點必須同時產出 `.aria.txt`（包含當前 URL、頁面標題、可見互動控制項與頁面文字摘要）與 `.png` 螢幕截圖。
4. **第二視角持久化驗證（Mutations）**：任何新增訊息、上傳附件或釘選常用功能的操作，都必須透過「重新載入頁面」或「第二個唯讀查詢客戶端（如 `ws latest`、`ws attachments`）」確認副作用確實落盤。

---

## 5. 清理（Cleanup）

每次驗證執行完畢（或中途失敗重試前），必須執行清理指令：

```powershell
node .agents/skills/verify-lah/scripts/control-lah.js cleanup
```

`cleanup` 的精確行為保證：
- **精準終止進程（嚴格保護使用者既有開發環境）**：依據 `.state/pids.json` 中的 `spawnedByUs` 紀錄，**僅終止由本次 `launch` 代為啟動的程序**（如 Headless Chrome CDP `:9222` 或測試架臨時補啟動的服務）。**若使用者在執行驗證前已自行啟動 `LAH-FE`（`yarn dev` `:8080`）、`lah-messenger-server`（`:8081`/`:8082`）或常駐 Apache（`httpd` `:80`），`cleanup` 一律原樣保留，絕不誤砍**。
- **清除隔離測試資料**：自動刪除 `./lah-messenger-server/db/verify_test_*.db*` 測試資料庫與 `./lah-messenger-server/uploads/verify_test_*` 測試附件目錄，確保零殘留。
- **保留驗證證據**：清理過程只移除 `.agents/skills/verify-lah/.state/`，**絕不刪除 `.agents/skills/verify-lah/artifacts/` 下的任何證明檔案**。

---

## 6. 輔助腳本（Helpers）

- [`scripts/control-lah.js`](scripts/control-lah.js)：單一零外部設定之 Node.js 跨專案控制腳本，整合服務生命週期管理（`launch` / `doctor` / `cleanup`）、Headless Chrome CDP 驅動器（`browser`）、LAH-API 客戶端（`api`）、lah-messenger-server WebSocket 與 Multipart 附件客戶端（`ws`），以及跨專案靜態語法檢查器（`static`）。所有呼叫範例均已直接列於上方章節與 [`features/`](features/README.md) 功能地圖中。
