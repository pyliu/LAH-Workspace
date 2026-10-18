---
name: setup-pstack
description: 設定 pstack 各角色所使用的模型層級與推理預算。偵測可用模型並寫入常駐規則檔（.agents/rules/pstack-models.md）以覆寫技能預設值。適用於 /setup-pstack、「設定 pstack 模型」、「pstack 預算」或變更 pstack 模型配置。
---

# 設定 pstack 模型與推理預算（Setup pstack）

> **輸出語言規範**：所有互動提問、設定表展示與確認訊息，**一律強制使用台灣繁體中文輸出**。

在工作區寫入 `.agents/rules/pstack-models.md` 常駐規則檔，用於設定 pstack 各角色在調度子代理（`invoke_subagent`）時所使用的模型層級與推理預算。

## 背景說明（Antigravity 環境適配）

在 Antigravity 中，`invoke_subagent` 工具支援的 `Model` 參數選項為：
- `inherit`（**預設且強烈建議**）：繼承父代理（當前對話）的模型設定。根據 Antigravity 系統規範，除非使用者明確要求使用特定模型或層級，否則一律預設使用 `inherit`。
- `pro`：大型高能力模型，適合需要深度推理、複雜架構設計、大型重構或多步驟規劃的角色。
- `flash`：輕量快速模型，適合研究查詢、檔案讀取、快速搜尋或平行掃描的角色。
- `flash_lite`：極輕量模型，適合高吞吐量的簡單檢索或初步過濾任務。

本技能協助使用者設定推理預算（Reasoning Budget）與各角色的模型層級對應，並將結果儲存於 `.agents/rules/pstack-models.md`。

## 執行步驟

### 1. 確認可用模型層級

在 Antigravity 環境中，`invoke_subagent` 原生支援 `inherit`、`pro`、`flash` 與 `flash_lite` 四種模型層級設定。其中 `inherit` 永遠有效且為系統預設值。

### 2. 載入目前狀態

預設的角色對應模型表如步驟 5 所示。若工作區下的 `.agents/rules/pstack-models.md` 已經存在，請先讀取該檔案，並將其中的 `# budget` 行與各角色設定值視為目前選擇；否則從步驟 5 的預設值開始。若現有檔案中包含不在步驟 5 清單中的舊角色（例如 `how critics`），代表該角色已退役，請直接移除。

### 3. 選擇預算、對應模型並確認

**(a) 詢問推理預算與模型配置策略**
請優先使用 `ask_question` 工具（而非純文字提問），提供以下四個選項（若規則檔中已有紀錄，請標註目前使用的選項；若無規則檔，說明 `inherit（預設繼承）` 最符合 Antigravity 規範）：

- `inherit（Recommended） — 全部繼承父代理模型（遵循 Antigravity 預設規範）`
- `large — 高推理配置（深度推理與裁判角色使用 pro，快速探索與平行任務使用 flash）`
- `unlimited — 極致推理配置（所有核心與探索角色全面使用 pro）`
- `small — 經濟輕量配置（主要使用 flash 與 flash_lite 以節省 Token）`

**(b) 套用預算對應**
根據使用者的選擇建立工作配置表：
- 若選擇 `inherit`：所有角色皆設為 `inherit`（審查小組與競技場角色則設為 `inherit, inherit` 以維持兩個平行子代理的展開數量）。
- 若選擇 `large`：將判斷、綜合分析、寫作與高難度任務角色設為 `pro`，將快速探索、調查員與平行工作角色設為 `flash`，面板角色（Panel roles）設為 `pro, flash`。
- 若選擇 `unlimited`：所有角色皆設為 `pro`（面板角色設為 `pro, pro`）。
- 若選擇 `small`：將判斷與綜合角色設為 `flash`，快速探索與調查員設為 `flash_lite`。

**(c) 展示角色配置並確認**
向使用者展示每個角色及其對應的模型層級（若有步驟 2 移除的退役角色也一併列出）。使用 `ask_question` 詢問使用者要「直接採用此配置」或「微調特定角色」（選項包含 `inherit`、`pro`、`flash`、`flash_lite`）。
- 針對面板角色（`arena runners`、`architect runners`、`interrogate reviewers`），設定值為逗號分隔的清單，清單中的每個項目都會啟動一個獨立的子代理（即使皆為 `inherit` 也會依項目數量啟動對應數量的子代理）。
- `arena cross-judge pool` 同樣為清單，Arena 會從中挑選一個為最終裁判。
- `swarm workers` 為每個平行工作子代理的預設模型層級。

### 4. 驗證設定值

確認所有寫入的模型層級皆為有效的 Antigravity `invoke_subagent` 模型選項（`inherit`、`pro`、`flash`、`flash_lite`）。若有不合法的值，請停止並重新詢問。

### 5. 寫入規則檔

使用 `write_to_file`（設定 `Overwrite: true`）寫入 `c:\Temp\DEV\LAH-Workspace\.agents\rules\pstack-models.md`。完整覆寫檔案以確保重複執行時的冪等性（Idempotency）。檔案格式範例如下（以預設 `inherit` 為例）：

```markdown
---
description: pstack 各角色模型層級配置（覆寫技能預設值）
alwaysApply: true
---
# pstack 模型配置規則。每行定義一個角色，刪除該行即可退回技能預設值（inherit）。
# 可用模型層級：inherit（預設繼承父對話模型）、pro（深度推理）、flash（快速探索）、flash_lite（極輕量）。
# 面板角色（Panel roles）中的每個逗號分隔項目皆會啟動一個子代理（invoke_subagent）。
# budget: inherit (default)
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
hardest tasks: inherit
how explorer: inherit
how explainer: inherit
why investigators: inherit
why synthesizer: inherit
reflect tooling: inherit
reflect judgment, divergent, synthesizer: inherit
arena runners: inherit, inherit
arena cross-judge pool: inherit, inherit
swarm workers: inherit
architect runners: inherit, inherit
interrogate reviewers: inherit, inherit
```

### 6. 確認完成

告知使用者規則已成功寫入 `.agents/rules/pstack-models.md`，並說明隨時可重新執行 `/setup-pstack` 來更新配置。

### 7. 提議建立驗證技能（選用）

檢查專案是否已具備驅動真實應用程式以進行驗證的方式（例如 `verify-*` 技能或既有測試腳本）。若無，可順帶詢問一次：「是否需要建立專案專屬的驗證技能，讓 Agent 能像真實使用者一樣操作應用程式並驗證變更有效？我可以透過 `/create-verification-skill` 協助產生。」若使用者同意則執行 `/create-verification-skill`；若不需要則直接結束，切勿強行推銷。
