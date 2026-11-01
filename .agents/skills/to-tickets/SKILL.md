---
name: to-tickets
description: 將計畫、規格書或對話內容拆解為「曳光彈垂直切片（Tracer-bullet vertical slices）」任務票券，每張票券明確標記阻塞依賴邊（Blocking edges）。
---

# 任務票券拆解 (To Tickets)

將規格書（Spec）或計畫拆解為一系列**垂直切片任務票券（Tickets）**。

---

## 核心拆解守則

### 1. 垂直切片原則 (Vertical Slice Rules)
- **垂直貫穿，非水平堆疊**：每張票券貫穿所需的所有層次（例如：Schema/API ➔ 業務邏輯 ➔ 前端/UI ➔ 測試驗證）。
- **獨立可驗證**：完成一張票券後，該功能片段必須能夠獨立展示或實機驗證。
- **單一 Context 容納**：切片粒度適中，能在單一乾淨的 Context Window 內完成。
- **重構先行**：若需要前置重構（Prefactoring），應獨立為前置票券。

### 2. 明確依賴邊界 (Blocking Edges)
每張票券必須明確指名其**前置阻塞依賴（Blocked by）**。沒有被阻塞的票券隨時可平行或立即開工。

### 3. 大範圍重構的例外處理（Expand-Contract）
若涉及全系統跨多專案的大範圍欄位或介面變更，不強行做單一垂直切片，而是採「展開 ➔ 遷移 ➔ 收縮」三階段：
1. **展開 (Expand)**：加入新介面但保留舊介面，確保現有系統不中斷。
2. **遷移 (Migrate)**：分批將呼叫端改接新介面，批次間保持系統可運行。
3. **收縮 (Contract)**：確認所有呼叫端遷移完成後，移除舊介面。

---

## 輸出格式

可在專案中以本地 Markdown 任務檔案輸出（存於 `.scratch/<feature>/issues/<NN>-<slug>.md`），或輸出至 GitHub/GitLab/Linear Issues。

### 本地任務票券範本

```markdown
# 01: [票券簡明標題]

**交付內容**: 從使用者與端對端角度描述本票券交付的功能行為。

**前置依賴 (Blocked by)**: 無（可立即開始） / 或其他票券編號

**驗收標準 (Acceptance Criteria)**:
- [ ] 驗收準則 1
- [ ] 驗收準則 2

**建議驗證方式**: 說明可執行之驗證指令（如 php -l、yarn lint、verify-lah）。
```
