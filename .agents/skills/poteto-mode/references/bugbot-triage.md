# Bugbot 評論分類檢傷指南（Bugbot triage）

當 Babysit 劇本（`../playbooks/babysit.md`）處理 Bugbot 或自動化程式碼審查留言時，請參考本指南。本指南的目標不是預設忽略 Bugbot，而是停止將每一則機器人留言都當成必須修改程式碼的聖旨。

> **語言規範**：所有向使用者回報的檢傷分類結果、決策紀錄與 Commit 訊息，**一律使用台灣繁體中文**。

## 決策評分標準（Decision rubric）

在採取行動前，請先將每一則 Bugbot 討論串分類為以下三種處置之一：

- `fix`（修復）：該留言指出了合理的正確性、資安、隱私、資料遺失、身分驗證、計費、資料遷移、冪等性、競態條件（Race condition）或已交付行為的缺陷（包含違反 `AGENTS.md` 跨專案介面契約或資料庫規範的問題）。請在擁有該段程式碼的最底層 PR 中進行修復，接著以包含修復 Commit SHA 的說明回覆討論串並將其標記為已解決（Resolve）。
- `dismiss`（駁回）：該留言符合已記錄的低風險雜訊模式，且當前程式碼或上下文足以證明該疑慮不需要修改程式碼。請以簡短具體的理由回覆討論串並將其標記為已解決。
- `ask`（詢問）：該留言屬於新穎情境、高嚴重度、涉及資安／隱私／資料安全（如 Oracle SQL 變更或跨專案契約修改），或語意模糊。請使用 `ask_question` 或向使用者詢問，切勿自行猜測。

當有疑慮時，請選擇詢問（`ask`）。略過一則吵雜的程式碼風格留言成本很低；但放過一個真正的資料損壞或資安漏洞則代價高昂。

## 經驗模式紀錄格式（Learned pattern format）

未來新增經驗模式時，請依循以下格式：

```markdown
### <簡短模式名稱>

- Confidence: candidate | recurring | strong
- Skip when: <必須同時滿足的略過條件>
- Do not skip when: <不可略過的風險邊界>
- Example signal: <可識別此模式的關鍵字句或程式碼情境>
- Source: <PR／留言網址或簡短歷史紀錄>
```

當只有一兩個案例時使用 `candidate`。經過多次真實駁回驗證後升格為 `recurring`。唯有在該模式範圍極窄、經過反覆驗證且風險極低時，才標記為 `strong`。

## 常見可略過候選模式（Recurring skip candidates）

### 蓄意的 UI 或設計系統視覺變更（Intentional UI or design-system visual changes）

- Confidence: candidate
- Skip when: PR 描述、螢幕截圖、設計審查或鄰近程式碼已明確表達此為蓄意的視覺調整，而 Bugbot 留言只是重複陳述某個共用視覺預設值被改變了。
- Do not skip when: 留言指出無障礙體驗（Accessibility）、焦點可見度（Focus visibility）、鍵盤導覽、色彩對比度，或是該 PR 並未打算變更的元件 API 契約問題。
- Example signal: 針對焦點外框、按鈕尺寸、間距或共用元件視覺預設值的留言，且負責人回覆「蓄意設計（intentional）」或「預期行為（intended）」。

### Bugbot 看不見的上層堆疊或堆疊內使用（Upstack or stack-local usage Bugbot cannot see）

- Confidence: candidate
- Skip when: Bugbot 標記某個匯出項目（Export）、元件、輔助函式或檔案「未被使用」，但當前代码託管平台的 PR 清單與 Diff、上層堆疊 PR 的 Diff 或 PR 上下文顯示，該項目會在堆疊後續的 PR 中被使用。
- Do not skip when: 當前 PR 並非 PR 堆疊的一部分、該符號屬於公開 API（或跨專案契約如 `LAH-API` 端點），或無法驗證所謂的上層堆疊使用情況。
- Example signal: 機器人提示「匯出的元件從未被使用（Exported component is never used）」，而人類回覆「在上層堆疊中使用（used upstack）」。

### 平行實作期間的暫時性重複程式碼（Temporary duplication during parallel implementation）

