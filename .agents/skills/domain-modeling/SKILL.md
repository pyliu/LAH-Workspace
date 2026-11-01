---
name: domain-modeling
description: 建立與淬鍊專案領域模型（Domain Model）。當討論程式碼命名詞彙、撰寫或編輯 GLOSSARY.md，或記錄與編輯架構決策紀錄（ADR）時使用。
---

# 領域建模與專案辭典 (Domain Modeling)

在架構設計與討論過程中，主動淬鍊專案的領域模型。  
這是一項**主動紀律**：挑戰模糊詞彙、驗證極端情境，並在詞彙與決策成形的當下立即記錄至 `GLOSSARY.md` 與架構決策紀錄（ADR）。

---

## 檔案結構與多 Context 支援

多數專案為單一領域 Context：
```
/
├── GLOSSARY.md
├── docs/
│   └── adr/
│       ├── 0001-oracle-php-sync.md
│       └── 0002-sqlite-channel-db.md
└── src/
```

若根目錄存在 `GLOSSARY-MAP.md`，代表存在多個 Context。  
**惰性建立原則**：只有在真正有詞彙或決策產出時才建立檔案。若無詞彙則不建立空的 `GLOSSARY.md`。

---

## 互動過程守則

### 1. 比對詞彙表（Challenge against the glossary）
當使用者使用的詞彙與 `GLOSSARY.md` 現有定義衝突時，立即提出指正：  
「詞彙表中將此定義為 X，但您目前的語境似乎指 Y，請問應以何者為準？」

### 2. 銳化模糊用詞（Sharpen fuzzy language）
遇到過於籠統或多載的詞彙時，主動建議精準的標準領域用詞。例如區分「使用者」、「地政人員」或「系統管理員」。

### 3. 具體情境驗證（Discuss concrete scenarios）
討論領域實體關聯時，主動拋出極端邊界情境，強迫釐清概念邊界。

### 4. 交叉驗證程式碼（Cross-reference with code）
核對使用者口述邏輯與既有程式碼／資料庫欄位是否相符。若有矛盾立即提出。

### 5. 即時更新 GLOSSARY.md
當術語取得共識，**當下立即更新** `GLOSSARY.md`（格式參照 [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md)）。  
> ⚠️ `GLOSSARY.md` 僅能包含業務領域詞彙，嚴禁塞入實作細節或規格草稿。

### 6. 謹慎產出架構決策紀錄（ADR）
僅在**同時滿足下列三項條件**時，才建議建立 ADR（格式參照 [ADR-FORMAT.md](./ADR-FORMAT.md)）：
1. **難以逆轉（Hard to reverse）**：事後反悔代價極高。
2. **缺乏脈絡時令人費解（Surprising without context）**：未來維護者看程式碼會疑惑「為什麼偏要這樣做？」。
3. **具備真實取捨（The result of a real trade-off）**：曾有具體替代方案，且基於明確考量而做出抉擇。
