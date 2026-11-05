# 0019: 智慧管控前端 API 雙軌路由轉發之代理路徑隔離與 URL 錨定防護架構

**狀態**: 提議審核中 (Proposed)  
**日期**: 2026-11-05  

### 決策背景與脈絡
為加速系統現代化，智慧管控系統前端（`LAH-FE`）在 v1.9.9 導入了「API 雙軌切換控制台」（PHP 7.4 舊軌 `:80` ↔ PHP 8.5 新軌 `:8085` FastCGI）。當操作員或系統將全域軌道切換至 `php85` 時，Axios 請求攔截器（`plugins/customize-axios.js`）負責將傳入之 API 請求動態改寫為對接 Apache Alias 的 `/LAH-API/api/*.php`。

然而，線上伺服器（`\\220.1.34.75`）實機切換至 PHP 8.5 軌道後，戰情儀表板中的跨主機監控看板出現嚴重斷線異常：
1. **建物圖籍同步異動（L05 系統）**：持續顯示紅燈，提示 `❌ 無法取得 /l05proxy/api/v1/l05?limit=30 狀態資料`。
2. **地籍異動即時通監控（SMS 系統）**：持續顯示紅燈，提示 `❌ 無法取得 /smsproxy/api/v1/log LOG資料` 與排程未啟動。
3. **切回 PHP 7.4 舊軌立即恢復正常**。

經深入追查與實體網路連線探測，確認根本原因源於 `plugins/customize-axios.js` 請求攔截器的 URL 比對與替換邊界瑕疵：
- **條件過度寬鬆**：原程式碼採用 `config.url.startsWith('/api/') || config.url.includes('/api/')`，未將 Nuxt 內建之專屬反向代理前綴（如 `/l05proxy/`、`/smsproxy/` 等）進行邊界隔離。
- **替換未加錨定（Unanchored Replace）**：替換邏輯使用 `config.url.replace(/\/api\//, '/LAH-API/api/')`，導致 `/l05proxy/api/v1/l05` 與 `/smsproxy/api/v1/log` 中的 `/api/` 被意外置換為 `/LAH-API/api/`，形成 `/l05proxy/LAH-API/api/v1/l05` 與 `/smsproxy/LAH-API/api/v1/log`。
- **目標端 404**：Nuxt Proxy 剝除代理前綴後，向遠端監控伺服器（`220.1.34.17:8082` 與 `220.1.34.221:8082`）發送了不存在的 `/LAH-API/api/v1/...` 請求，造成遠端微服務回傳 404 Not Found。

### 決策內容與架構規範

1. **白名單防禦與系統邊界隔離 (Strict Boundary Guard & Whitelist)**：
   - 建立獨立輔助判定函式 `isLahApiRequest(url, baseURL)`，僅當請求明確屬於本機 `LAH-API` 伺服器之 PHP 業務端點時才納入 API 雙軌調度。
   - **明確排除清單 (Exclusion Criteria)**：
     - **代理路徑排除**：凡 URL 或 `baseURL` 包含 `proxy/`（如 `/l05proxy/`、`/smsproxy/`）或 `/srmas-weathermap/` 者，一律直接放行，嚴禁介入改寫。
     - **外部主機與通訊埠排除**：凡 URL 或 `baseURL` 指向非本機 API 之獨立服務埠號（如即時通訊 `:8081`、`:8082`，Grafana `:3000` 等），一律直接放行。
     - **RESTful 版本號排除**：凡 URL 帶有 `/api/v\d+/`（如 `/api/v1/`）者，為遠端微服務或監控 Agent 規格，不屬於 `LAH-API` 之 PHP 端點，一律直接放行。
     - **已完成改寫排除**：若 URL 已為 `/LAH-API/` 或 `/lah-api/` 開頭，不重複處理。
   - **合法納入清單 (Inclusion Criteria)**：
     - 相對路徑以 `/api/` 或 `api/` 開頭（且非代理路徑）。
     - 絕對路徑 `http(s)://...` 其主機名稱對應本地 API 伺服器（`apiHost` / `location.hostname`）且路徑根部為 `/api/`。

2. **精確開頭錨定替換 (Anchored URL Rewriting)**：
   - 改寫為 PHP 8.5 FastCGI 路由時，一律採用正則表達式起始錨定（`^`），徹底消除中間字串誤替換風險：
     - 相對路徑：`url.replace(/^\/api\//, '/LAH-API/api/')` 或 `url.replace(/^api\//, 'LAH-API/api/')`。
     - 絕對路徑：`url.replace(/^((?:https?:\/\/[^/]+)?)\/api\//, '$1/LAH-API/api/')`。

3. **模組覆寫解析器收緊 (Strict Target Track Resolver)**：
   - `resolveTargetTrack` 解析檔名正則表達式收緊為 `/(?:\/api\/|\/LAH-API\/api\/)([a-zA-Z0-9_-]+)(?:\.php)?/i`，確保僅針對實際存在的 PHP 模組名稱（如 `query_json_api`）查找微調覆寫設定，不再將 `/api/v1/` 中的 `v1` 誤判為模組名稱。

### 取捨與後續影響 (Consequences / Trade-offs)
- **正面效益**：
  - 徹底解決戰情儀表板在 PHP 8.5 軌道下 `/l05proxy` 與 `/smsproxy` 404 斷線問題，即時通監控與建物圖籍同步看板恢復穩定更新。
  - 將本地 API 雙軌機制與外部反向代理（Nuxt Proxy）徹底解耦，互不干擾。
  - 提升 Axios 請求攔截器的強韌度（Robustness），未來新增其他跨主機監控看板或代理路徑時具備免維護防禦能力。
- **相容性保證**：
  - 完全向下相容 PHP 7.4 舊軌，亦不影響現行即時通（`:8081`/`:8082`）與圖片上傳/串流端點。
