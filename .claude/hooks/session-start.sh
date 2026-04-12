#!/usr/bin/env bash
# SessionStart hook — Git Flow branch status check

branch=$(git branch --show-current)

if [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  printf '{"systemMessage": "[Git Flow] ⚠️  보호 브랜치 경고: `%s` 브랜치입니다.\n새 작업은 feature/fix/hotfix 브랜치를 먼저 생성하세요.\n  feat  → git checkout -b feature/<name> develop\n  fix   → git checkout -b fix/<name> develop\n  hotfix→ git checkout -b hotfix/<name> main"}\n' "$branch"
else
  printf '{"systemMessage": "[Git Flow] 현재 브랜치: `%s`"}\n' "$branch"
fi
