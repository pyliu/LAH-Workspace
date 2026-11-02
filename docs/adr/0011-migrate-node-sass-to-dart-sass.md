# 11. 前端樣式編譯器由 node-sass 遷移至 Dart Sass (sass)

- **狀態**：提議中 (Proposed)
- **日期**：2026-11-02
- **決策者**：LAH 架構組、操作員

---

## 背景與問題脈絡 (Context)

在執行 `pack/pack.bat` 對 [LAH-FE](file:///c:/Temp/DEV/LAH-Workspace/LAH-FE) 進行前端生產建置（`yarn build`）時，建置流程因下列錯誤中斷：

```text
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (147)
For more information on which environments are supported please see: https://github.com/sass/node-sass/releases/tag/v8.0.0
```

根本原因在於：
1. `node-sass`（LibSass C++ 封裝）官方已於數年前廢棄，其釋出之 `v8.0.0` 最高僅支援至 Node 18（Node ABI Runtime 108）。
2. 開發主機之 Node.js 環境已推進至 Node 26（ABI Runtime 147），導致既有二進位檔無法載入。
3. 為確保前端在任何現代 Node.js 執行期環境下皆具備穩定的建置能力，必須將樣式編譯器遷移至官方推薦且無原生二進位依賴的 Dart Sass (`sass`)。

---

## 決策內容 (Decision)

1. **移除廢棄套件**：
   自 [LAH-FE/package.json](file:///c:/Temp/DEV/LAH-Workspace/LAH-FE/package.json) 之 `devDependencies` 移除 `node-sass`。
2. **引進現代純 JS 編譯器**：
   安裝官方標準 `sass`（Dart Sass）。因其採純 JavaScript 實作，不依賴本機 C++ 編譯或平台專屬的 `binding.node`，具備跨 Node 版本的完全相容性。
3. **保留相容之載入器**：
   保留目前使用的 `sass-loader`（`^10.2.0`），該版本原生支援 Dart Sass 與 Nuxt 2 (Webpack 4)。
4. **維護全域打包資產**：
   完成替換與測試通過後，同步更新 `dist/node_modules/LAH-NUXTJS-node_modules.zip`，以確保各環境依賴一致。

---

## 影響與取捨 (Consequences)

### 正面效益
- 徹底解除 Node.js ABI / Runtime 版本綁定，未來升級 Node.js 不再引發編譯崩潰。
- 打包腳本 `pack/pack.bat` 可在 Node 16 至 Node 26+ 環境下順暢編譯。
- 與 Sass 官方規範對齊，避免舊版 LibSass 已知語法缺陷。

### 潛在取捨與因應
- **編譯效能**：純 JS 版 Dart Sass 的樣式編譯速度相較 C++ LibSass 約有微幅差距，但在 Nuxt 2 的快取機制下對日常打包影響極低。
- **語法警告**：Dart Sass 對傳統 `/` 除法運算子較為嚴格，可能會產生棄用警告（Deprecation warning），但不影響正常產出。
