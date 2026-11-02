# 0007. 可攜 Node.js 沙盒安全防護、版本隱匿邊界與資安稽核策略

- 日期：2026-11-02
- 狀態：Accepted
- 決策者：pyliu, Antigravity

---

## 1. 背景與問題脈絡 (Context)

系統前端（`LAH-FE`）與即時通訊伺服器（`lah-messenger-server`）採用可攜式 Node.js 16.20.2 運行。由於 Node.js 16 已於 2023 年 9 月進入 End-of-Life (EOL)，公務機關與外部資安稽核（包含弱點掃描工具如 Nessus、資安弱掃、GCB 檢核與主機審查）常針對此版本提出安全疑慮或開立弱點改善單。

為確保系統在各所平穩運作，需明確界定 `node-portable` 維運部署工具在「完成時期服務所呈現之安全邊界」與「防範版本被偵測」的具體邊界與實作處置手段。

---

## 2. 決策方案評估 (Options Considered)

1. **方案 A：二進位竄改與偽裝（竄改 node.exe PE 標頭 / 改名為其他進程）**
   - 做法：使用工具修改 `node.exe` 檔案屬性之 Product Version，或將其更名為 `lah-service.exe`。
   - 缺點：竄改 PE 標頭極易觸發作業系統防毒軟體（Windows Defender / EDR）的檔案雜湊毀損或惡意軟體報警；且特權憑證弱掃仍可藉由二進位特徵碼辨識出底層版本，屬於無效且高風險的偽裝，違反資安真實防護原則。

2. **方案 B：外部邊界標頭過濾 + 沙盒隔離佐證 + 稽核報告白名單處置 (Adopted)**
   - 做法：
     1. **全域指令隔離**：維持 `node-portable` 既有零全域污染沙盒隔離，不將路徑寫入系統或使用者 `PATH`，主機命令列 `node -v` 不受影響。
     2. **網路邊界特徵清洗**：在 `LAH-FE` 與 `lah-messenger-server` 的 HTTP 邊界徹底關閉 `X-Powered-By` 標頭與關閉例外錯誤呼叫棧（Stack Trace）外洩。
     3. **安全自檢與稽核報備**：`node-portable` 工具增設資安自檢能力，於安裝驗證或手動檢驗時自動掃描服務端口標頭，並產出專屬沙盒架構說明報告，供資訊同仁正式提報資安單位備查。
     4. **長遠根本升級**：將執行期升級（Node 20 LTS）排入中長期技術藍圖，徹底解除 EOL 疑慮。

---

## 3. 決策結果 (Decision Outcome)

採納 **方案 B**。

1. **防護範圍劃分**：
   - 外部網路探測（黑箱弱掃）：透過關閉 HTTP 標頭與錯誤棧完全防護。
   - 一般終端檢測（CLI 稽核）：透過零全域污染沙盒架構完全防護。
   - 主機特權弱點掃描（白箱稽核）：透過沙盒專屬環境報告與白名單正式報備處置，嚴禁二進位偽裝。

2. **邊界清洗實作項目**：
   - `lah-messenger-server`：Express 伺服器注入 `app.disable('x-powered-by')`，攔截 unhandled error。
   - `LAH-FE`：Nuxt 設定過濾 `X-Powered-By`，統一生產環境錯誤頁面。

3. **node-portable 工具能力擴充**：
   - 於驗證階段加入 HTTP 標頭安全探測，並於 UI 主介面提供獨立「資安邊界自檢」按鈕。
   - 支援產出沙盒隔離與資安自檢報告檔（`logs/security_audit_report.txt`）。
   - 於專案產出正式資安說明文件：`docs/security/node-portable-sandbox-specification.md`。

---

## 4. 影響與相容性說明 (Consequences)

- **介面相容性**：僅移除 HTTP 傳輸層之指紋標頭，不影響既有 REST API 資料結構與 WebSocket 通訊協定。
- **維運效益**：提供資訊同仁面對內部與外部稽核時的合法合規佐證文件，消除不必要的資安缺失告警。
- **後續追蹤**：後續應評估 Native Addon（如 `better-sqlite3`）在 Node 20 LTS 下的編譯相容性，以規劃中長期核心升級。
