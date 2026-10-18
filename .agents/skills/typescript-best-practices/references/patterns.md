# TypeScript 實作模式範例（TypeScript Patterns）

本檔案提供 [`SKILL.md`](../SKILL.md) 中各項規則的程式碼實例。底層原則本身是跨語言通用的，詳見 **type-system-discipline** 與 **boundary-discipline** 原則技能。

## 品牌化型別（Branded types）

為基本型別加上品牌標記，防止不同意義的值被混用。在系統邊界驗證一次後，下游程式碼即可完全信任該型別。

```ts
type AgentId = string & { readonly __brand: "AgentId" };

function isAgentId(input: string): input is AgentId {
  return isUUID(input);
}

function parseAgentId(input: string): AgentId {
  if (!isAgentId(input)) throw new Error(`Invalid agent id: ${input}`);
  return input;
}

function focusAgent(id: AgentId): void {
  /* 輸入已受信任 */
}
```

請統一遵循 `readonly __brand: 'X'` 結構，不要另外自創新的標記慣例。

## 可辨識聯合型別（Discriminated unions）

使用字面量辨識欄位（Literal discriminant）來建模不同變體。每個變體共用相同的辨識欄位名稱，且各自擁有唯一的字面量值，讓不可能並存的矛盾狀態無法被表示出來。

```ts
// 錯誤示範：布林值搭配可選欄位，允許矛盾狀態存在（例如 loading 為 true 卻同時有 error）
type DiffState = { loading: boolean; diff?: GitDiff; error?: string };

// 正確示範：只有合法的狀態能夠存在
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

請選定一個辨識欄位名稱（`kind`、`type` 或 `tag`）並保持一致。

## 建構式建模（Constructive modeling）

用全部合法的組件來組出型別，而不是定義一個寬鬆型別再靠執行期檢查去限制它。

透過可變長度元組（Variadic tuple）表示非空陣列：

```ts
type NonEmpty<T> = [T, ...T[]];

// 錯誤示範：使用 T[]，迫使每個呼叫端或函式內部重複檢查長度
function pickWinner(entries: string[]): string {
  if (entries.length === 0) throw new Error("no entries");
  return entries[Math.floor(Math.random() * entries.length)];
}

// 正確示範：該型別根本不可能存在空陣列的值
function pickWinner(entries: NonEmpty<string>): string {
  return entries[Math.floor(Math.random() * entries.length)];
}
```

當外部傳入普通 `T[]` 時，只需透過型別守衛縮減（Narrow）一次，該「非空」的事實就會隨型別一路傳遞下去：

```ts
const isNonEmpty = <T>(arr: T[]): arr is NonEmpty<T> => arr.length > 0;
```

以成對元組表示偶數長度陣列：

```ts
type Pairs<T> = [T, T][];
```

以「起始時間 + 持續時間」表示時間範圍：

```ts
// 錯誤示範：只能靠註解來祈禱不變量（Invariant）成立
type TimeRange = { start: Date; end: Date }; // start <= end

// 正確示範：結構上避免了結束早於開始的範圍，需要結束時間時再計算導出
type TimeRange = { start: Date; durationMs: number };
```

讓 `durationMs` 保持為普通 `number` 即可；唯有當一般數字真的容易被誤傳入預期為持續時間的參數時，才為它加上品牌標記（Branded type），不需反射性地過度包裝。選擇能讓錯誤狀態無法被建構的表示法，再於其上提供方便的讀取輔助函式（例如 `pairs.flat()` 或 `rangeEnd()`）。

## 最簡單的完全型別（Simplest total type）

不要把所有型別都盲目強化。只要對 `T[]` 的所有操作都是完全函式（Total），就保留 `T[]`：

```ts
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0); // 空陣列 [] 回傳 0，完全合法
```

唯有當寬鬆型別迫使你在呼叫處對編譯器說謊時（常見徵兆是 `!`、`arr[0] as T`，或是拋出「理論上不會發生」的例外），才強化輸入型別：

```ts
// 錯誤示範：用非空斷言 ! 瞞過編譯器
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// 正確示範：強化輸入型別，斷言自然消失
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

將回傳型別放寬為 `Session | undefined` 則是另一種保持完全函式（Total signature）的做法。

## 以 `unknown` 取代 `any`

外部資料永遠視為 `unknown`，在使用前必須先進行型別縮減（Narrowing）。

```ts
// 錯誤示範
function handle(input: any) {
  return input.foo.bar;
}

// 正確示範
function handle(input: unknown) {
  if (typeof input === "object" && input !== null && "foo" in input) {
    // 已縮減型別；編譯器會驗證後續屬性存取
  }
}
```

外部資料來源包含：API / RPC 回傳负载、`JSON.parse`、`postMessage`、IPC 通訊、檔案內容、環境變數與資料庫查詢結果。

## Schema 優先於手寫型別守衛（Schemas before hand-rolled guards）

在為外部資料手寫逐一檢查屬性的型別守衛之前，請先查看專案中是否已有執行期 Schema 驗證函式庫與既有 Schema。讓單一 Schema 統一負責驗證，並直接從它推導出 TypeScript 型別。切勿同時維護一份 Schema、一份重複的 `interface` 和一個手寫守衛，否則三者遲早會失去同步。

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

當驗證失敗屬於預期內的業務分支時，請使用 `safeParse`。若專案使用其他 Schema 函式庫，請使用對應的型別推導工具。請勿僅為了一個型別守衛而為專案引入全新的 Schema 套件相依性——本規則的核心是優先善用程式碼庫已經信任的驗證機制。

## 禁止 `as` 強制轉型（No `as` casts）

每一個 `as` 都是潛在的執行期崩潰點。唯有在型別系統已經驗證該主張後，才允許轉型。