- Confidence: candidate
- Skip when: 該 PR 為了讓新路徑與即將被刪除、替換或驗證的舊路徑平行運作，而蓄意複製了一小段程式碼。
- Do not skip when: 重複的程式碼改變了資安、計費、資料存取、API 行為，或是建立一個長期共用的抽象層能明顯降低風險。
- Example signal: 機器人提示「大量重複（Significant duplication）」或「重複的驗證邏輯」，而負責人解釋舊路徑即將刪除，或該重複邏輯是為了刻意保持局部隔離。

### 既有框架或元件不變量已涵蓋該警告（Existing framework or component invariant covers the warning）

- Confidence: candidate
- Skip when: 該疑慮已經由當前 Diff 或鄰近程式碼中可見的共用元件、框架契約、型別不變量（Type invariant）或單一真實資料來源（Single source of truth）所保障。
- Do not skip when: 該不變量僅是主觀假設而未被強制執行、依賴特定時序，或跨越了值可能發生分歧的非同步／狀態邊界。
- Example signal: 當外層共用 Popover 已強制限制視窗邊界時，機器人仍提示內層 Popover 缺少 `max-height`；或是針對可為空值（Nullable）的變數提出警告，但區域檢查值與傳入值其實來自同一個資料源。

### 負責人已宣告的後續追蹤或延後清理（Owner-declared follow-up or deferred cleanup）

- Confidence: candidate
- Skip when: PR 負責人明確表示該問題屬於已知的後續追蹤事項（Follow-up）、當前 PR 並未讓該行為惡化，且該留言不涉及高風險領域。
- Do not skip when: Agent 在沒有負責人輸入的情況下自行決定延後、該問題屬於中／高嚴重度的產品行為缺陷，或延後處理會導致新的退步（Regression）被合併進主幹。
- Example signal: 負責人表示「這個稍後再處理」或「我們最終會刪掉這段」。

### 機器人自行撤回或明確屬於誤報的規則留言（Self-withdrawn or explicit false-positive rule comments）

- Confidence: recurring
- Skip when: 留言內文或 Bugbot 後續的回覆已明確表示該發現已撤回、符合規範或屬於誤報（False positive），且 Agent 能在本地端驗證相關規則確實合規。
- Do not skip when: 唯一的證據只有人類在沒有任何解釋的情況下對高風險問題留下一句「誤報」。
- Example signal: 針對檔案命名規則的留言，但其內文自己寫著該檔案已經符合命名規範。

## 預設必須詢問的類別（Ask by default）

針對以下類別，即使過去的 PR 曾駁回過類似留言，也**嚴禁自動略過**：

- 資安、隱私、身分驗證、計費、資料保留、訓練資料，以及權限邊界相關的發現。
- 高嚴重度（High-severity）的發現。
- 資料遷移（Migration）、資料庫 Schema（Oracle / SQLite）、冪等性、並行控制，以及跨系統行為（如 `LAH-API` ↔ `LAH-FE` / `lah-messenger` / `lah-messenger-server`）相關的發現。
- 建議的修復方式很小，且能在不改變產品意圖的前提下明顯降低風險的留言。

歷史數據顯示，人類有時會駁回資安或資料流相關的留言。請將這些視為負責人個案承擔的判斷，而非全團隊通用的自動略過規則。

## 近期 Babysit 實戰累積的候選經驗（Candidate learnings from recent babysits）

在執行 Babysit 期間或結束後，若發現對團隊有幫助但尚待成熟的新模式，請附加於此處。當經過數個 PR 證實該模式反覆出現後，再將其升格至上方的常規章節。

### 手動重新實作瀏覽器原生行為（Manual reimplementations of native browser behavior）

- Confidence: candidate
- Skip when: 幾乎不應略過。當 Diff 用手動實作取代了瀏覽器原生行為（例如：將原生 `sticky` 改為 JS 定位的複製節點、將原生捲動目標改為轉發 `wheel`/`touch` 事件、將繪製順序遮罩改為 `masks`/`clip-path`）時，Bugbot 針對這類程式碼指出的邏輯錯誤幾乎都是真實存在的缺陷。
- Do not skip when: 該發現涉及事件轉發缺口（`wheel` 的 `deltaMode`、觸控平移、邊緣捲動連鎖反應、點擊容差）、遮罩／裁切區域的點擊測試（Hit-testing）不一致，或是這類程式碼中 Observer 回呼與前端框架狀態更新之間的時序競態。預設應直接修復（`fix`）。
- Example signal: 「遮罩不會影響點擊測試（masks do not affect hit-testing）」、「覆蓋層阻擋了滾輪捲動」、「忽略了 deltaMode」、「在 React 套用狀態前就於 IntersectionObserver 回呼中執行」。
- Source: 某個處理 sticky 遮罩的 PR：經過六輪 Bugbot 掃描、約十八項發現，每一項最終都被證實並修復，而非駁回。

