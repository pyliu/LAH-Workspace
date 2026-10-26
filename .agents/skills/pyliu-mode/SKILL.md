---
name: pyliu-mode
description: "適用於 pyliu、/pyliu-mode，或要求以 pyliu 的個人工作模式與開發慣例執行任務時。"
disable-model-invocation: true
---

# Pyliu 模式（Pyliu mode）

本技能定義使用者在 LAH 智慧控管與監控系統工作區的工作模式與工程慣例。隨附技能位於相對於本檔案的 `../<name>/SKILL.md`。

## 回應風格（Response style）

- 全程使用台灣繁體中文與台灣慣用資訊術語（專案、伺服器、資料庫、陣列、物件、非同步、呼叫、程式碼、套件、部署）輸出。
- 每一則回覆與文件皆套用 [`unslop`](../unslop/SKILL.md) 規範：句子簡短直白、禁用破折號（`—`）、不寫客套開場與空泛總結。
- 提及任何檔案、類別或函式時，一律附上可點擊的 `file://` 連結。
- 前端 UI 介面文字、按鈕標籤、日期選擇器與提示訊息一律使用繁體中文。

## 需求對齊與自主程度（Understand first & Autonomy）

- **開放式需求與複合指令兩階段對齊**：面對整頁體驗改版、跨模組新功能、測試規劃，或使用者下達 `/poteto-mode /grill-me`、`/tdd /grill-me` 複合指令時，先依循 [`grill-me`](../grill-me/SKILL.md) 流程透過 `ask_question` 提出結構化單選或多選題（首項標註 `(Recommended)`）。待使用者回覆 `GO`、`OK`、`同意` 或 `套用` 放行後，再依 [`poteto-mode`](../poteto-mode/SKILL.md) 或 [`tdd`](../tdd/SKILL.md) 劇本動工。
- **明確問題直接修復**：面對明確的臭蟲修復、主控台報錯、編譯錯誤，或附帶螢幕截圖紅框與編號清單的視覺微調，免除反問，直接定位根因並修改程式碼。
- **遵守工作區安全護欄**：嚴格遵守工作區根目錄 [`AGENTS.md`](../../../AGENTS.md) 的安全紅線，包含強制維持 `LAH-API` 的 `MOCK=true`，以及禁止未經授權執行資料庫破壞性操作或安裝外部套件。

## 子代理調度（Subagents）

- 面對跨專案影響分析、多檔案搜尋或大規模調查時，依據 [`principle-guard-the-context-window`](../principle-guard-the-context-window/SKILL.md) 平行啟動唯讀子代理（`TypeName: "research"`，`Model: "inherit"`）收集證據，主對話僅保留精煉摘要。

## 程式碼與架構紀律（Code & Architecture discipline）

- **零額外外部套件**：不在 `package.json` 或 `composer.json` 新增外部依賴。優先複用專案既有元件（如 `lah-header`、`lah-button`、`lah-button-xlsx`、`lah-reg-b-table`）與 Mixin（如 `dynamic-height-mixin.js`）。外部單頁 HTML 工具或大型靜態腳本優先放置於 `static/` 目錄載入或內嵌。
- **雙軌與雙端對稱同步**：
  - 修改 [`LAH-API`](../../../LAH-API/AGENTS.md) 的 `www/api/*.php` 或 `www/include/*.class.php`（PHP 7.3/7.4 舊軌）時，必須同步更新 `API/v1/*.php` 與 `API/include/*.class.php`（PHP 8.5 `lah-api-v85` 新軌），並共用 `www/.env` 與 `www/assets/db/*.db` 單一真實來源。
  - 修改即時通功能或 WebSocket 協定時，同步確認 `lah-messenger-server`、`LAH-FE`（`components/lah-messenger-*.vue`）與 [`lah-messenger`](../../../lah-messenger/AGENTS.md)（Rust + Tauri v2 桌面端 APP）的雙向功能與視覺一致性。桌面端大型頁面（如 `home.vue`）控制在 600 行以內，拆分為獨立子元件與平級專責 Mixins（`renderer/mixins/home-*.js`）。
  - 修改側邊欄時，同步檢查並更新一般版 `lah-sidebar.vue` 與管理員版 `lah-sidebar-admin.vue`；全域輔助工具優先收納於側邊欄底部，保持頂部導覽列簡潔。
  - 涉及跨課室切換、全所公告發布與人員設定編輯時，必須實作管理員權限檢查（如 `isAdmin`、`isNotifyMgtStaff`）。
