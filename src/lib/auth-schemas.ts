import { z } from 'zod';

export const emailSchema = z.string().email('올바른 이메일을 입력하세요');

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .regex(/[0-9!@#$%^&*]/, '숫자 또는 특수문자를 포함해야 합니다');
