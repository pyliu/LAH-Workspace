---
name: principle-type-system-discipline
description: "在設計型別、審查函式簽章（Signature），或使用任何靜態型別語言撰寫程式碼時套用。讓非法狀態無法被表示、為具語意的基本型別加上品牌標記（Brand）、在系統邊界解析外部資料、窮盡所有分支變體，並從權威 Schema 衍生型別。"
disable-model-invocation: true
---

# 型別系統紀律（Type System Discipline）

讓編譯器直接拒絕不可能存在的狀態、混淆誤用的基本型別，以及未處理的分支變體（Variants）。優先透過型別定義將錯誤與特例「從根本上消滅」，而不是到處增生例外處理邏輯。關於 TypeScript 的具體語法實踐，請參閱 `typescript-best-practices` 技能。

- **為具語意的基本型別加上品牌標記（Brand Semantic Primitives）。** `UserId` 與 `OrderId` 底層雖然都是字串，但絕不應該互相混用。請賦予它們各自獨立的型別（例如在 TypeScript 中使用 Branded Intersection，或在其他語言中使用 Newtype）。在建立時驗證一次，後續流程即可無條件信任該型別。只要兩個參數共用相同的基本型別卻代表不同語意，就應該為它們加上品牌型別標記。
- **外部資料在解析前皆視為無型別（Untyped）。** 無論是 RPC Payloads、JSON、IPC 訊息、CLI 參數、設定檔、環境變數或資料庫資料列，請在每一個系統邊界設置解析函式（Parse Function），將非結構化的外部輸入轉換為具名型別模型。關於驗證應該放在哪裡，請參閱 **boundary-discipline**（[邊界紀律](../principle-boundary-discipline/SKILL.md)）原則技能。
- **從權威 Schema 自動衍生型別。** 當 Protocol Buffer、OpenAPI 規格、GraphQL Schema、資料庫遷移檔（Migration）、Design Token 檔案或其他權威檔案已經定義了資料結構時，請直接從該來源衍生型別，切勿手工重複撰寫平行的型別定義。請參閱 **encode-lessons-in-structure**（[將經驗編碼為結構](../principle-encode-lessons-in-structure/SKILL.md)）原則技能。

> **輸出語言規定**：套用本原則時，所有分析、說明與回覆內容一律使用**台灣繁體中文**。