```ts
import { z } from "zod";

// 錯誤示範
const user = data as User;

// 錯誤示範：不完整的守衛（沒檢查 name 卻宣稱是 User）
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data;
}

// 正確示範
const userSchema = z.object({ id: z.string(), name: z.string() });
type User = z.infer<typeof userSchema>;

function parseUser(data: unknown): User {
  return userSchema.parse(data);
}
```

當型別定義已經先存在時，請為驗證器標註它所證明的目標型別。如此一來，若驗證器漏檢了某個欄位（例如拿掉下方物件中的 `name`），編譯器就會直接報錯拒絕：

```ts
type User = { id: string; name: string };

const userSchema: z.ZodType<User> = z.object({ id: z.string(), name: z.string() });
```

當你要從既有程式碼中重構移除 `as` 時，請先找出為什麼 TypeScript 無法自動推導：

- **缺少辨識欄位**：補上辨識欄位，改用可辨識聯合型別（Discriminated union）。
- **來源型別過於寬泛**（例如 `Record<string, unknown>`）：對其進行型別縮減。
- **未定義型別的系統邊界**：使用負責該結構的 Schema 進行解析；若尚無 Schema 則在邊界補上。
- **型別系統確實無法表達的不變量**：使用品牌化型別（Branded type）或 `satisfies`。

## 型別縮減優先階層（Narrowing hierarchy）

由最佳做法到最後手段依序為：

1. **可辨識聯合型別的 `switch` / `if`**：編譯器會自動縮減型別。
2. **`in` 運算子**：`"key" in obj` 會自動縮減為包含該鍵值的變體。
3. **`typeof` / `instanceof`**：適用於基本型別與類別實例。
4. **自訂型別守衛（User-defined type guard）**：當上述方式皆不足以表達時使用。
5. **`as` 強制轉型**：僅限於已完成實際驗證之後。

```ts
function area(s: Shape): number {
  if ("radius" in s) return Math.PI * s.radius ** 2; // 自動縮減為圓形
  return s.width * s.height; // 自動縮減為矩形
}
```

## 型別守衛（Type guards）

型別守衛必須真正檢驗它所宣稱的條件。一個說謊的守衛比直接寫 `as` 更糟糕。

```ts
function isCircle(s: Shape): s is Shape & { kind: "circle" } {
  return s.kind === "circle";
}
```

只要能用辨識欄位直接縮減，就優先使用辨識欄位。

## 窮舉性檢查（Exhaustiveness）

在 `switch` 的 `default` 分支中，將辨識目標指派給一個型別為 `never` 的區域變數。

```ts
// 回傳值的 switch
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

// 無回傳值（void）的 switch
function handle(s: Shape): void {
  switch (s.kind) {
    case "circle":
      drawCircle(s);
      break;
    case "rect":
      drawRect(s);
      break;
    default: {
      const _exhaustive: never = s;
      void _exhaustive;
    }
  }
}
```

在有回傳值的 `switch` 中使用 `return _exhaustive;`，在單純執行陳述式的 `switch` 中使用 `void _exhaustive;`。

## 以 `satisfies` 取代 `as`

`satisfies` 能夠在不將字面量型別寬化（Widening）為一般型別的前提下，驗證物件結構是否符合目標型別。

```ts
// 錯誤示範：型別被寬化，喪失了字面量型別資訊
const config = { theme: "dark", cols: 3 } as Config;

// 正確示範：既驗證了結構，又保留了精確的字面量型別
const config = { theme: "dark", cols: 3 } satisfies Config;
// config.theme 的型別依然是 "dark"（字面量），而非寬泛的 string
```

## 邊界驗證（Boundary validation）

在資料跨越邊界進入系統時驗證一次，進入系統內部後則完全信任型別。詳見 **boundary-discipline** 原則技能。

- **傳輸協定格式（Wire formats，如 Proto、JSON-RPC、WebSocket Payload）**：解析時忽略未知欄位，確保未來的向前相容變更不會弄壞舊版客戶端。
- **持久化的 JSON 資料**：採用具版本號的結構，並在解析外圍包覆 `try/catch`。
- **切勿在深層呼叫鏈中重複驗證**已經通過邊界檢驗的型別。

## 由 Schema 衍生型別（Schema-derived types）

當 `.proto`、OpenAPI 規格、GraphQL Schema 或資料庫結構定義已經定義了資料形狀時，請直接從產生的型別進行衍生，切勿手動複製定義。

```ts
// 錯誤示範：重複定義結構，當上游 Schema 變更時就會產生脫節
type CheckSummary = {
  totalCount: number;
  checks: { name: string; status: string }[];
};
function renderChecks(s: CheckSummary) {
  /* ... */
}

// 正確示範：直接從產生的 Schema 型別衍生
import type { ChecksMessage } from "<generated module>";
function renderChecks(s: Pick<ChecksMessage, "totalCount" | "checks">) {
  /* ... */
}
```

在撰寫新的 `interface` 之前，請先善用 `Pick`、`Omit`、`Parameters`、`ReturnType`、`Awaited` 與 `typeof`。

## 物件參數（Object args）

```ts
// 錯誤示範：若不小心把兩個同型別的位置參數對調，編譯器依然會放行
openFile(uri, {
  startLineNumber: 10,
  startColumn: 1,
  endLineNumber: 10,
  endColumn: 1,
});

// 正確示範：與參數順序無關，且具備自我說明能力
openFile({
  uri,
  selection: {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 1,
  },
});
```

在效能敏感的熱路徑（Hot paths，如每幀畫面渲染、Tokenizer、Parser，或任何位於緊密迴圈中且物件配置成本很關鍵的地方）則例外略過此規則。
