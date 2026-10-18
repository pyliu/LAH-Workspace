#!/usr/bin/env bash
# 唯讀的工作樹（Worktree）清理盤點腳本。依磁碟大小、合併狀態、未提交變更、
# 遠端／PR 狀態以及最近在該工作樹中操作的對話紀錄，對每個 Git 工作樹進行分類。
# 輸出依大小排序的表格與建議分桶（Bucket）。本腳本絕不刪除任何檔案；
# 實際刪除操作在劇本（Playbook）中仍須經過人工確認把關。
#
# 用法：worktree-audit.sh [-b|--base <ref>] [repo-path]
#   repo-path 預設為當前所在的 Git 儲存庫。
#   -b 設定 MERGED 欄位比對的基底參照（例如 origin/integration）。
#   若未指定，基底依序嘗試 origin/HEAD、origin/main、origin/master。
#   origin/HEAD 是遠端的預設分支，不一定是 PR 合併的目標分支；若兩者不同請傳入 -b。
set -u

base=""
while [ $# -gt 0 ]; do
	case "$1" in
	-b|--base) [ $# -ge 2 ] || { echo "error: $1 needs a ref" >&2; exit 2; }; base="$2"; shift 2 ;;
	-h|--help) sed -n '2,/^set -u/p' "$0" | sed '$d; s/^# \{0,1\}//'; exit 0 ;;
	-*) echo "error: unknown option: $1" >&2; exit 2 ;;
	*) break ;;
	esac
done

repo="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$repo" ] && { echo "not in a git repo; pass a repo path" >&2; exit 1; }
cd "$repo" || exit 1
git rev-parse --git-dir >/dev/null 2>&1 || { echo "error: not a git repo: $repo" >&2; exit 1; }

# 主工作樹（Main worktree）為清單中的第一筆；其餘皆為待盤點的候選工作樹。
main_wt=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')

if [ -z "$base" ]; then
	for cand in "$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)" origin/main origin/master; do
		[ -n "$cand" ] && git rev-parse --verify --quiet "$cand^{commit}" >/dev/null && { base="$cand"; break; }
	done
	[ -z "$base" ] && { echo "error: no base ref (origin/HEAD, origin/main, origin/master all missing); pass -b <ref>" >&2; exit 1; }
	echo "warn: no -b given; MERGED checks against $base" >&2
fi

