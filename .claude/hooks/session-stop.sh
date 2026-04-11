#!/usr/bin/env bash
# Stop hook — session-end verification

# Check for uncommitted changes that might contain secrets
if git diff --name-only 2>/dev/null | grep -qE '\.(env|key|pem|secret)$'; then
  printf '{"systemMessage": "[Security] ⚠️  세션 종료: 민감한 파일에 미커밋 변경사항이 있습니다. 커밋 전 확인하세요."}\n'
  exit 0
fi

# Warn if .env.local is staged
if git diff --cached --name-only 2>/dev/null | grep -qE '\.env'; then
  printf '{"systemMessage": "[Security] ⚠️  세션 종료: .env 파일이 스테이징되어 있습니다. 커밋하지 마세요."}\n'
  exit 0
fi

exit 0
