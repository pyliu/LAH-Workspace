# 02: LAH-Updater Apache 條件標頭剝除與等冪自癒加固

**交付內容**:  
於 `LAH-Updater/tools/updater/src-tauri/src/apache_conf.rs` 注入 Node2Shell (CVE-2026-111497) 標頭剝除規則，並整合至 `apply_apache_security_hardening` 與 `is_security_hardened` 檢驗引擎中，確保更新時自動等冪配置 Apache 2.4 條件剝除 `Content-Encoding: br`。

**前置依賴 (Blocked by)**: 無（可立即開始）

**驗收標準 (Acceptance Criteria)**:
- [x] 定義 `NODE2SHELL_BEGIN` 與 `NODE2SHELL_END` 標記常數。
- [x] 生成規則區塊：
  ```apache
  # === Node2Shell (CVE-2026-111497 Brotli OOB Write) Mitigation ===
  <IfModule headers_module>
      <If "%{HTTP:Content-Encoding} =~ /br/i">
          RequestHeader unset Content-Encoding
      </If>
  </IfModule>
  # === End Node2Shell Mitigation ===
  ```
- [x] `apply_apache_security_hardening` 具備等冪性：若已存在該標記區塊則進行比對與精準更新，未存在則自動注入，杜絕重複堆疊。
- [x] `is_security_hardened()` 函式將 `NODE2SHELL_END` 納入檢查條件。
- [x] 新增 Rust 單元測試 `test_node2shell_mitigation_injection_and_idempotency`，驗證首次注入、重複執行無變更、舊規則自癒與 `is_security_hardened()` 正確性。
- [x] 執行 `cargo test --manifest-path LAH-Updater/tools/updater/src-tauri/Cargo.toml` 全數通過。

**建議驗證方式**:
- `cargo test --manifest-path LAH-Updater/tools/updater/src-tauri/Cargo.toml apache_conf`