- **前端版面與環境相容**：
  - 遵守 [`LAH-FE/AGENTS.md`](../../../LAH-FE/AGENTS.md) 規範（包含 `lah-header` 主標題 `h3`、直屬操作控制項與「選單／家」按鈕等高對齊且不污染衍生彈出視窗、篩選條件變更時重設表格 `currentPage = 1`）。
  - 資料表格高度預設貼齊左下角 `.version` 元素下緣，預設每頁顯示 `15` 筆。若表格上方包含可折疊區塊（`<b-collapse>`），必須在 `@shown` 與 `@hidden` 動畫完成後重新計算表格高度。
  - 表格工具列的搜尋與快篩控制項靠右排列（順序為 `KEYWORD`、進階篩選、清除篩選），左側單列放置已選條件標籤。收件字號與關鍵操作按鈕加上防折行（`text-nowrap`）。
  - 實作複製到剪貼簿功能時，必須提供非 HTTPS 區域網路環境（`window.isSecureContext === false`）的 Fallback，並避開 BootstrapVue `b-modal` 的 `enforceFocus` 焦點攔截。
- **動態伺服器 IP 與路徑可攜性**：
  - 前端連線 API 或 WebSocket 時，動態以當前擷取到的 API 伺服器 IP 為準，最後才 Fallback 至預設 IP，不寫死單一地政事務所 IP。
  - 編譯與打包腳本須相容 Windows Junction / Symlink 結構，並確保正式建置（`yarn build`）與開發伺服器（`yarn dev` 的 `.nuxt-dev`）互不衝突。

## 審查與實機驗證（Review and verify）

- 程式碼修改完成後，先執行對應的語法與 Lint 檢查（`php -l`、`node -c`、`yarn lint`）。
- 自動調用 [`verify-lah`](../verify-lah/SKILL.md) 透過無頭瀏覽器與 API 檢查驗證實際執行結果，確認畫面渲染、元素對齊與主控台零報錯。
- **沿用既有開發服務**：執行驗證前先偵測本機已啟動的服務（如使用者自行啟動的 `LAH-FE` `yarn dev`、常駐 Apache 2.4 或筆電端 `run_dev_http.bat`），直接沿用既有服務，不重複啟動或關閉使用者的開發程序。

## 開發流程與 Git 規範（Process）

- **先實測驗收、後手動下令推送**：完成修改與自動化驗證後，先向使用者回報結果並等待實機驗收，不在修改完成的同一回合自動執行 `git commit` 或 `git push`。
- **繁體中文完整修改歷程**：待使用者明確下達「推送到 Git」或提交指令後，依 [`AGENTS.md`](../../../AGENTS.md) 第 4.3 節與 [`technical-writing`](../technical-writing/SKILL.md) 規範，分別進入有變更的獨立 Git 儲存庫，以台灣繁體中文撰寫結構化 Commit 訊息（Conventional Commits 標題、修改目的、具體修改項目與檔案清單、相容性說明）後提交並推送。

## 分層治理與文件同步（Docs, Skills & Rules）

- **分層 `AGENTS.md` 治理**：當使用者在對話中糾正了專案慣例、雙軌同步規則或環境差異時，依據 [`principle-encode-lessons-in-structure`](../principle-encode-lessons-in-structure/SKILL.md) 主動提議或同步將規則寫入根目錄 [`AGENTS.md`](../../../AGENTS.md)、子專案 `AGENTS.md`、子目錄專屬 `AGENTS.md`（如 [`LAH-API/www/AGENTS.md`](../../../LAH-API/www/AGENTS.md)、[`LAH-API/API/AGENTS.md`](../../../LAH-API/API/AGENTS.md)）或對應技能檔中固化。
- **重構與架構變更後主動同步文件**：完成大型元件拆分、架構遷移、新增部署壓縮包規格或變更路徑與埠號時，主動檢查並同步更新對應的 `README.md`、元件專屬說明檔（如 `home.vue.md`）、離線技術手冊（如 `migration.html`）與各層級 `AGENTS.md`。
