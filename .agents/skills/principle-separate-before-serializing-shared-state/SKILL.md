---
name: principle-separate-before-serializing-shared-state
description: "當並行處理者（Concurrent Actors，如多個程序或子代理 Subagents）可能寫入同一個檔案、分支、鍵值或狀態物件時套用。優先消除共享狀態；唯有當「單一共享寫入目標」是真實的不變條件（Invariant）時，才從結構上強制序列化存取。"
disable-model-invocation: true
---

# 先隔離共享狀態，最後才考慮序列化（Separate Before Serializing Shared State）

當並行處理者（Concurrent Actors）可能共享可變狀態（Mutable State）時，請先詰問它們是否真的需要操作同一個可變物件。如果不需要，請直接消除共享。唯有當共享是無法迴避的真實需求時，才透過結構化方式強制執行序列化（Serialization）：例如使用 Lockfile、依序執行的階段（Sequential Phases）或獨佔所有權（Exclusive Ownership）。文字指示與命名慣例不能當作並行控制機制。

**原因：** 對共享狀態進行並行寫入會引發競爭條件（Race Conditions），這類問題往往間歇性發生、極難重現且除錯成本高昂。

**實踐模式：**
1. **識別共享的可變狀態**（雙方同時讀寫的檔案、同時推送的 Git 分支、同時定義與消費的 API）。
2. **預設作法：消除共享的寫入目標。** 問自己：這些執行單元真的需要同一個權威物件，還是它們其實只是在發布各自獨立的事實？請給予每個執行單元各自獨立擁有的檔案、鍵值（Key）、分支或狀態目錄，並只在最終讀取／彙整報告的邊界進行合併。兩個 Worker 各自將自己的 `lastX` 欄位寫進同一個 `state.json` 依然屬於共享狀態變更；拆成 `indexer-state.json` 與 `metrics-state.json` 則完全消除了共享。
3. **唯有當「單一共享寫入目標」是真實的不變條件（Invariant）時，才從結構上序列化存取**（透過 Lockfile、依序執行的階段、單一寫入者 Actor，或原子性的比較並交換 Compare-and-Swap）。請把「我們需要加一個鎖（Lock）」視為值得深究的設計壞味道（Design Smell），而不是預設解答。

> **輸出語言規定**：套用本原則時，所有分析、說明與回覆內容一律使用**台灣繁體中文**。
