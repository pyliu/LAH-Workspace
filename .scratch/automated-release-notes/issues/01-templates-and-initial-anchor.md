# 01: 版面模板定義與錨點初始狀態 (Templates & Initial Anchor)

**交付內容**: 建立更新說明的標準排版範本與發布錨點初始 JSON 檔案，建立後續萃取引擎渲染與狀態保存之單一真相來源。

**前置依賴 (Blocked by)**: 無（可立即開始）

**驗收標準 (Acceptance Criteria)**:
- [ ] 於 `LAH-Updater/pack/templates/release_notes.tpl` 建立 UTF-8 CRLF 格式範本，包含：
  - Header：系統全域名稱、發布日期變數、版號變數、涵蓋週期變數。
  - 核心重點區：預留 `{{ALERT_SECTION}}` 差異化警示區塊。
  - 子系統條目區：預留 4 大模組清單佔位標記。
  - 底部 SOP：標準 4 步驟部署 SOP 與 5 大通訊埠巡檢清單（Port 80, 8085, 8080, 8081, 8082）。
- [ ] 於 `LAH-Updater/pack/.release_anchor.json` 建立初始錨點結構，自動探測或預填工作區 5 大 Repo 當前 HEAD Commit Hash 與版號，納入 Git 版控。
- [ ] 模板與 JSON 語法通過標準檢查，無殘留除錯標記。

**建議驗證方式**:
- 執行 `python -c "import json; json.load(open('LAH-Updater/pack/.release_anchor.json', encoding='utf-8'))"` 驗證 JSON 語法。
- 檢查 `release_notes.tpl` 是否具備清楚之佔位符變數。
