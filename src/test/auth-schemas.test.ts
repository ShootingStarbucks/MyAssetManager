import { describe, it, expect } from 'vitest'
import { emailSchema, passwordSchema } from '@/lib/auth-schemas'

describe('emailSchema', () => {
  it('1. 유효한 이메일 → 통과', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true)
  })

  it('2. @ 없는 문자열 → 실패', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
  })

  it('3. 도메인 없는 이메일 → 실패', () => {
    expect(emailSchema.safeParse('user@').success).toBe(false)
  })

  it('4. 빈 문자열 → 실패', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('passwordSchema — 비밀번호 정책', () => {
  it('1. 8자 이상 + 숫자 포함 → 통과', () => {
    expect(passwordSchema.safeParse('password1').success).toBe(true)
  })

  it('2. 8자 이상 + 특수문자 포함 → 통과', () => {
    expect(passwordSchema.safeParse('password!').success).toBe(true)
  })

  it('3. 7자(최소 미달) → 실패', () => {
    const result = passwordSchema.safeParse('pass1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8자')
    }
  })

  it('4. 8자 이상이지만 숫자·특수문자 없음 → 실패', () => {
    const result = passwordSchema.safeParse('password')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('숫자 또는 특수문자')
    }
  })

  it('5. 정확히 8자 + 숫자 → 통과 (경계값)', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true)
  })

  it('6. 특수문자만으로 정책 충족 → 통과', () => {
    expect(passwordSchema.safeParse('abcdefg@').success).toBe(true)
  })

  it('7. 빈 문자열 → 실패', () => {
    expect(passwordSchema.safeParse('').success).toBe(false)
  })
})
