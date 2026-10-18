---
name: principle-laziness-protocol
description: "在重構、評估變更差異（Diff）大小，或忍不住想新增抽象層、分層或跨層傳遞狀態信號時套用。傾向刪除程式碼，並採取能解決問題的最小變更。"
disable-model-invocation: true
---

# 惰性準則（Laziness Protocol）

- **集中決策邏輯。** 不要在好幾個地方重複做相同的判斷。請將判斷收斂在單一真實來源（Single Source of Truth）中，並將結果以簡單的旗標（Flag）傳遞出去。
- **最小化變更差異（Diff）。** 用能解決問題的最小幅度進行修改。更少的程式碼行數遠勝過看似「優雅」的樣板程式碼（Boilerplate）。

> **輸出語言規定**：套用本原則時，所有分析、說明與回覆內容一律使用**台灣繁體中文**。
