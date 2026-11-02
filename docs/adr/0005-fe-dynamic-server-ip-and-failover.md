# 0005: 智慧管控前端八所動態伺服器映射與即時通探活容錯機制

**狀態**: 已採納 (Accepted)  
**日期**: 2026-11-02  

### 決策背景與脈絡
前端智慧管控系統（`LAH-FE`）在過去單所部署架構下，部分全域 Mixin（`global-vue-mixin.js`、`lah-messenger-base.js`）以及卡片元件（如 `lah-ad-config-card.vue`、`lah-chat-message.vue`、`notification/message.vue`）內部含有寫死的桃園所 IP（`220.1.34.75` 與 `220.1.34.18`）。當系統部署至其他七所（中壢、大溪、楊梅、蘆竹、八德、平鎮、龜山）或局本部，或是桃園所主機遷移時，寫死的 IP 將導致連線錯誤或退回非預期節點。同時，桌面端（`lah-messenger`）已驗證的多候選陣列與智慧自動探活容錯（Failover）機制亦需移植至前端內嵌即時通，以提升高可用性。

### 決策選項與權衡 (Decision Options)
1. **方案 A（全面引進八所動態映射與即時通自動 Failover）(採納)**：
   - 於 Vuex Store 定義全域 `tySvrIp` 八所候選陣列字典，所有預設主機解析動態綁定當前所別（`site`）。
   - 全面清理並替換程式碼中寫死之 `220.1.34.75` 與 `220.1.34.18`，改以 `defaultSvrIp` 動態計算。
   - 前端內嵌即時通（`lah-messenger-home.vue`）移植連線逾時監控與自動候選佇列輪巡。
   - 桃園所專屬知識網（`220.1.34.18:8888`）增加轄區條件判斷，非桃園所自動隱藏或依設定回退。
2. **方案 B（僅收斂於即時通模組）**：
   - 僅於 `lah-messenger-*.vue` 元件內處理 WebSocket 探活，保留其他頁面與全域 Mixin 寫死之 IP。
   - 權衡：改動成本低，但無法徹底根治多所部署時 API 端點錯誤的問題。
3. **方案 C（完全移除預設 IP）**：
   - 移除所有靜態 Fallback，完全依賴瀏覽器 `location.hostname` 與登入回傳資訊。
   - 權衡：在開發環境（`localhost`）或網路離線階段，各元件易因缺乏預設端點而噴錯。

### 決策內容與原則 (Decisions)
1. **八所伺服器動態字典整合**：
   - 在 `store/index.js` 建立與桌面端對齊之 `tySvrIp` 映射表，並提供 `defaultSvrIp`、`candidateSvrIps` 與 `localSvrIps` getters。
   - 修正 `global-vue-mixin.js` 中龜山所（`HH` / `220.1.41.`）誤植為 `HG` 的判定邏輯。
2. **多階層動態伺服器解析**：
   - 全域 `apiHost` 與各元件之 Fallback 改為動態串接：「`apiSvrIp`（登入回傳） -> `location.hostname`（瀏覽器訪問端點） -> `systemConfigs.API_SERVER_IP` -> `defaultSvrIp`（依所別對應之候選主機）」。
3. **即時通 WebSocket 探活與容錯輪巡**：
   - `lah-messenger-home.vue` 建立連線逾時（本所主機 3.5 秒、跨所主機 1.5 秒）監聽。若當前節點連線失敗，自動將轄區備援主機與全局八所主機加入候選佇列進行 Failover 輪詢，直到連線成功。
4. **專屬知識網與書籤條件切換**：
   - 桃園所內部知識網（`220.1.34.18:8888`）設定 `isDevOffice` / `site === 'HA'` 守門員，避免其他事務所同仁嘗試連線至不存在的外部服務。

### 取捨與相容性影響 (Consequences / Trade-offs)
- **相容性保證**：向後相容既有開發模式（`localhost:8080`），在開發環境下自動以開發機端點或 `HA` 候選主機為備援，不破壞既有功能。
- **維運效益**：未來任何事務所進行主機熱遷移或新增備援節點時，僅需集中於 `tySvrIp` 字典更新陣列，毋須逐一搜尋替換多處硬編碼。
