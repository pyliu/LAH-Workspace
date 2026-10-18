### 多階段或多 PR 計畫（Multi-phase or multi-PR plan）

**你對計畫本身負有全責，而非直接撰寫業務程式碼。這份計畫是一張核對清單（Checklist），供負責人子代理（Owner）逐格執行，並供操作者（Operator）根據實證進行稽核。** 計畫文件本身就是交付物。在此階段請勿直接實作功能。

> **強制語言規範**：所有回覆、計畫文件內容、待辦清單（Todo list）、決策紀錄與核對清單說明，**一律強制使用台灣繁體中文輸出**（唯檢查腳本 `check-plan.mjs` 若強制要求特定英文標題結構時，可保留必要之雙語或結構關鍵字以通過驗證）。同時必須遵循 `AGENTS.md` 跨專案介面契約與四個獨立 Git 儲存庫規範。

1. 當變更僅涉及一兩個檔案且做法顯而易見時，請略過本計畫劇本，直接向使用者說明並停止。
2. 在動筆寫計畫之前，先透過建立原型（Prototype）來解決開放性問題。針對每個未知問題執行 `playbooks/prototype.md`，並保留分支、Commit SHA 與螢幕截圖以供「附錄 A（Appendix A）」引用。唯有遇到任何實驗都無法解決的真正產品決策或偏好選擇時，才透過 `ask_question` 詢問操作者，並提供具體選項（遵循 **never-block-on-the-human**，`../principle-never-block-on-the-human/SKILL.md` 原則技能）。
3. 透過 `invoke_subagent` 孵化子代理（`poteto-agent` 或 `TypeName: "research"`）進行程式碼庫探索，並依據 `SKILL.md` 的「子代理調度（Subagents）」章節指定模型（預設 `Model: "inherit"`，遵循 **guard-the-context-window**，`../principle-guard-the-context-window/SKILL.md` 原則技能）。每個探索子代理僅回傳檔案指標、專案慣例、測試指令與進入點，嚴禁在主對話中直接貼入大段原始碼傾印（Inlined dumps）。
4. 將下方的骨架範本複製到計畫檔案中，並填妥每一個佔位符。除非操作者另有指定路徑，否則請將計畫檔案寫入代理儲存區（如 `<appDataDir>\brain\<conversation-id>\` 或工作區 `docs/` 目錄）下。請嚴格保留範本中的每一個標題與子區塊順序。每個 PR 對應一個獨立章節；一個 PR 代表一項獨立變更及其專屬的實證（遵循 **sequence-verifiable-units**，`../principle-sequence-verifiable-units/SKILL.md` 原則技能）。在 **如何閱讀本計畫（How to read this）** 中指明執行劇本：請依據 `playbooks/autopilot-stack.md` 結尾的規則，在 `playbooks/autopilot-full.md` 與 `playbooks/autopilot-stack.md` 之間擇一；若為常駐型計畫則選用 `playbooks/orchestrate.md`。
5. 全文遵循 `/technical-writing`（`../technical-writing/SKILL.md`）規範撰寫，接著套用 `/unslop`（`../unslop/SKILL.md`）。本體內容僅採用單一 Diátaxis 模式（操作指南 how-to），背景解釋與參考資料一律放進附錄（Appendices）。每個標題直接陳述任務或發現。全文禁止使用長破折號（`—`），禁止在句子中間使用冒號作為連接詞。
6. 執行 `node .agents/skills/poteto-mode/scripts/check-plan.mjs <plan.md>`，並修正它印出的每一項問題（遵循 **encode-lessons-in-structure**，`../principle-encode-lessons-in-structure/SKILL.md` 原則技能；注意：`check-plan.mjs` 會檢查特定的 Markdown 標題與固定英文契約句，請保留下方範本中標示的英文標題與契約句以通過結構檢查，並在說明內容中使用台灣繁體中文）。
7. 交還給操作者。貼出計畫檔案路徑與檢查腳本的輸出結果，然後停下等待。唯有收到操作者明確的動工指令（Go）後，才在計畫所指定的執行劇本下展開實作。

**驗證規則（Verification）。** 單憑單元測試不足以構成充分驗證。唯有當一個 PR 的單元測試（unit）、真實環境實測（live）與效能（perf）核對框全數勾選時，該 PR 才算通過驗證（遵循 **prove-it-works**，`../principle-prove-it-works/SKILL.md` 原則技能）。`Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.` 這句話是驗證鐵則，每個驗證區塊都必須以這句話開頭。真實環境實測區塊（Live block）為必填：在 PR Head 上依據 **swarm**（`../swarm/SKILL.md`）技能啟動十個驗證分道（Lanes），透過對應的控制技能（如 `chrome-devtools` 或終端控制）在真實介面上進行操作。每個分道對應一個核對框，包含具體測試情境、儲存的螢幕截圖路徑，以及通過斷言（Pass predicate）。其中第一道固定為 **對照主幹的防退步分道（Regression lane against trunk）**：它會在主幹（Trunk）與當前分支（Head）上執行完全相同的核心場景；若主幹尚無此功能，該分道須記錄此事實，並改為檢驗本次 Diff 新增的行為以及使用者等待的最終狀態，而非憑空捏造主幹結果。效能關卡（Perf gate）採雙向對照：主幹與 Head 都必須產出指定的量測指標；若主幹尚無此功能，則另外隔離出本次 Diff 新增的工作量，並為該工作量與使用者等待的端到端狀態設定絕對預算上限，切勿在不同場景之間宣稱無效的比率。效能區塊須點出指標名稱、交錯執行（Interleaved）的探測指令、預先量測的主幹基準值，以及判定失敗的數值門檻規則。凡是改變使用者互動行為的 PR 皆受「審查關卡（Review gate）」管制：在合併前必須於對話中附上螢幕截圖與操作影片供操作者審查。若該 PR 未改變任何互動，則寫上 `**Review gate.** None. <PR id> is not review-gated.`，且下方不放任何核對框。

**控制技能（Control skill）。** 依目標介面選擇：瀏覽器、Electron（`lah-messenger`）與 Web UI（`LAH-FE`）使用 `chrome-devtools`（對應 `control-ui`）；CLI、TUI 與後端排程（`LAH-API`、`lah-messenger-server`）使用終端控制工具（對應 `control-cli`）。若單一 PR 同時觸及兩種介面，則兩邊都必須配置驗證分道。若某個介面缺乏控制工具，須將其列為「附錄 C（Appendix C）」的風險項目，且其實測區塊仍須說明各分道如何驅動該介面。

````markdown
# <計畫名稱> plan

<十行以內。以台灣繁體中文說明改變了什麼、為了誰而改、本計畫強制執行的核心規則，以及依序排列的 PR 編號（與所屬子專案儲存庫）。>

## How to read this

一個核對框代表一個工作單元。每個核對框都標明了用來檢驗它的具體證據。巢狀核對框代表上方核對框的子步驟。唯有當證據（檔案、日誌行、螢幕截圖、測試結果或 Commit SHA）實際存在時，才准勾選核對框。本體為操作指南（how-to），附錄則負責解釋背景與記錄數據。

The program runs `.agents/skills/poteto-mode/playbooks/<execution playbook>.md`. <說明誰負責合併，以及哪些 PR 編號屬於操作者親自把關、須在 merge-ready 停下的項目。>

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `git show origin/main:.agents/skills/poteto-mode/playbooks/<execution playbook>.md`
  - [ ] `git show origin/main:.agents/skills/swarm/SKILL.md`
  - [ ] `git show origin/main:<control skill path>`
  - [ ] `git show origin/main:.agents/skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:.agents/skills/<each other leaf skill the program uses>`
- [ ] On the operator's go, arm the audit tick as `/loop 1h` (via Antigravity `schedule` tool) with the tick prompt below. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] <PR id> and <PR id> are independent and first. Both branch from `main`.
  - [ ] <PR id> after <PR id>.
- [ ] Hold the file boundaries. <PR id or class> touches only `<glob>`.
- [ ] Hold the review gate. <PR ids> change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`; if `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Never require `gt`.
- [ ] Open the PR ready, never draft, per **Opening a PR**. Use the run's built-in PR tool when it has one, else `origin pr create --status open --base <base-branch>` or `gh pr create --base <base-branch>` according to the resolved forge. A stack child targets its parent branch.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `../references/bugbot-triage.md`.
- [ ] Rebase onto current trunk before the code-ready report and babysit. Keep that merge base in fix rounds. Rebase again only at merge prep, on a `git merge-tree` conflict with trunk, or on a CI failure that comes from a change on trunk.

### Verdict and merge, for every PR

- [ ] A full swarm runs once, at the code-ready head. Another full swarm runs only for new behavior, a redesign, or a large new diff. A rebase, a merge-conflict resolution, or a minor fix gets a single verifier at the new head. Run each full swarm per `.agents/skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. Two or more audit lanes, each with its own focus, that read the diff and the receipts and distrust the PR body. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner, including a defect that a lane filed as a note. A new head gets a fresh verdict, except for results that stay valid under the patch-id rule in `playbooks/shipping.md`.
- [ ] <The merge or append rule from the execution playbook, with the patch-id rule from `playbooks/shipping.md`.>

