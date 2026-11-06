# 03: WinSW 服務降權至 LocalService 與沙盒目錄 ACL 自動授權

**交付內容**:  
於 `node-portable` 與 `LAH-Updater` 中將 PM2 背景守護服務（`LAH_PM2_Service` / `PM2_Portable_Service`）之 WinSW 服務帳號配置為 `NT AUTHORITY\LocalService`，並於服務安裝與啟動流程前自動執行 Windows `icacls` 補齊沙盒目錄之 `(OI)(CI)M` 修改權限，徹底終結 SYSTEM 特權執行隱患。

**前置依賴 (Blocked by)**: 無（可立即開始）

**驗收標準 (Acceptance Criteria)**:
- [x] `LAH-Updater/tools/updater/service/lah-service.xml` 宣告 `<serviceaccount><domain>NT AUTHORITY</domain><user>LocalService</user></serviceaccount>`。
- [x] `LAH-Updater/tools/node-portable/src-tauri/src/pm2.rs` 的 `build_service_xml()` 動態生成相同的 `<serviceaccount>` 區塊。
- [x] 實作共用之目錄 ACL 授權函式：自動以 `icacls.exe` 針對 `<根目錄>\node`、`<根目錄>\.pm2`、`<根目錄>\logs`、`<根目錄>\LAH-NUXTJS` 授予 `NT AUTHORITY\LocalService:(OI)(CI)M`（若目錄存在則遞迴授權）。
- [x] 於服務安裝（`install`）或啟動（`start`）前自動調用 ACL 授權函式，確保背景服務具備必要之讀寫執行權限。
- [x] Apache Web 服務（`lah-web-service.xml`）維持原模式暫不更動。
- [x] 新增或更新 Rust 單元測試驗證 XML 產出正確性。
- [x] 執行 `cargo test --manifest-path LAH-Updater/tools/node-portable/src-tauri/Cargo.toml` 與 `LAH-Updater/tools/updater/src-tauri/Cargo.toml` 通過。

**建議驗證方式**:
- `cargo test --manifest-path LAH-Updater/tools/node-portable/src-tauri/Cargo.toml`
- `cargo test --manifest-path LAH-Updater/tools/updater/src-tauri/Cargo.toml`
