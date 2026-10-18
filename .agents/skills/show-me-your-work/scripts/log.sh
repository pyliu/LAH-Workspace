#!/usr/bin/env bash
# 將一筆格式正確的決策紀錄附加（Append）至 show-me-your-work 決策日誌（TSV 格式）。
# 提醒：請務必使用直白的台灣繁體中文撰寫 <decision>、<why> 與 <result> 欄位內容。
# 用法：log.sh <logfile> <phase> <decision> <why> <evidence> <result>
set -euo pipefail

if [ "$#" -ne 6 ]; then
	printf '用法: log.sh <logfile> <phase> <decision> <why> <evidence> <result>\n' >&2
	exit 1
fi

logfile="$1"
shift

logdir="$(dirname "$logfile")"
if [ -n "$logdir" ] && [ "$logdir" != "." ] && [ ! -d "$logdir" ]; then
	mkdir -p "$logdir"
fi

# 此處務必使用 `>>` 附加，絕不可使用 `>` 覆寫。
# 若網路掛載對已存在的日誌檔檢查失敗，最多只會多出一行標題列，而不會清空既有紀錄。
if [ ! -s "$logfile" ]; then
	printf 'ts\tphase\tdecision\twhy\tevidence\tresult\n' >> "$logfile"
fi

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# 移除 Tab / 換行 / CR 字元以確保每個儲存格維持單行；
# 並對任何開頭字元可能被試算表解析為公式（=、+、-、@）的儲存格加上單引號前綴，
# 防止外部輸入（如 PR 標題、檔名、產生文字）在審閱者以試算表開啟檔案時觸發公式注入執行。
clean() {
	local v
	v=$(printf '%s' "$1" | tr '\t\n\r' '   ')
	case "$v" in
		=*|+*|-*|@*) printf "'%s" "$v" ;;
		*) printf '%s' "$v" ;;
	esac
}
printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
	"$ts" "$(clean "$1")" "$(clean "$2")" "$(clean "$3")" "$(clean "$4")" "$(clean "$5")" \
	>> "$logfile"
