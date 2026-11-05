# 0017. Node 沙盒資安自檢之動態受管服務識別與多系統適配架構

- 日期：2026-11-05
- 狀態：Accepted
- 決策者：pyliu, Antigravity

---

## 1. 背景與問題脈絡 (Context)

可攜式 Node.js 沙盒監管工具（`tools/node-portable`）內建「資安邊界自檢」功能，依據 ADR 0007 規範驗證全域環境 PATH 零污染及受管服務之 HTTP 標頭指紋（過濾 `X-Powered-By` 與執行期版本）。

然而先前版本在 `audit.rs` 採用靜態常數 `MONITORED_PORTS`，固定寫死 LAH 體系之三大服務端口：
- Port 8080 (LAH-FE 智慧管控前端服務 (Nuxt))
- Port 8081 (LAH-WSS 即時通訊 WebSocket 服務)
- Port 8082 (LAH-WSS 即時通訊附件 HTTP 服務)

在公務機關實務部署中，Node 沙盒亦廣泛託管其他地政核心中介服務。例如伺服器 `220.1.34.221`（根目錄 `C:\DEV`）實際受管之 PM2 程序為 `tyland-monitoring-backend`，其在 Port 8082 提供 REST API 與 WebSocket 監測服務。在該伺服器點擊資安自檢時，產生以下嚴重失真：
1. **服務名稱錯置**：誤將 8082 標註為「LAH-WSS 即時通訊附件 HTTP 服務」，與實際運行的 `tyland-monitoring-backend` 不符。
2. **多測無關端口**：探測該機未運行的 8080 (LAH-FE) 與 8081 (LAH-WSS)，導致報告失真或產生誤警。
3. **報告抬頭僵化**：稽核報告固定冠名「智慧控管與監控系統」，無法為 `tyland-monitoring-backend` 等其他受管系統產出名實相符的佐證文件。

為使 Node 沙盒具備真正的多系統通用監管與精準自檢能力，需解耦硬編碼端口，改採動態程序關聯與智慧服務映射架構。

---

## 2. 決策方案評估 (Options Considered)

1. **方案 A：動態 PM2 程序關聯與智慧服務字典 (Adopted)**
   - 做法：自檢時即時讀取 PM2 程序清單（`query_pm2_processes`）。若包含 `tyland-monitoring-backend`，動態鎖定 Port 8082「地政業務 API 監測服務 (tyland-monitoring-backend)」並將抬頭動態切換為「桃園地政業務 API 監控系統」；若包含 LAH 前端或即時通，則映射為 LAH 三大端口；若為未知通用 Node 服務，則依其進程 PID 透過作業系統動態探查實際監聽端口。
   - 優點：全自動零配置，使用者無需手動維護任何設定檔，在任何伺服器上執行皆能精確對齊當前真實受管進程。
   - 缺點：需具備程序狀態感知與解析備援邏輯。

2. **方案 B：外部設定檔驅動（audit_targets.json）**
   - 做法：於安裝根目錄讀取 JSON 設定檔定義受檢目標。
   - 缺點：增加維運同仁手動配置負擔，且現場若漏放設定檔易導致退回預設錯誤。

3. **方案 C：介面手動情境切換**
   - 做法：於 UI 提供下拉選單讓操作員手動選取「智慧管控系統」或「地政業務 API 監測服務」。
   - 缺點：依賴人工手動切換，無法自動化防呆。

---

## 3. 決策結果 (Decision Outcome)

採納 **方案 A**。

1. **多系統智慧感知與映射規則**：
   - **地政業務 API 監測情境**：當 PM2 受管程序清單包含 `tyland-monitoring-backend`（或路徑存在該專案）時：
     - 系統標題：`桃園地政業務 API 監控系統`。
     - 受檢目標：`Port 8082`，服務名稱：`地政業務 API 監測服務 (tyland-monitoring-backend)`。
     - 排除不相關之 8080 與 8081 探測。
   - **智慧管控與即時通情境**：當 PM2 程序包含 `fe` / `lah-fe` 或 `lah-messenger` 時：
     - 系統標題：`智慧控管與監控系統`。
     - 受檢目標：Port 8080 (LAH-FE)、Port 8081 (LAH-WSS WebSocket)、Port 8082 (LAH-WSS 附件 HTTP)。
   - **通用服務動態感知**：非上述已知字典之服務，透過進程 PID 查詢實際監聽端口（LocalPort），自動加入檢測。
   - **離線或查無程序備援**：若 PM2 查無執行中程序，檢查目錄結構（如 `tyland-monitoring-backend` 資料夾）做為備援判定。

2. **核心模型與介面擴充**：
   - `SecurityAuditReport` 結構體新增 `system_title: String` 欄位。
   - 自檢報告純文字檔（`security_audit_report.txt`）與 UI 彈窗標題動態載入對應之系統名稱與進程識別。

3. **HTTP 探針與指紋檢測規範**：
   - 維持以標準 `GET / HTTP/1.1` 探測本機迴路端口。
   - 嚴格檢驗 `X-Powered-By`、`Server` (node/express) 與執行期版本標頭外洩，符合資安規範。

---

## 4. 影響與相容性說明 (Consequences)

- **向下相容性**：既有 LAH 智慧管控系統伺服器（8080/8081/8082）維持完全相同之檢測標準與產出，不受任何破壞性影響。
- **維運效益**：徹底解決伺服器 `220.1.34.221`（`tyland-monitoring-backend`）名實不符問題，產出具有法律與資安效益之正式佐證報告，消除稽核缺失。
- **擴充性**：後續若有新 Node.js 系統納入可攜沙盒管轄，均可透過本機制自動辨識或擴充服務字典。
