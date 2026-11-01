# 架構決策紀錄 (ADR) 格式規範

ADR 存放於 `docs/adr/`，採流水號遞增命名：`0001-slug.md`、`0002-slug.md` 等。  
僅在需要撰寫第一筆 ADR 時才建立 `docs/adr/` 目錄。

---

## 標準範本

```markdown
# 0001: 簡明決策標題

**狀態**: 已採納 (Accepted)  
**日期**: 2026-11-01  

### 決策背景與脈絡
簡述 1-3 句話：面臨什麼問題背景、需要做出什麼架構選擇。

### 決策內容與原因
簡述具體決定了什麼，以及為何做出此抉擇。

### 取捨與後續影響 (Consequences / Trade-offs)
說明放棄了哪些備選方案（如適用），以及此決策帶來的正負面影響。
```

---

## 建立 ADR 的三要素（缺一不可）

1. **難以逆轉 (Hard to reverse)**
2. **缺乏脈絡時令人費解 (Surprising without context)**
3. **具備真實取捨 (The result of a real trade-off)**
