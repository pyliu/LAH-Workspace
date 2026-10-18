// 編譯期型別安全驗證測試：確保非法狀態組合（如 GitHub 拒絕合併卻標記為 ci-clean 或無就緒證明的 READY）在編譯期即報錯
import { parsePrNumber } from "./types.ts";
import type {
  CiClean,
  GitHubMergeAllowed,
  PrContext,
  ReadyPr,
  TerminalVerdict,
} from "./types.ts";

type ReadyVerdict = Extract<TerminalVerdict, { readonly kind: "READY" }>;

const context = {
  owner: "octocat",
  repo: "hello-world",
  number: parsePrNumber(123),
} satisfies PrContext;
const cleanCi = {
  kind: "ci-clean",
  source: "gh-pr-checks",
  all: [
    {
      kind: "passed",
      name: "ci",
      reportedState: "SUCCESS",
      description: "",
      link: "",
      workflow: "",
    },
  ],
  failed: [],
  pending: [],
  hadPreviousPassingCi: false,
  github: {
    kind: "allowed",
    basis: "merge-state",
    mergeStateStatus: "CLEAN",
    headRollupState: "SUCCESS",
  },
} satisfies CiClean;
const readyPr = {
  kind: "ready-pr",
  context,
  proof: {
    mergeability: "clear",
    threads: [],
    ci: cleanCi,
    gate: {
      state: "OPEN",
      reviewDecision: "APPROVED",
      draft: "not-draft",
    },
  },
} satisfies ReadyPr;
const ready = {
  schemaVersion: 1,
  sequence: 1,
  observedAt: "2026-07-26T00:00:00.000Z",
  mode: "single",
  kind: "READY",
  terminal: true,
  exitCode: 0,
  scope: { kind: "single", pr: readyPr },
} satisfies ReadyVerdict;

void ready;

// PR 179929 的案例形狀。下方每項斷言皆保持為單一簡短敘述，避免重新格式化時使 @ts-expect-error 偏離實際報錯行。
const refused = {
  kind: "allowed",
  basis: "rollup",
  mergeStateStatus: "BLOCKED",
  headRollupState: "FAILURE",
} as const;

// @ts-expect-error BLOCKED 搭配失敗的 rollup 屬於拒絕合併（refusal），而非允許合併（allowance）。
const refusalIsNotAllowed: GitHubMergeAllowed = refused;

// @ts-expect-error 當 GitHub 拒絕合併時，CI 狀態不得判定為 clean。
const refusalIsNotClean: CiClean = { ...cleanCi, github: refused };

// @ts-expect-error READY 判定不得攜帶檢查失敗（failing-checks）的結束代碼 4。
const readyWithBlockerExit: ReadyVerdict = { ...ready, exitCode: 4 };

const unprovenPr = { kind: "ready-pr", context } as const;

// @ts-expect-error 開啟中的 READY 資料列必須攜帶正向的就緒證明（proof）。
const readyWithoutProof: ReadyPr = unprovenPr;

void refusalIsNotAllowed;
void refusalIsNotClean;
void readyWithBlockerExit;
void readyWithoutProof;
