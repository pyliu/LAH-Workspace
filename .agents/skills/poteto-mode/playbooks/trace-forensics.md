### 追蹤產物鑑識診斷 (Trace forensics)

**你負責從既有產物（Artifact）中找出診斷結論。**

這與對活體程序進行動態剖析的 **Runtime forensics**（`playbooks/runtime-forensics.md`）不同。在此處，擷取紀錄已經存在。該產物是一份固定的資料集——請直接讀取並分析它，不要重新執行系統去重抓一份。工具選擇請保持通用：針對 `cpuprofile` 與 `.json.gz` 使用 DevTools 或 Trace 解析器、針對 `spindump` 使用文字編輯器或檢視工具、針對 `heapsnapshot` 使用對應的 Heap 分析工具。

1. **辨識產物格式並使用正確的工具載入。** 請透過 `invoke_subagent` 在子代理中解析大型產物（遵循 **principle-guard-the-context-window** 技能），僅將濃縮後的關鍵發現保留在主對話緒中。請依據「Subagents」章節為子代理挑選合適的模型與推理層級。
2. **將原始產物轉換為可查詢的結構。** 將 Trace 或 Heap Snapshot 傾印至測試用的 SQLite 資料庫中（例如於 `<appDataDir>\brain\<conversation-id>/scratch/trace.sqlite` 建立分析庫，依 `AGENTS.md` 規範切勿覆寫或清空 `LAH-API` 與 `lah-messenger-server` 既有的開發資料庫），每個樣本（Sample）、堆疊幀（Frame）或節點（Node）佔一列。在開始人工閱讀前，先將資料轉換為可透過 SQL 查詢的形狀。
3. **收斂鎖定根本原因。** 查詢佔用最多時間的堆疊幀，並沿著呼叫樹（Call tree）走訪至熱路徑（Hot path）。若是記憶體洩漏，請從洩漏物件沿著持有鏈（Retainer chain）追蹤至 GC Root；若是 Spindump，則找出卡在 CPU 上或遭阻塞的執行緒及其等待原因（Wait reason）。
4. **歸因回原始碼（Attribute to source）。** 透過產物自帶的符號表（Symbols），將熱點堆疊幀對應至具體的子專案檔案、符號與行號。缺乏原始碼映射（Source mapping）的堆疊幀還不算是一份完整的診斷——請解析出符號，或者坦白說明該產物本身未攜帶符號資訊。
5. **若有成對的前後擷取紀錄（Paired capture），請比對（Diff）前後兩份產物以確認結論。** 否則，請將該發現標記為「當前產物所能支持的最強假設」，而非已確認的最終原因。
6. **交還一份附帶實證引用的診斷報告，除非使用者明確要求，否則不進行程式碼修復。** 待確認原因後，將工作路由至 **Bug fix**（`playbooks/bug-fix.md`）或 **Perf issue**（`playbooks/perf-issue.md`）。吞吐量檢查點保持單行：`throughput checkpoint: n/a, read-only forensics`。

**回覆要求（Reply）：** 產物名稱與格式、收斂後的關鍵發現、對應的原始碼位置（含檔案連結）、產物與分析庫路徑，以及是否經由成對的前後擷取紀錄確認。**所有回覆、摘要與報告皆須以台灣繁體中文輸出。**