# 基底參照決定合併檢查結果。Fetch 為盡力而為（Best-effort，初步盤點允許使用既有快取），
# 且在檢查前先執行，因為 -b 指定的分支可能尚未拉取至本地。明確指定 refspec 可確保單一分支 Clone 也能建立參照。
case "$base" in
origin/*) git fetch origin "+refs/heads/${base#origin/}:refs/remotes/$base" --quiet 2>/dev/null \
	|| echo "warn: could not fetch $base; merged column may be stale" >&2 ;;
esac
git rev-parse --verify --quiet "$base^{commit}" >/dev/null 2>&1 || { echo "error: base ref not found: $base" >&2; exit 1; }

# 依分支名稱查詢 PR 狀態，一次抓取為 [{number, state, head}] 並將 state 轉為小寫。
# 若 Origin CLI 可讀取此儲存庫的 PR 則優先使用，否則使用 gh；兩者皆不可用時則為空陣列。
prs=$(mktemp)
if command -v origin >/dev/null 2>&1 \
	&& raw=$(origin pr list --author "@me" --state all --limit 1000 \
		--json number,status,headRef 2>/dev/null); then
	printf '%s' "$raw" | jq '[.[] | {number, state: .status, head: .headRef}]' > "$prs" 2>/dev/null
elif raw=$(gh pr list --author "@me" --state all --limit 1000 \
	--json number,state,headRefName 2>/dev/null); then
	printf '%s' "$raw" | jq '[.[] | {number, state: (.state | ascii_downcase), head: .headRefName}]' > "$prs" 2>/dev/null
fi
[ -s "$prs" ] || echo "[]" > "$prs"

# 對話紀錄目錄路徑
slug=$(printf '%s' "$main_wt" | sed 's#^/##; s#/#-#g')
transcripts="$HOME/.cursor/projects/$slug/agent-transcripts"
now=$(date +%s)

echo "# base: $base"
printf "SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE\n"

git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
	[ "$wt" = "$main_wt" ] && continue

	size=$(du -sh "$wt" 2>/dev/null | awk '{print $1}')
	head=$(git -C "$wt" rev-parse HEAD 2>/dev/null)
	head_ts=$(git -C "$wt" log -1 --format='%ct' HEAD 2>/dev/null || echo 0)
	age=$([ "$head_ts" -gt 0 ] 2>/dev/null && echo "$(( (now - head_ts) / 86400 ))d" || echo "?")

	# 以 Squash 合併的分支不會是基底分支的祖先（Ancestor），因此 PR 狀態才是真實信號；
	# merge-base 僅能捕捉到 Fast-forward 或 Rebase 合併。
	git merge-base --is-ancestor "$head" "$base" 2>/dev/null && merged=YES || merged=no

	# 區分真實的未完成變更（WIP，已追蹤檔案的修改）與可丟棄的未追蹤暫存檔（Scratch）。
	porcelain=$(git -C "$wt" status --porcelain 2>/dev/null)
	if [ -z "$porcelain" ]; then dirty=clean
	elif printf '%s\n' "$porcelain" | grep -qv '^??'; then
		dirty="wip:$(printf '%s\n' "$porcelain" | grep -cv '^??')"
	else dirty="scratch:$(printf '%s\n' "$porcelain" | grep -c '^??')"; fi

	branch=$(git -C "$wt" symbolic-ref --quiet --short HEAD 2>/dev/null || echo "")
	if [ -z "$branch" ]; then remote=detached
	elif git -C "$wt" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
		[ "$(git -C "$wt" rev-parse "origin/$branch" 2>/dev/null)" = "$head" ] \
			&& remote=pushed \
			|| remote="ahead$(git -C "$wt" rev-list --count "origin/$branch..HEAD" 2>/dev/null)"
	else remote=no-remote; fi

	pr=$([ -n "$branch" ] && jq -r --arg b "$branch" \
		'.[] | select(.head==$b) | "#\(.number)/\(.state)"' "$prs" 2>/dev/null | head -1)
	[ -z "$pr" ] && pr="-"

	# 找出對話紀錄中最近曾在此工作樹操作的對話。比對路徑後方緊接 "/" 或雙引號，
	# 以避免如 glint-482 誤匹配到 glint-482-r37。
	last="-"; last_ts=0
	if [ -d "$transcripts" ]; then
		f=$(rg -l -e "${wt}/" -e "${wt}\"" "$transcripts" 2>/dev/null \
			| xargs stat -f '%m %N' 2>/dev/null | sort -rn | head -1)
		if [ -n "$f" ]; then last_ts=$(echo "$f" | awk '{print $1}')
			last=$(date -r "$last_ts" '+%Y-%m-%d' 2>/dev/null); fi
	fi
	recent=$([ "$last_ts" -gt 0 ] 2>/dev/null && [ $(( (now - last_ts) / 86400 )) -le 4 ] && echo yes || echo no)

	case "$dirty" in wip:*) bucket=hold-wip ;; *)
		case "$pr" in */open|*/draft) bucket=hold-open-pr ;; *)
			if [ "$recent" = yes ]; then bucket=verify-recent-chat
			elif [ "$merged" = YES ] || [ "$pr" != "-" ]; then bucket=safe
			else bucket=review; fi ;;
		esac ;;
	esac

	printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
		"$size" "$age" "$merged" "$dirty" "$remote" "$pr" "$last" "$bucket" "$wt"
done | sort -t$'\t' -k1,1 -rh

rm -f "$prs"
