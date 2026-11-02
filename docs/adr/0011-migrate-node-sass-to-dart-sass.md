# 11. 前端編譯執行期隔離策略與 Node 16 自動注入

- **狀態**：已採納 (Accepted)
- **日期**：2026-11-02
- **決策者**：LAH 架構組、操作員

---

## 背景與問題脈絡 (Context)

在執行 `pack/pack.bat` 對 [LAH-FE](file:///c:/Temp/DEV/LAH-Workspace/LAH-FE) 進行前端生產建置（`yarn build`）時，因開發主機全域環境升級至 Node.js v26.12.1（ABI Runtime 147），導致建置流程中斷：

```text
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (147)
For more information on which environments are supported please see: https://github.com/sass/node-sass/releases/tag/v8.0.0
```

### 曾評估之替代方案
1. **升級前端依賴至 Dart Sass (`sass`)**：
   - 經實測評估，在現有舊版依賴樹直接安裝 Dart Sass 會觸發 npm 11 的 Peer Dependencies 衝突（`ERESOLVE`，如 `eslint-plugin-vue-libs`）。
   - 加上 Windows 檔案鎖定導致 `node_modules` 出現 `EPERM`，強行升級具備高度破壞生產環境穩定性之風險。
2. **手動全域切換版本**：
   - 要求操作員每次打包前手動執行 `nvm use 16.20.2`。
   - 容易因人為疏忽遺漏，且干擾操作員其他專案之現代 Node.js 工作流。

---

## 決策內容 (Decision)

依據 `principle-fix-root-causes`、`principle-laziness-protocol` 與 `principle-prove-it-works`，決定採用**打包工具層執行期隔離（Runtime Isolation）**：

1. **腳本層智慧探測與注入**：
   - 於 [pack.bat](file:///c:/Temp/DEV/LAH-Workspace/LAH-Updater/pack/pack.bat) 中加入相容 Node 16 之優先探測邏輯，優先將 `%LOCALAPPDATA%\nvm\v16.20.2` 或 AppServ 可攜式 Node 注入子程序之 `PATH`。
   - 於 [pack.py](file:///c:/Temp/DEV/LAH-Workspace/LAH-Updater/pack/pack.py) 之 `run_fe_build()` 建置流程中，實作 `resolve_node16_path()` 自動探測函式，動態將 Node 16 目錄置於 `build_env["PATH"]` 最前端。
2. **保持前端相依性純粹與穩定**：
   - [LAH-FE/package.json](file:///c:/Temp/DEV/LAH-Workspace/LAH-FE/package.json) 保持既有穩定配置不變，避免破壞性套件重裝。
   - 經實測驗證，在 Node 16.20.2 下 `yarn build` 客戶端與伺服器端耗時 310 秒完全無損通過編譯。

---

## 影響與取捨 (Consequences)

### 正面效益
- **零破壞性**：前端專案與產線部署套件無需承受套件升級帶來的相容性風險。
- **無感容錯**：無論操作員全域 Node.js 為何版本（Node 18/20/26+），執行 `pack.bat` 或 `pack.py` 皆可自動收斂至正確的 Node 16 執行期。
- **不干擾日常開發**：操作員無需在各專案間頻繁手動切換 `nvm use`。

### 潛在取捨與因應
- **本機環境依賴**：執行打包之開發機本機需具備 Node 16（NVM 已內建或 AppServ 可攜目錄已具備）。若兩者皆不存在，腳本將回退至全域 Node 並顯示提示。