### Boot recipe, for every live lane

Each live lane runs on its own isolated environment at the PR head. Drive through `chrome-devtools` (`control-ui`) or terminal (`control-cli`).

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] <啟動後端與前端介面（確認 `LAH-API` 處於 `MOCK=true`），等待服務就緒。>
- [ ] <僅透過控制技能的指令輸入操作，並列出唯讀診斷檢查項目。>
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## <以動詞片語描述任務> (<PR id>)

**Depends on.** <PR id, or None.>

**Files.**

- [ ] Edit `<path>`.
- [ ] Create `<path>`.
- [ ] Delete `<path>`.

**Build.**

- [ ] <單一變更內容，點出具體符號名稱與檔案路徑。>

**You see.**

- [ ] <單一可觀察到的結果，附上確切的日誌文字或畫面狀態。>

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] <測試檔案與新增的測試案例。> Run `<command>`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `<swarm workers model>` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run <相同的核心負載場景> at trunk and head. If trunk lacks the feature, record that and gate <本次 Diff 新增的行為以及使用者等待的最終狀態>. Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 2. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 3. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 4. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 5. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 6. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 7. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 8. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 9. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 10. <測試場景說明。> Save `<slug>.png`. Pass when <predicate>.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. <在主幹與 Head 兩端量測的指標名稱；若主幹尚無此功能，一併點出本次 Diff 新增的工作量與使用者等待的端到端狀態。>
- [ ] Probe. <在主幹與 Head 交錯執行的指令或程序，兩端皆須產出該指標。>
- [ ] Baseline. Record the trunk <value> first.
- [ ] Rule. <Head 對比主幹的失敗門檻數值；若兩端場景不同，則針對新增工作量與使用者可見最終狀態設定絕對預算上限，而非無效比率。>