### 契約測試漂移宣稱可低成本驗證——先跑測試再說（Contract-test drift claims are cheaply verifiable — run the test first）

- Confidence: candidate
- Skip when: 絕不要略過驗證動作本身，因為跑一次測試只需要一行指令。當 PR 包含用來鎖定協定或文件內文的契約測試（例如針對 `SKILL.md` 的正規表示式檢查、文件措辭快照），而 Bugbot 宣稱「測試已不再符合文件內容」（或反之）時，在分類前請直接在 PR 最新提交（Tip）上執行該測試。若測試紅燈，即實證確認了機器人的宣稱；若測試綠燈，則直接成為回覆駁斥的最佳具體鐵證。
- Do not skip when: 不適用——這是一條驗證捷徑，而非略過模式。請注意，在多輪掃描中「傾向駁回」的經驗法則在此處會失準：鎖定文件的測試之所以發生漂移，往往正是因為前幾輪修復修改了文件內文。
- Example signal: 在某個前幾輪修復曾改寫過文件段落的 PR 上，機器人提示「契約測試遺漏了修復前的等待步驟」；在分支最新提交上實際跑一次測試後，確實就在機器人指出的斷言處失敗了。
- Source: 某個鎖定文件規範的 PR 經歷了八輪 Bugbot 掃描；儘管前六輪全數修復並解決，第七輪的這項宣稱依然是真實缺陷。

### 過時的資安審查發現已在同一個 PR 的後續提交中修復（Stale security-review finding already fixed later in the same PR）

- Confidence: candidate
- Skip when: 自動化資安審查宣稱缺少某個授權或驗證呼叫，但當前 PR 的最新提交（Tip）已經清楚包含該項防禦檢查（並附帶測試），通常是因為強化檢查的 Commit 是在資安審查啟動後才推送的。
- Do not skip when: 被引用的輔助函式對於所討論的主體（Principal）其實是空操作（No-op）、檢查點位於副作用發生之後，或是缺少針對該主體的測試覆蓋。
- Example signal: 出現高嚴重度的「缺少授權檢查（missing authorization check）」警告，但在分支最新提交上，該防禦檢查其實已經在副作用發生前被明確呼叫。
- Source: 某個 Webhook 端點 PR，其資安強化提交的時間晚於審查觸發時間。

### 刻意限縮的錯誤條件若被放寬將會掩蓋真實錯誤（Widening a deliberately narrow error condition would mask the real error）

- Confidence: candidate
- Skip when: 機器人要求將刻意限縮的錯誤條件（特定的 `errno`、錯誤碼或狀態類別）放寬為全面捕捉（Catch-all），但該限縮條件其實編碼了真實的語意區別。最典型的例子是以 `ENOENT` 為條件的相依套件降級備援（Fallback）：「執行檔未安裝」與「指令已執行但失敗」是完全不同的狀況。若對任何非零退出碼都進行重試，會導致合理的執行失敗（找不到目標、憑證過期、網路錯誤）在備援路徑上被重新執行一次，最後回報備援路徑的錯誤，反而掩蓋了真正的根本原因。
- Do not skip when: 該限縮條件遺漏了屬於**同一類別**的其他情境（例如另一個代表「執行檔無法使用」的 `EACCES` 錯誤碼，或另一種傳輸層失敗）、未處理的路徑會導致資料遺失或留下半套狀態，或是重試具備冪等性**且**原始錯誤仍會被完整拋出。
- Example signal: 機器人提示「僅在 X 因 ENOENT 失敗時重試……即使存在可用的 Y 也從不嘗試備援路徑」，而該段程式碼的備援機制原本就是為了「缺少執行檔相依性」而非「操作執行失敗」所設計。
- Source: 某個 CLI 重新命名的 PR，其備援機制是針對舊版執行檔不存在的情況，而非指令執行失敗。
