import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatKRW } from '@/lib/format-currency';

type Maturity = { institution: string; maturityDate: string; amount: number };

type Props = {
  rebalanceNeeded: boolean;
  upcomingMaturities: Maturity[];
};

function formatDate(dateStr: string): string {
  // Accepts ISO date string (YYYY-MM-DD) or similar and returns YYYY.MM.DD
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export function NextMonthActionCard({ rebalanceNeeded, upcomingMaturities }: Props) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-800">다음 달 관리 포인트</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Rebalance status */}
          <div>
            {rebalanceNeeded ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 text-amber-700 text-sm font-medium">
                <span>⚠</span>
                리밸런싱이 필요합니다
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 text-green-700 text-sm font-medium">
                현재 비중이 적절합니다
              </span>
            )}
          </div>

          {/* Upcoming maturities */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">만기 도래 예금</p>
            {upcomingMaturities.length === 0 ? (
              <p className="text-sm text-gray-400">만기 도래 예금 없음</p>
            ) : (
              <ul className="space-y-2">
                {upcomingMaturities.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-gray-800">{item.institution}</span>
                      <span className="ml-2 text-gray-400 text-xs">{formatDate(item.maturityDate)}</span>
                    </div>
                    <span className="text-gray-700 font-medium">{formatKRW(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
