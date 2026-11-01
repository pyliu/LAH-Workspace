---
name: ask-matt
description: 技能指引與流程導航（Router）。引導使用者或 Agent 在不同開發階段選用最適當的規格梳理與工程技能。
---

# 技能流程導航器 (Ask Matt)

當面對一項新需求或陷入開發困境時，協助判斷當前情況適合哪一個技能或工作流。

---

## 核心主線工作流：從點子到交付 (Idea ➔ Ship)

大多數工程任務走這條主幹道：

```
[原始構想 Idea]
       │
       ▼
1. 深度盤問收斂：/grill-with-docs 或 /grilling
   （建構決策樹，同步淬鍊 GLOSSARY.md 與 ADR）
       │
       ▼
2. 提煉規格：/to-spec
   （將討論收斂為包含問題陳述、User Stories 與決策的規格書）
       │
       ▼
3. 任務切片：/to-tickets
   （拆解為曳光彈垂直切片，明確標註阻塞邊）
       │
       ▼
4. 嚴謹實作與驗證：進入 poteto-mode 或 tdd
   （遵守 24 項工程原則、進行爆炸半徑分析與實機驗證 verify-lah）
       │
       ▼
5. 雙軸審查：/code-review
   （平行審查 Standards 規範軸與 Spec 規格相符度）
```

---

## 支線與常用場景速查

- **需求不明確、想自我挑戰盲點** ➔ 呼叫 `grilling` 或 `grill-with-docs`。
- **對話過長、需要切換或精簡上下文** ➔ 呼叫 `handoff` 產生交接摘要後開啟新會話。
- **團隊術語不一致、架構概念分歧** ➔ 呼叫 `domain-modeling` 建立專案詞彙表與 ADR。
- **功能寫完、準備送出 Commit 或 PR 前** ➔ 呼叫 `code-review` 進行雙軸自審。
