---
name: typescript-best-practices
description: TypeScript 最佳實踐規範。當讀取或編輯任何 .ts 或 .tsx 檔案時使用。
paths: ["**/*.ts", "**/*.tsx"]
disable-model-invocation: true
---

# TypeScript 最佳實踐規範（TypeScript Best Practices）

> **輸出語言規範**：所有型別設計說明、程式碼審查意見與技術回覆，**一律強制使用台灣繁體中文輸出**（使用台灣慣用資訊術語：專案、伺服器、資料庫、陣列、物件、非同步、呼叫、程式碼、套件、部署）。

請優先套用 **type-system-discipline** 原則技能。

| 規則名稱 | 核心規範摘要 |
|---|---|
| **可辨識聯合型別（Discriminated unions）** | 使用 `kind`（或 `type`、`tag`）字面量（Literal）作為辨識欄位來建模各種變體，讓「不可能的矛盾狀態」在型別層面上無法被表示。嚴禁使用塞滿一堆可選欄位的屬性袋（Optional-field bags）。 |
| **品牌化型別（Branded types）** | 透過 `& { readonly __brand: "X" }` 為基本型別（Primitives）加上品牌標記，防止不同意義的字串或數值被混用。在系統邊界驗證一次即可。品牌型別只能來自經過實際檢驗的型別守衛（`input is AgentId`），絕不可透過 `as` 強制轉型產生。 |
| **建構式建模（Constructive modeling）** | 設計資料結構時，讓「不合法的值」從一開始就無法被建構出來：非空陣列用 `[T, ...T[]]`、偶數長度配對用 `[T, T][]`、時間範圍用 `start` 加上 `duration`。這不是執行期檢查，也不必空想進階的精煉型別（Refinement types）。 |
| **最簡單的完全型別（Simplest total type）** | 只要對 `T[]` 的所有操作都是完全函式（Total function，對任何輸入皆有合法輸出），就維持使用 `T[]`。唯有當寬鬆型別迫使你在呼叫端寫出 `!`、強制轉型，或拋出「這理論上絕不會發生」的例外時，才將型別強化為 `NonEmpty<T>`。 |
| **以 `unknown` 取代 `any`** | 來自外部的所有資料一律視為 `unknown`。 |
| **Schema 優先於手寫守衛（Schemas before guards）** | 在手寫逐一檢查屬性的型別守衛（Type guard）之前，優先使用專案既有的執行期 Schema 驗證函式庫，並直接從 Schema 推導出型別（例如 `z.infer`）。 |
| **禁止 `as` 強制轉型（No `as` casts）** | 每一個 `as` 都是一顆隨時會在執行期引爆的未爆彈。唯有在通過實際驗證後才允許轉型。 |
| **型別縮減優先階層（Narrowing hierarchy）** | 辨識欄位 `switch` > `in` 運算子 > `typeof` / `instanceof` > 自訂型別守衛（User-defined type guard）> `as`。 |
| **型別守衛（Type guards）** | 必須真正驗證其宣稱的條件。一個說謊的型別守衛比 `as` 更危險，因為臭蟲會藏在看似安全的函式名稱背後。請將守衛命名為 `isX` 或 `hasX`。 |
| **窮舉性檢查（Exhaustiveness）** | 在 `switch` 的 `default` 分支中內嵌 `const _exhaustive: never = x;`，確保未來新增變體時編譯器會立刻報錯提醒。 |
| **以 `satisfies` 取代 `as`** | `satisfies` 能在不將字面量型別（Literal types）寬化（Widening）的前提下驗證數值結構。 |
| **邊界驗證（Boundary validation）** | 在資料跨越系統邊界進入內部時立刻解析（Parse）為具名的領域型別（Domain type）。`Record<string, unknown>` 必須止步於該解析點；進入內部後則完全信任型別系統。詳見 **boundary-discipline** 原則技能。 |
| **由 Schema 衍生型別（Schema-derived types）** | 在宣告新的 `interface` 之前，優先使用 `Pick`、`Omit`、`Parameters`、`ReturnType`、`Awaited`、`typeof` 從既有型別衍生。 |
| **物件參數（Object args）** | 傳遞物件參數而非位置參數（Positional args），讓參數順序具備自我說明能力。但在高頻執行的熱路徑（Hot paths，如每幀渲染、Tokenizer、Parser）則例外略過。 |
| **真實測試（Real tests）** | 不要 Mock 那些可以直接在本地執行的東西。優先使用框架原生的真實測試工具並搭配資源洩漏檢查，且在實際執行的建置版本中驗證 UI。只 Mock 那些無法在本地環境執行的外部相依性。 |
| **結構化遙測日誌（Structured telemetry）** | 優先使用具備足夠除錯脈絡（可透過 ID 追蹤）的結構化日誌工具。正式交付的程式碼中嚴禁遺留 `console.log`。 |

程式碼範例請參閱：[`references/patterns.md`](references/patterns.md)。
