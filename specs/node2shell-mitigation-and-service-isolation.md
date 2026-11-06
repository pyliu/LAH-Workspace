# 功能規格書：Node2Shell (CVE-2026-111497) 縱深防禦、服務帳號降權與沙盒權限隔離

## 1. 問題陳述 (Problem Statement)

資安界揭露 Node.js 內建 Brotli 解壓縮模組之記憶體越界寫入重大缺陷「Node2Shell」（CVE-2026-111497，CVSS 9.2 Critical）。攻擊者可透過傳入帶有 `Content-Encoding: br` 之惡意 HTTP Request Body，誘發 Node.js 底層 C++ `libbrotli` 解碼器之記憶體毀損，導致服務阻斷（DoS）或遠端程式碼執行（RCE）。

在桃園地政智慧管控系統的既有運作架構中，面臨以下挑戰：
1. **框架升級不可行**：前端智慧管控系統（`LAH-FE`）基於 Nuxt 2 (Vue 2) SSR 構建，因相依套件與舊版 Webpack 綁定，短期內無法重構升級至 Node 20+ / Nuxt 3。
2. **背景服務特權過高**：WinSW 原生背景服務（`LAH_PM2_Service` / `PM2_Portable_Service`）目前未宣告 `<serviceaccount>`，在 Windows 預設以 `NT AUTHORITY\SYSTEM` 執行。一旦 Node 遭 RCE，攻擊者將立即取得本機作業系統完全控制權。
3. **外圍反向代理缺乏 Brotli 標頭過濾**：Apache 2.4 現有資安加固（Stage 3）已涵蓋 PHP2Shell (CVE-2024-4577) 與敏感檔案拒絕，但尚未具備針對傳入 `Content-Encoding: br` 請求之剝除機制。
4. **旁路直連直叩風險**：若內部網路或維運環境有流量繞過 Apache 直叩 Nuxt 2 SSR（Port 8080），缺乏應用層自衛阻絕機制。

---

## 2. 解決方案 (Solution)