**Review gate.** The operator reviews before merge.

- [ ] Copy lane <n> screenshots into `<media path>/<pr-id>-review-<slug>.png`.
- [ ] Record a 30 to 60 second video of the change on a lane VM. Save it as `<media path>/<pr-id>-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] <負責人對其 PR 執行 squash-merge，或由根協調者將其串接至基底分支堆疊並交由操作者由下而上合併。>

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

<列出每個由原型解答的開放性問題，附上分支名稱、Commit SHA 與產物連結，以及尚未證實的問題。>

## Appendix B. Alternatives rejected

<列出每個曾評估過的替代方案及其被淘汰的原因。>

## Appendix C. Risks

<列出每項風險、其所屬的 PR 編號，以及負責人需監看的指標。>

## Appendix D. Links and reading list

<動工前必讀的文件清單（含 `AGENTS.md`）。標明哪些 PR 需執行 `.agents/skills/how/SKILL.md` 與 `.agents/skills/interrogate/SKILL.md`，以及依據 `.agents/skills/show-me-your-work/SKILL.md` 維護的決策軌跡路徑。>
````

**回覆（Reply，強制使用台灣繁體中文）：** 計畫檔案路徑、各 PR 編號及其相依關係與受審查關卡管制的集合、原型已證實與尚未證實的事項，以及 `check-plan.mjs` 檢查腳本的輸出結果。
