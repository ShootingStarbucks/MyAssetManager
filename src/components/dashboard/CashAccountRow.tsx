'use client'
import type { CashAccount } from '@/types/portfolio.types'
import { useRemoveCashAccount } from '@/hooks/use-cash'

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })
}

export function CashAccountRow({ account }: { account: CashAccount }) {
  const remove = useRemoveCashAccount()
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 text-sm font-medium">{account.institution}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{account.accountType}</td>
      <td className="py-3 px-4 text-sm text-right font-mono">{formatKRW(account.amount)}</td>
      <td className="py-3 px-4 text-sm text-center text-gray-400">
        {account.interestRate != null ? `${account.interestRate}%` : '—'}
      </td>
      <td className="py-3 px-4 text-sm text-center text-gray-400">
        {account.maturityDate ? new Date(account.maturityDate).toLocaleDateString('ko-KR') : '—'}
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={() => remove.mutate(account.id)}
          className="text-xs text-red-500 hover:underline"
          disabled={remove.isPending}
        >
          삭제
        </button>
      </td>
    </tr>
  )
}
