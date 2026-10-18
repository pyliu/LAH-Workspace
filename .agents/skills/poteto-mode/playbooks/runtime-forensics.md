### 執行期鑑識診斷 (Runtime forensics)

**你負責找出診斷結論。請對活體執行中的程序（Live process）進行剖析與埋點量測，切勿僅看著原始碼空談理論。** 本劇本的交付物是一份附帶實證引用的診斷報告，而非修復程式碼。

1. **透過對應的控制技能或工具（如 `chrome-devtools`、`memory-leak-debugging` 或系統剖析工具）在目標表層擷取即時信號：** 針對空轉飆高程序擷取 CPU Profile、針對記憶體洩漏擷取 Heap Snapshot、針對視覺異常擷取 CDP Trace。必須取得真實的產物（Artifact），而非憑空猜測。在 `LAH-Workspace` 環境進行診斷時，請確保 `./LAH-API/www/.env` 維持 `MOCK=true`，且不對外部資料庫進行破壞性操作。
2. **將產物收斂至關鍵鐵證（Smoking gun）：** 找出位於熱路徑（Hot path）上的函式、從洩漏物件連往 GC Root 的持有鏈（Retainer chain），或是無輸入卻持續觸發的迴圈。請透過 `invoke_subagent` 在子代理中解析大型產物（遵循 **guard-the-context-window** 原則技能），僅將濃縮後的發現保留在主對話緒中。請依據「Subagents」章節為子代理挑選合適的模型與推理層級。
3. **在採信假設前，先證明其作用機制。** 透過 CDP `eval` 對執行中的程序注入動態觀測點，或在不重新載入的情況下對活體程式碼進行熱修補（Hotfix），以最低成本驗證你的假設是否成立。
4. **將發現對應回原始碼：** 明確指出所屬子專案、檔案路徑、符號名稱（Symbol），以及進行記憶體配置或排程的精確行號。
5. **吞吐量檢查點（Throughput checkpoint）保持單行：** `throughput checkpoint: n/a, read-only forensics`。

**回覆要求（Reply）：** 擷取到的即時信號、收斂後的關鍵發現、你如何證明該機制、原始碼對應位置（含檔案連結），以及產物檔案路徑。除非使用者明確要求，否則不要動手修改正式程式碼；待確認根本原因後，交棒給 **Bug fix**（`playbooks/bug-fix.md`）或 **Perf issue**（`playbooks/perf-issue.md`）。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
