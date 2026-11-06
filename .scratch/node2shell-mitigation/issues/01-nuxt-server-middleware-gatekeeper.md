# 01: LAH-FE 應用層 serverMiddleware 內聯編碼守門員

**交付內容**:  
於 `LAH-FE/nuxt.config.js` 之現有 `serverMiddleware` 內聯函式中擴充 Node2Shell (CVE-2026-111497) 防禦邏輯。當傳入請求之 `content-encoding` 含有 `br` 時，直接回傳 `415 Unsupported Media Type` 並中斷請求，防止潛在惡意 Brotli 壓縮 Body 進入底層解碼器。

**前置依賴 (Blocked by)**: 無（可立即開始）

**驗收標準 (Acceptance Criteria)**:
- [x] `LAH-FE/nuxt.config.js` 中的 `serverMiddleware` 保留既有 `x-powered-by` 標頭移除邏輯。
- [x] 內聯檢查 `req.headers['content-encoding']`，若包含 `br`（大小寫不拘）則回傳 HTTP 415 狀態碼與資安錯誤說明，並立即調用 `res.end()` 中斷，不調用 `next()`。
- [x] 若無 `content-encoding` 或為其他合法編碼（如 `gzip`），正常執行 `next()` 放行。
- [x] 執行 `yarn lint` 通過，無 ESLint 語法或格式錯誤。

**建議驗證方式**:
- `cd LAH-FE; yarn lint`
- 透過 Node.js 模擬請求測試 `serverMiddleware` 函式邏輯，確認 `br` 請求回傳 415，一般請求調用 `next()`。
