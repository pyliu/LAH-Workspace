#!/usr/bin/env bun
// 專案統籌調度（Orchestrate）純文字狀態庫帳務管理 CLI 工具

import { ensureDependenciesInstalled } from "../bootstrap.ts";
import {
  NotFoundError,
  UsageError,
  openStore,
  parseVerdict,
  type Counts,
  type Forge,
  type Frontier,
  type InboxPointer,
  type OpenGate,
  type StandingLine,
  type StatusReport,
  type Store,
  type Unit,
  type Verdict,
} from "./store.ts";

ensureDependenciesInstalled();
const {
  Command: CommanderCommand,
  CommanderError,
  InvalidArgumentError,
  Option,
} = await import("commander");
type Command = InstanceType<typeof CommanderCommand>;

// 精簡輸出模式下預設顯示的最大列數
const DISPLAY_LIMIT = 4;

interface Io {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

interface GlobalOptions {
  readonly store?: string;
  readonly json: boolean;
  readonly force: boolean;
}

interface UnitAddOptions {
  readonly track: string;
  readonly brief?: string;
}

interface UnitSetOptions {
  readonly state: string;
  readonly branch?: string;
  readonly pr?: number;
  readonly sha?: string;
}

interface UnitListOptions {
  readonly state?: string;
  readonly track?: string;
}

interface LedgerRecordOptions {
  readonly evidence: string;
  readonly verifier?: string;
}

interface InboxPushOptions {
  readonly report?: string;
}

interface InboxDrainOptions {
  readonly peek: boolean;
}

interface GateParkOptions {
  readonly question: string;
  readonly options: string;
  readonly default: string;
}

interface GateResolveOptions {
  readonly answer: string;
}

interface FrontierSetOptions {
  readonly repo?: string;
  readonly forge: Forge;
  readonly prs?: readonly number[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 驗證並解析正整數參數
function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError("must be a positive integer");
  }
  return parsed;
}

// 解析以逗號分隔的 PR 編號清單
function prList(value: string): readonly number[] {
  const parts = value.split(",");
  if (parts.some((part) => part.length === 0)) {
    throw new InvalidArgumentError("requires a comma-separated PR list");
  }
  return parts.map(positiveInteger);
}

function countLine(value: Counts): string {
  const entries = Object.entries(value);
  return entries.length === 0
    ? "none"
    : entries.map(([name, count]) => `${name}=${count}`).join(", ");
}

function unitLine(unit: Unit): string {
  return [
    unit.id,
    unit.track,
    unit.state,
    unit.branch,
    unit.pr,
    unit.sha,
    unit.brief,
  ].join("\t");
}

function pointerLine(pointer: InboxPointer): string {
  return [
    pointer.ts,
    pointer.agent,
    pointer.unit,
    pointer.status,
    pointer.report,
  ].join("\t");
}

function gateLine(gate: OpenGate): string {
  return [
    gate.id,
    gate.question,
    gate.options,
    gate.defaultAnswer,
  ].join("\t");
}

// 將資料列格式化為精簡多行字串，超過上限時提示使用 --json
function compactRows<T>(
  rows: readonly T[],
  format: (row: T) => string,
  empty: string,
  limit: number | null = DISPLAY_LIMIT
): string {
  if (rows.length === 0) {
    return empty;
  }
  const visible = limit === null ? rows : rows.slice(0, limit);
  const lines = visible.map(format);
  if (limit !== null && rows.length > limit) {
    lines.push(`... ${rows.length - limit} more; use --json`);
  }
  return lines.join("\n");
}

function frontierLine(value: Frontier): string {
  const prs =
    value.prs.length === 0
      ? "none"
      : value.prs
          .map(
            (row) =>
              `${row.branches}#${row.pr}@${row.sha}:${row.state}`
          )
          .join(",");
  return `generation=${value.generation} prs=${prs} lowest-unmerged=${value.lowestUnmerged ?? "none"}`;
}

function statusLines(report: StatusReport): string {
  const visible = report.summary.openGateIds.slice(0, DISPLAY_LIMIT);
  const more =
    report.summary.openGateIds.length > DISPLAY_LIMIT
      ? `,+${report.summary.openGateIds.length - DISPLAY_LIMIT} more`
      : "";
  return [
    `counts: units=${report.units.length}; states=${countLine(report.summary.unitStates)}; ledger=${countLine(report.summary.ledgerVerdicts)}`,
    `changed: ${report.changed}`,
    `gates open: ${report.summary.openGateIds.length}${
      visible.length > 0 ? `; ids=${visible.join(",")}${more}` : ""
    }`,
  ].join("\n");
}

function emit<T>(
  io: Io,
  json: boolean,
  value: T,
  compact: (result: T) => string,
  jsonValue: (result: T) => unknown = (result) => result
): void {
  const rendered = json
    ? JSON.stringify(jsonValue(value), null, 2)
    : compact(value);
  io.stdout(rendered.endsWith("\n") ? rendered : `${rendered}\n`);
}

function storeDirectory(program: Command): string {
  const value = program.opts<GlobalOptions>().store;
  if (value === undefined || value.trim().length === 0) {
    throw new UsageError("set --store <dir> or ORCH_STORE");
  }
  return value;
}

function frontierRepo(options: FrontierSetOptions): string {
  const value = options.repo;
  if (value === undefined || value.trim().length === 0) {
    throw new UsageError("set --repo <dir> or ORCH_REPO");
  }
  return value;
}

// 開啟狀態庫、執行指定操作並輸出結果，結束後自動釋放檔案鎖
async function runStore<T>(
  program: Command,
  io: Io,
  operation: (store: Store) => Promise<T>,
  compact: (result: T) => string,
  jsonValue?: (result: T) => unknown
): Promise<void> {
  const options = program.opts<GlobalOptions>();
  const store = openStore(storeDirectory(program), {
    force: options.force,
    onLockStolen: (holder) =>
      io.stderr(`stealing store lock held by pid ${holder}\n`),
    onStaleLock: (holder) =>
      io.stderr(`replacing stale store lock (pid ${holder} is dead)\n`),
  });
  try {
    const result = await operation(store);
    emit(io, options.json, result, compact, jsonValue);
  } finally {
    await store.close();
  }
}

function leaf(parent: Command, name: string, description: string): Command {
  return parent
    .command(name)
    .description(description)
    .allowExcessArguments(false);
}

function requireSubcommand(program: Command): never {
  storeDirectory(program);
  throw new UsageError("a valid command is required");
}

// 建立 Commander CLI 命令樹與說明文字
function createProgram(io: Io): Command {
  const program = new CommanderCommand("orch")
    .description("純文字檔案之專案統籌（Orchestrate）帳務管理工具")
    .usage("[--store <dir>] [--json] [--force] <command>")
    .configureOutput({ writeOut: io.stdout, writeErr: io.stderr })
    .exitOverride()
    .showHelpAfterError()
    .allowExcessArguments(false)
    .addOption(
      new Option("--store <dir>", "狀態庫目錄（或設定環境變數 ORCH_STORE）").env(
        "ORCH_STORE"
      )
    )
    .option("--json", "以 JSON 格式印出完整資料列", false)
    .option("--force", "強制接管既有的狀態庫檔案鎖定（Store lock）", false);

  leaf(program, "init", "初始化狀態庫目錄與檔案").action(() =>
    runStore(
      program,
      io,
      (store) => store.init(),
      (result) => `initialized ${result.store}`
    )
  );

  const unit = program
    .command("unit")
    .description("管理工作單元（Work units）")
    .action(() => requireSubcommand(program));
  leaf(unit, "add <id>", "新增工作單元")
    .requiredOption("--track <track>", "所屬軌道（Track）名稱")
    .option("--brief <path>", "任務簡報（Brief）檔案路徑")
    .action((id: string, options: UnitAddOptions) =>
      runStore(
        program,
        io,
        (store) =>
          store.units.add({
            id,
            track: options.track,
            brief: options.brief,
          }),
        unitLine
      )
    );
  leaf(unit, "set <id>", "更新工作單元狀態與資訊")
    .requiredOption("--state <state>", "工作單元狀態")
    .option("--branch <branch>", "Git 分支名稱")
    .option("--pr <number>", "Pull Request 編號", positiveInteger)
    .option("--sha <sha>", "Commit SHA 雜湊值")
    .action((id: string, options: UnitSetOptions) =>
      runStore(
        program,
        io,
        (store) =>
          store.units.set({
            id,
            state: options.state,
            branch: options.branch,
            pr: options.pr,
            sha: options.sha,
          }),
        unitLine
      )
    );
  leaf(unit, "get <id>", "查詢單一工作單元").action((id: string) =>
    runStore(program, io, (store) => store.units.get(id), unitLine)
  );
  leaf(unit, "list", "列出工作單元清單")
    .option("--state <state>", "依狀態篩選")
    .option("--track <track>", "依軌道篩選")
    .action((options: UnitListOptions) =>
      runStore(
        program,
        io,
        (store) => store.units.list(options),
        (rows) => compactRows(rows, unitLine, "(no units)")
      )
    );
  leaf(unit, "counts", "依狀態統計工作單元數量").action(() =>
    runStore(program, io, (store) => store.units.counts(), countLine)
  );

  const ledger = program
    .command("ledger")
    .description("管理驗證分類帳（Verification ledger）紀錄")
    .action(() => requireSubcommand(program));
  leaf(ledger, "record", "登錄一筆驗證判定結果（Verdict）")
    .argument("<pr>", "Pull Request 編號", positiveInteger)
    .argument("<sha>", "Commit SHA 雜湊值")
    .argument("<verdict>", "驗證判定結果", parseVerdict)
    .requiredOption("--evidence <path>", "驗證證據檔案路徑")
    .option("--verifier <name>", "驗證者名稱")
    .action(
      (
        pr: number,
        sha: string,
        verdict: Verdict,
        options: LedgerRecordOptions
      ) =>
        runStore(
          program,
          io,
          (store) =>
            store.ledger.record({
              pr,
              sha,
              verdict,
              evidence: options.evidence,
              verifier: options.verifier,
            }),
          (row) => `${row.pr}\t${row.sha}\t${row.verdict}`
        )
    );
  leaf(ledger, "check", "檢查指定 PR 與 SHA 的驗證判定結果")
    .argument("<pr>", "Pull Request 編號", positiveInteger)
    .argument("<sha>", "Commit SHA 雜湊值")
    .action((pr: number, sha: string) =>
      runStore(
        program,
        io,
        (store) => store.ledger.check({ pr, sha }),
        (row) => row.verdict
      )
    );
  leaf(ledger, "summary", "統計各驗證判定結果的數量").action(() =>
    runStore(program, io, (store) => store.ledger.summary(), countLine)
  );

  const inbox = program
    .command("inbox")
    .description("管理收件匣（Inbox）子代理完成指標")
    .action(() => requireSubcommand(program));
  leaf(inbox, "push <agent> <unit> <status>", "推入一筆收件匣完成指標")
    .option("--report <path>", "子代理報告路徑")
    .action(
      (
        agent: string,
        unitId: string,
        status: string,
        options: InboxPushOptions
      ) =>
        runStore(
          program,
          io,
          (store) =>
            store.inbox.push({
              agent,
              unit: unitId,
              status,
              report: options.report,
            }),
          (result) =>
            `${result.pointer.unit}\t${result.pointer.status}\t${result.filename}`,
          (result) => result.pointer
        )
    );
  leaf(inbox, "drain", "排空並讀取收件匣指標")
    .option("--peek", "僅檢視而不排空收件匣", false)
    .action((options: InboxDrainOptions) =>
      runStore(
        program,
        io,
        (store) =>
          options.peek ? store.inbox.peek() : store.inbox.drain(),
        (rows) => compactRows(rows, pointerLine, "(empty)", null)
      )
    );
  leaf(inbox, "count", "計算收件匣內的指標數量").action(() =>
    runStore(
      program,
      io,
      (store) => store.inbox.count(),
      String,
      (count) => ({ count })
    )
  );

  const gate = program
    .command("gate")
    .description("管理人工裁決關卡（Decision gates）")
    .action(() => requireSubcommand(program));
  leaf(gate, "park <id>", "停放一筆待裁決關卡")
    .requiredOption("--question <question>", "關卡問題說明")
    .requiredOption("--options <options>", "可選方案")
    .requiredOption("--default <answer>", "未回覆時的預設答案")
    .action((id: string, options: GateParkOptions) =>
      runStore(
        program,
        io,
        (store) =>
          store.gates.park({
            id,
            question: options.question,
            options: options.options,
            defaultAnswer: options.default,
          }),
        (result) => `${result.id}\topen`
      )
    );
  leaf(gate, "list", "列出開啟中的待裁決關卡").action(() =>
    runStore(
      program,
      io,
      (store) => store.gates.list(),
      (rows) => compactRows(rows, gateLine, "(no open gates)")
    )
  );
  leaf(gate, "resolve <id>", "解決並關閉指定裁決關卡")
    .requiredOption("--answer <answer>", "選定的答案")
    .action((id: string, options: GateResolveOptions) =>
      runStore(
        program,
        io,
        (store) => store.gates.resolve({ id, answer: options.answer }),
        (result) => `${result.id}\tresolved\t${result.answer}`
      )
    );

  const frontier = program
    .command("frontier")
    .description("管理堆疊合併前緣（Stack frontier）")
    .action(() => requireSubcommand(program));
  leaf(
    frontier,
    "set",
    "解析 Pull Request 基底鏈並設定合併前緣（Frontier）"
  )
    .addOption(
      new Option(
        "--repo <dir>",
        "儲存庫目錄路徑（或設定環境變數 ORCH_REPO）"
      ).env("ORCH_REPO")
    )
    .addOption(
      new Option("--forge <forge>", "PR 託管平台工具")
        .choices(["gh", "origin"])
        .default("gh")
    )
    .option(
      "--prs <n,...>",
      "選填的預期 PR 順序鎖定清單（用於校驗）",
      prList
    )
    .action((options: FrontierSetOptions) =>
      runStore(
        program,
        io,
        (store) =>
          store.frontier.set({
            repo: frontierRepo(options),
            forge: options.forge,
            prs: options.prs,
          }),
        frontierLine
      )
    );
  leaf(frontier, "show", "顯示目前的合併前緣狀態").action(() =>
    runStore(program, io, (store) => store.frontier.show(), frontierLine)
  );

  leaf(program, "status", "重新產生 status.md 並印出狀態摘要").action(() =>
    runStore(program, io, (store) => store.status.render(), statusLines)
  );

  const standing = program
    .command("standing")
    .description("管理常駐指令（Standing orders）")
    .action(() => requireSubcommand(program));
  leaf(standing, "show", "顯示所有常駐指令").action(() =>
    runStore(
      program,
      io,
      (store) => store.standing.show(),
      (rows) =>
        compactRows(
          rows,
          (item: StandingLine) => `${item.number}. ${item.line}`,
          "(no standing orders)"
        )
    )
  );
  leaf(standing, "add <line>", "新增一條常駐指令").action((line: string) =>
    runStore(
      program,
      io,
      (store) => store.standing.add({ line }),
      (item) => `${item.number}. ${item.line}`
    )
  );

  program.action(() => requireSubcommand(program));
  return program;
}

// 統一處理錯誤並對應至規定的結束代碼（Exit code：一般錯誤為 1，查無目標為 2）
function handleError(error: unknown, program: Command, io: Io): number {
  if (error instanceof CommanderError) {
    return error.exitCode === 0 ? 0 : 1;
  }
  const json = program.opts<GlobalOptions>().json;
  if (error instanceof NotFoundError) {
    const output = error.output;
    if (output === undefined) {
      io.stderr(`error: ${error.message}\n`);
    } else {
      emit(io, json, output.json, () => output.compact);
    }
    return 2;
  }
  io.stderr(`error: ${message(error)}\n`);
  if (error instanceof UsageError) {
    io.stderr(program.helpInformation());
  }
  return 1;
}

export async function main(
  argv: readonly string[],
  io: Io = {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  }
): Promise<number> {
  const program = createProgram(io);
  try {
    await program.parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    return handleError(error, program, io);
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
