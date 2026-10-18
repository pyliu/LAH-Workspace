---
name: principle-guard-the-context-window
description: "當上下文視窗（Context Window）逐漸飽和時套用：遇到龐大輸出、超長檔案、重複讀取或平行展開規劃時。請透過 invoke_subagent 將大量繁重的工作分派給子代理（Subagents）；主執行緒僅保留摘要，而非原始資料內容（Raw Payloads）。"
disable-model-invocation: true
---

# 守護上下文視窗（Guard the Context Window）

**原因：** 上下文視窗溢位（Context Overflow）會降低推論品質、產生上下文壓縮失真（Compression Artifacts），並導致任務進度停滯。

**實踐模式：**
- **控制各階段規模並設定範圍上限。** 限制每個階段處理的檔案數量、設定對話輪次預算（Turn Budgets），並將工具與機制本身的上下文消耗納入考量（必要時透過 `invoke_subagent` 將繁重讀取與調查交由子代理執行，主代理僅接收結論摘要）。

> **輸出語言規定**：套用本原則時，所有分析、說明與回覆內容一律使用**台灣繁體中文**。
