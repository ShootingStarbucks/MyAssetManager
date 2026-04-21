#!/usr/bin/env bash
# Git Flow guard — PreToolUse hook (Bash tool)
#
# Blocks on protected branches (main, develop):
#   - git commit        : direct commit forbidden
#   - git push --force  : force push forbidden
#   - git push -f       : force push (short flag) forbidden
#
# Allows (intentional CLAUDE.md flow):
#   - git merge --no-ff feature/... : merging feature branches into develop
#   - git push origin develop       : pushing after merge

input=$(cat)
branch=$(git branch --show-current 2>/dev/null)

# Only enforce on protected branches
if [ "$branch" != "main" ] && [ "$branch" != "develop" ]; then
  exit 0
fi

# Parse command via Python3 (handles multiline, heredoc, escaped quotes)
# Falls back to regex if python3 is unavailable
cmd=$(printf '%s' "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    pass
" 2>/dev/null)

if [ -z "$cmd" ]; then
  # Fallback: regex (best-effort, may miss multiline commands)
  cmd=$(printf '%s' "$input" \
    | grep -o '"command":"[^"]*"' \
    | head -1 \
    | sed 's/"command":"//;s/"$//')
fi

block() {
  local reason="$1"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"block","permissionDecisionReason":"%s"}}\n' "$reason"
  exit 0
}

# ── Rule 1: direct git commit ──────────────────────────────────────────────────
# Pattern: git commit appearing at line start or after ; & |
if printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+commit'; then
  block "Git Flow 위반: [$branch] 브랜치에 직접 commit 금지. feature/fix/hotfix 브랜치를 먼저 생성하세요."
fi

# ── Rule 2: force push ─────────────────────────────────────────────────────────
# Pattern: git push ... --force  OR  git push ... -f
if printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+push[[:space:]].*(-f\b|--force)'; then
  block "Git Flow 위반: [$branch] 브랜치에 force push 금지."
fi

exit 0
