---
name: principle-migrate-callers-then-delete-legacy-apis
description: "當引入新的內部 API 且舊有呼叫端仍然存在時套用。請在同一波修改中完成呼叫端遷移並刪除舊 API，而不是保留向下相容層。"
disable-model-invocation: true
---

# 遷移呼叫端並隨即刪除舊版 API（Migrate Callers Then Delete Legacy APIs）

- 更新測試以驗證新的介面契約（Contract），並刪除那些僅為了保護重構前內部實作細節而存在的舊測試

**適用時機：**
- 沒有外部使用者依賴向下相容性（Backward Compatibility）
- 專案本身能夠吸納同步協調的破壞性變更（Breaking Changes）
- 新 API 是系統簡化或重構計畫的一部分

> **輸出語言規定**：套用本原則時，所有分析、說明與回覆內容一律使用**台灣繁體中文**。
