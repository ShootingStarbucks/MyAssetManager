# gap-check — SKILLS.md vs 코드 갭 분석

SKILLS.md의 각 섹션(§1~§7)을 현재 코드베이스와 비교하여 구현 갭을 분석합니다.

## 분석 절차

1. `SKILLS.md`의 §1~§7 각 항목을 목록화
2. 관련 파일을 읽어 실제 구현 여부 확인:
   - DB 스키마: `prisma/schema.prisma`
   - 계산 로직: `src/lib/calculate-portfolio.ts`
   - API 라우트: `src/app/api/`
   - UI 컴포넌트: `src/components/`, `src/app/`
3. 각 항목을 `✅ 구현됨 / 🟡 부분 구현 / 🔴 미구현` 으로 분류
4. 섹션별 구현률(%) 산출
5. SKILLS_GAP_ANALYSIS.md와 비교하여 변경 사항 요약

## 출력 형식

```
## 갭 분석 결과 — {today}

| 섹션 | 항목 | 상태 | 비고 |
|---|---|---|---|
| §1 | exchange 필드 | 🔴 미구현 | schema에 없음 |
...

## 변경 사항 (전회 대비)
- 새로 구현됨: ...
- 여전히 미구현: ...

## 권장 다음 작업 (Phase 1 기준)
1. ...
```

이 분석이 끝나면 SKILLS_GAP_ANALYSIS.md 업데이트 여부를 사용자에게 확인하세요.
