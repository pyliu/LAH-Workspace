# 12. Nuxt 2 運行於現代 Node.js (v20-v26) 之可行性評估與 Nuxt Bridge 遷移策略

- **狀態**：提議中 (Proposed)
- **日期**：2026-11-02
- **決策者**：LAH 架構組、操作員

---

## 背景與問題脈絡 (Context)

智慧管控系統前端 [LAH-FE](file:///c:/Temp/DEV/LAH-Workspace/LAH-FE) 目前基於 Nuxt 2.15.8 與 Vue 2.6 建構。
隨著地政內部維運與開發主機 Node.js 環境逐步邁向現代 LTS（如 Node 20, 22 乃至前沿的 Node 26），Nuxt 2 遭遇以下根本性相容斷層：

1. **框架與打包器壽命終止 (EOL)**：
   Nuxt 2 已於 2024 年 6 月 30 日終止支援，其核心綁定之 Webpack 4 無法相容於 Node 17+ 引入之 OpenSSL 3.0 加密演算法（MD4 雜湊報錯），且依賴多項於 Node 21+ 廢棄的底層 API（如 `punycode`）。
2. **C++ 原生二進位模組斷層**：
   `node-sass 8.0.0` 與早前之 SQLite 套件無法載入至 Node 26（ABI 147）。
3. **死依賴殘留**：
   經代碼檢驗，`better-sqlite3` 與 `sqlite3` 在 `LAH-FE` 業務程式碼中完全零引用，純屬歷史原型殘留，卻在套件安裝時引發編譯阻礙。

---

## 遷移途徑評估 (Evaluation of Paths)

| 評估維度 | 途徑 A：硬修補 (Patchwork) | 途徑 B：Nuxt Bridge (官方橋接) | 途徑 C：Nuxt 3 重構 (Full Rewrite) |
|---|---|---|---|
| **核心技術** | Nuxt 2 + Webpack 4 + OpenSSL 旗標 | @nuxt/bridge + Vue 2.7 + Webpack 5 | Nuxt 3 + Vue 3 + Vite + Nitro |
| **業務代碼改動** | 極低（幾乎不動） | 極低（95% 既有 Options API 無縫相容） | 極高（數百個元件、BootstrapVue 需全面重構） |
| **Node 20-26 支援** | 不穩定（未定義行為，隨時崩潰） | 良好（Webpack 5 原生支援現代 Node） | 原生原生支援 |
| **工程可行性** | 易引發隱性產線 Bug | **高度推薦（漸進遷移之最佳甜蜜點）** | 短期內不可行（成本巨大） |

---

## 決策內容 (Proposed Decision)

推薦採行 **途徑 B：Nuxt Bridge 漸進遷移**，核心策略如下：

1. **剔除歷史死依賴**：
   自 `LAH-FE/package.json` 徹底移除 `better-sqlite3` 與 `sqlite3`，並將 `node-sass` 替換為純 JS 的 `sass`。
2. **引入 `@nuxt/bridge` 橋接層**：
   升級至 Vue 2.7，全面繼承現行 Vue 2 Options API 業務邏輯，毋須重寫為 Composition API。
3. **優先配置 Webpack 5 引擎**：
   在 `nuxt.config.js` 中設定 `bridge: { nitro: true, vite: false }`，採用 Webpack 5 取代 Webpack 4。由於現有系統深度採用 `bootstrap-vue: 2.23.0`，Webpack 5 能提供極佳之 CommonJS 模組互通性，避免 Vite 引起的 CJS 解析相容性問題。
4. **雙軌驗證關卡**：
   建立獨立實驗分支 `feat/nuxt-bridge-poc` 進行相容性與打包驗證，確保正式伺服器與開發機均能平滑運行於 Node 18 至 Node 26。

---

## 影響與取捨 (Consequences)

### 正面效益
- 徹底解除 Node.js 執行期版本上限限制，原生相容 Node 18、20、22 與 26。
- 獲得 Webpack 5 與 Nitro 帶來的建置速度與伺服器效能提升。
- 保留所有 BootstrapVue 2 與既有業務邏輯，將改動範圍限制在設定檔與建置層。

### 潛在取捨與因應
- **設定檔微調**：需將 `nuxt.config.js` 中的部分 Webpack 4 舊版自訂配置轉移至 Webpack 5 規範。
- **排程與發布套件重組**：正式伺服器之發布打包檔（`LAH-NUXTJS.zip` 與 `node_modules`）需重新產出並通過實機驗證。
