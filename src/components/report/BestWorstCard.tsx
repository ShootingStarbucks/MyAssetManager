import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatPercent } from '@/lib/format-currency';
import { getKrStockKoreanName } from '@/lib/kr-stock-names';

type HoldingStat = { ticker: string; returnPercent: number } | null;

type Props = {
  best: HoldingStat;
  worst: HoldingStat;
  isCurrentMonth?: boolean;
  hasFinnhubKey?: boolean;
};

function StatCard({
  label,
  stat,
  borderColor,
  textColor,
}: {
  label: string;
  stat: HoldingStat;
  borderColor: string;
  textColor: string;
}) {
  return (
    <div className={`flex-1 rounded-lg border-2 p-4 ${borderColor}`}>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      {stat ? (
        <>
          <p className="text-sm font-semibold text-gray-800">{getKrStockKoreanName(stat.ticker) ?? stat.ticker}</p>
          <p className={`text-base font-bold mt-1 ${textColor}`}>
            {formatPercent(stat.returnPercent)}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400">데이터 없음</p>
      )}
    </div>
  );
}

export function BestWorstCard({ best, worst, isCurrentMonth, hasFinnhubKey }: Props) {
  const hasData = best !== null || worst !== null;
  const contextNote =
    hasData
      ? isCurrentMonth || !hasFinnhubKey
        ? '전체 기간 수익률 기준'
        : '해당 월 수익률 기준'
      : null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-800">베스트 / 워스트 종목</h2>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <StatCard
            label="베스트 종목"
            stat={best}
            borderColor="border-green-500"
            textColor="text-green-600"
          />
          <StatCard
            label="워스트 종목"
            stat={worst}
            borderColor="border-red-500"
            textColor="text-red-600"
          />
        </div>
        {contextNote && (
          <p className="text-xs text-gray-400 mt-3">{contextNote}</p>
        )}
      </CardContent>
    </Card>
  );
}
