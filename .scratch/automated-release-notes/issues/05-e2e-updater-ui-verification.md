# 05: 更新工具介面驗證與端對端相容性巡檢 (E2E Updater UI Verification & Regression Audit)

**交付內容**: 驗證產出之 `dist/系統更新說明.txt` 在桌面更新工具（Tauri 2）內嵌對話盒中正常載入顯示，並執行既有測試套件確保打包管線零副作用。

**前置依賴 (Blocked by)**: 04 (pack.py 打包整合與事務性錨點更新)

**驗收標準 (Acceptance Criteria)**:
- [ ] 執行 `python pack/pack.py` 產出最新更新說明。
- [ ] 啟動 `dist/智慧控管與監控系統 - 自動安裝與更新工具.exe`，點擊「📖 更新說明」，驗證：
  - 對話盒能正確載入並展示最新文字內容。
  - 中文繁體無亂碼，80 字元等寬邊界與換行正常對齊。
  - 本期異動模組特別注意事項醒目呈現。
- [ ] 執行現有打包完整性守門員測試：`python -m unittest LAH-Updater/tests/test_pack_integrity.py`，保持全數通過。
- [ ] 執行全套新舊測試，確認整體系統健康無回歸缺陷。

**建議驗證方式**:
- 執行 `python -m unittest discover -s LAH-Updater/tests -p "test_*.py"` 驗證全套測試。
- 實際於本機啟動更新工具 EXE 點擊按鈕進行視覺化驗證。