依據架構決策紀錄（[ADR 0024](file:///d:/DEV/lah-workspace/docs/adr/0024-node2shell-cve-2026-111497-mitigation-and-service-isolation.md)），落實「外圍代理剝除、服務帳號降權、沙盒權限隔離、應用層自衛阻絕」四重縱深防禦架構：

1. **第一道：Apache 代理層標頭剝除（`LAH-Updater` 自動加固）**：
   於 `LAH-Updater` 之 `apache_conf.rs` 注入標準 Apache 2.4 條件過濾規則：偵測到傳入請求含有 `Content-Encoding: br` 時，透過 `RequestHeader unset Content-Encoding` 條件剝除。惡意 Payload 進入後端將被視為未壓縮純文字，於 JSON 解析時即拋出語法例外中斷，完全繞開底層易受害之 `libbrotli` 解碼器。
2. **第二道：WinSW 背景服務降權至 `NT AUTHORITY\LocalService`（`node-portable` & `LAH-Updater`）**：
   在 WinSW 服務定義（`lah-service.xml` 與 `pm2.rs`）中宣告 `<serviceaccount>` 為 `NT AUTHORITY\LocalService`，徹底消除 SYSTEM 特權。本服務降權精準限定於 Node/PM2 背景總線，維持 `LAH_Web_Service` (Apache) 現行模式，避免波及 Port 80 與 Oracle OCI 驅動載入。
3. **第三道：沙盒目錄 ACL 自動補齊（Least Privilege ACLs）**：
   於服務安裝與啟動流程中，由更新工具自動以 `icacls` 針對 PM2 與 Node.js 核心目錄（`<根目錄>\node`、`<根目錄>\.pm2`、`<根目錄>\logs`、`<根目錄>\LAH-NUXTJS`）遞迴授予 `LocalService` 之 `(OI)(CI)M` 修改權限，其餘系統核心目錄維持預設阻絕，將爆炸半徑完全鎖定在沙盒內。
4. **第四道：Nuxt 2 應用層 `serverMiddleware` 守門員（`LAH-FE` 自衛防禦）**：
   於 `LAH-FE/nuxt.config.js` 之現有 `serverMiddleware` 內聯擴充：偵測到傳入 `content-encoding` 含有 `br` 時，直接回傳 `415 Unsupported Media Type` 並中斷請求，提供旁路流量的微秒級自衛防護與明確日誌稽核軌跡。

---

## 3. 使用者故事列表 (User Stories)

1. **US1 (Apache 自動加固與標頭剝除)**：作為資安維運人員，我希望執行 `LAH-Updater` 時，工具能自動向 Apache `httpd.conf` 注入 Node2Shell 標頭剝除規則，以便於所有經由 Apache 轉發之後端請求皆無法攜帶 `Content-Encoding: br` 進入 Node.js。
2. **US2 (WinSW 服務降權至 LocalService)**：作為系統管理員，我希望 `node-portable` 與 `LAH-Updater` 所註冊之 PM2 背景服務以受限之 `NT AUTHORITY\LocalService` 運行，以便於徹底消除以 SYSTEM 高特權執行的資安隱患。
3. **US3 (沙盒目錄 ACL 自動補齊)**：作為現場工程師，我希望在服務安裝或更新時，系統能自動以 `icacls` 補齊 `LocalService` 對必要沙盒目錄的讀寫權限，以便於服務降權後能順暢啟動、寫入 PM2 IPC、日誌與快照，零手動調權。
4. **US4 (精準打擊與核心 Web 服務相容)**：作為系統架構師，我希望服務降權僅作用於 Node/PM2 總線，維持 Apache Web 服務現行模式，以便於確保 Port 80 知名通訊埠與 Oracle OCI 驅動連線百分之百穩定。
5. **US5 (Nuxt 2 應用層旁路阻斷)**：作為應用程式負責人，我希望在 `LAH-FE/nuxt.config.js` 內聯攔截帶有 `br` 編碼之請求並回傳 415，以便於即使流量繞過外層 Apache 直叩 Port 8080，也能在微秒級被拒絕，確保解碼器安全。
6. **US6 (維運自癒與等冪驗證)**：作為維運工程師，我希望自動更新工具與沙盒監管工具在重複執行時皆能自動偵測與自癒組態，以便於防止重複區塊堆疊與組態脫落。

---

## 4. 實作決策 (Implementation Decisions)

### 4.1 檔案與目錄結構

```text
LAH-Workspace/
├── specs/
│   └── node2shell-mitigation-and-service-isolation.md    # 本規格書
├── docs/adr/
│   └── 0024-node2shell-cve-2026-111497-mitigation-and-service-isolation.md  # 對應 ADR 0024
├── GLOSSARY.md                                            # 領域術語更新
├── LAH-FE/
│   └── nuxt.config.js                                     # serverMiddleware 內聯 415 阻斷防護
└── LAH-Updater/
    └── tools/
        ├── updater/
        │   ├── service/lah-service.xml                    # WinSW LocalService 設定範本
        │   └── src-tauri/src/
        │       ├── apache_conf.rs                         # Apache Node2Shell 緩解規則注入與 is_security_hardened 檢查
        │       ├── services.rs                            # 安裝/重啟前自動執行 icacls 補齊 ACL
        │       └── relocator.rs                           # 路徑遷移時同步確保 ACL
        └── node-portable/
            └── src-tauri/src/
                └── pm2.rs                                 # build_service_xml 注入 LocalService 與 setup_pm2_service 補齊 ACL
```

### 4.2 模組職責與介面契約

#### 1. `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs`
- **職責**：Apache 組態注入與語法等冪治理。
- **規則**：
  - 定義標記常數：
    ```rust
    const NODE2SHELL_BEGIN: &str = "# === Node2Shell (CVE-2026-111497 Brotli OOB Write) Mitigation ===";
    const NODE2SHELL_END: &str = "# === End Node2Shell Mitigation ===";
    ```
  - 注入區塊內容：
    ```apache
    # === Node2Shell (CVE-2026-111497 Brotli OOB Write) Mitigation ===
    <IfModule headers_module>
        <If "%{HTTP:Content-Encoding} =~ /br/i">
            RequestHeader unset Content-Encoding
        </If>
    </IfModule>
    # === End Node2Shell Mitigation ===
    ```
  - 於 `apply_apache_security_hardening` 中加入等冪替換邏輯（若已有區塊則比對更新，若無則追加）。
  - 更新 `is_security_hardened()` 函式，確認包含 `NODE2SHELL_END` 標記。

#### 2. `LAH-Updater/tools/updater/service/lah-service.xml` & `node-portable/.../pm2.rs`
- **職責**：WinSW 背景服務降權定義。
- **XML 契約**：
  ```xml
  <serviceaccount>
    <domain>NT AUTHORITY</domain>
    <user>LocalService</user>
  </serviceaccount>
  ```
- **目錄 ACL 授權函式契約（Rust）**：
  在 `services.rs` 與 `pm2.rs` 提供共用工具函式 `grant_service_account_acls(root_dir: &Path, log_fn: &dyn Fn(&str, &str))`：
  - 針對目錄：`<根目錄>\node`、`<根目錄>\.pm2`、`<根目錄>\logs`、`<根目錄>\LAH-NUXTJS`。
  - 執行指令：`icacls "<目錄>" /grant "NT AUTHORITY\LocalService:(OI)(CI)M" /T /Q`。
  - 執行時機：WinSW `install` 或 `start` 之前執行，確保權限即刻生效。

#### 3. `LAH-FE/nuxt.config.js`
- **職責**：Nuxt 2 SSR 應用層編碼守門員。
- **契約**：
  於現有 `serverMiddleware` 陣列首個函式內聯擴充：
  ```javascript
  serverMiddleware: [
    (req, res, next) => {
      // 1. 資安防護：隱蔽 HTTP 回應標頭
      if (res && typeof res.removeHeader === 'function') {
        res.removeHeader('x-powered-by')
        res.removeHeader('X-Powered-By')
      }
      // 2. Node2Shell (CVE-2026-111497) 應用層深度防禦：阻斷傳入之 Brotli 壓縮 Body
      if (req && req.headers) {
        const enc = req.headers['content-encoding']
        if (enc && /br/i.test(enc)) {
          res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('415 Unsupported Media Type: Brotli request body encoding is blocked for security.')
          return
        }
      }
      next()
    }
  ],
  ```

---

## 5. 測試與驗證決策 (Testing Decisions)

### 5.1 測試接縫與自動化測試

1. **接縫一：Rust 核心單元測試 (`cargo test`)**
   - 於 `apache_conf.rs` 新增單元測試 `test_node2shell_mitigation_injection_and_idempotency`：
     - 測試首次注入是否正確包含 `NODE2SHELL_BEGIN` 與 `<If "%{HTTP:Content-Encoding} =~ /br/i">`。
     - 測試重複執行時是否保持等冪（無重複區塊）。
     - 測試 `is_security_hardened()` 正確識別該標記。
   - 於 `pm2.rs` 新增單元測試 `test_build_service_xml_contains_localservice`：
     - 驗證生成的 XML 正確包含 `<user>LocalService</user>`。

2. **接縫二：Nuxt 2 前端語法檢驗與中介軟體驗證**
   - 執行 `yarn lint` 驗證 `nuxt.config.js` 符合 ESLint 規範。
   - 透過 Node.js 模擬或 `curl` 發送測試請求：
     - `curl -H "Content-Encoding: br" -X POST http://127.0.0.1:8080/` ➔ 驗證回傳 HTTP 415。
     - `curl -H "Content-Encoding: gzip" -X POST http://127.0.0.1:8080/` ➔ 驗證正常放行（不回傳 415）。

3. **接縫三：Apache 組態語法驗證**
   - 於包含 Apache 的實機或模擬目錄執行 `httpd.exe -t`，確認無語法錯誤（Syntax OK）。

4. **接縫四：實機驗證（verify-lah）**
   - 執行更新工具或沙盒工具，確認 PM2 服務以 `NT AUTHORITY\LocalService` 啟動且健康巡檢（Port 8080, 8081, 8082, 8085）全數 Online。

---

## 6. 不在範圍內 (Out of Scope)

1. **不更動 `LAH_Web_Service` (Apache) 的執行權限**：維持其現有模式，以保證知名通訊埠（Port 80）監聽與 Oracle Instant Client 驅動載入相容性。
2. **不強制改動作業系統防火牆（Windows Firewall）規則**：遵循盤問結論，避免對其他內網既有監控或除錯工具造成額外連線阻絕。
3. **不更動全域 Node.js 或升級 Nuxt 3 / Nitro**：維持現行 Node.js 16.20.2 綠色沙盒，杜絕 Dependency Hell。

---

## 7. 補充備註 (Further Notes)

- **Node 補丁二進位檔無痛替換**：若未來取得官方修復 CVE-2026-111497 之 Node 16.x LTS 執行檔，可透過 `pack.py --node` 打包至 `base/node.zip`，維運人員可直接覆蓋 `<根目錄>\node\node.exe`，達到二進位層級根本治本，並與外層三道防線無縫相輔相成。
- **Windows `icacls` 語言環境相容性**：`NT AUTHORITY\LocalService` 為 Windows NT 內建 SID `S-1-5-19` 的標準名稱，在繁體中文、英文版 Windows 均原生支援。
