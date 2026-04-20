import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatKRW, formatPercent } from '@/lib/format-currency';

type Props = {
  data: {
    totalAssetStart: number;
    totalAssetEnd: number;
    totalChange: number;
    totalChangePercent: number;
  };
};

export function AssetChangeSummaryCard({ data }: Props) {
  const { totalAssetStart, totalAssetEnd, totalChange, totalChangePercent } = data;
  const isGain = totalChange >= 0;
  const changeColor = isGain ? '#16a34a' : '#dc2626';

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-800">이달의 총 자산 변동</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">월초 자산</span>
            <span className="text-sm font-medium text-gray-800">{formatKRW(totalAssetStart)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">월말 자산</span>
            <span className="text-sm font-medium text-gray-800">{formatKRW(totalAssetEnd)}</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">변동</span>
            <span className="text-sm font-semibold" style={{ color: changeColor }}>
              {formatKRW(totalChange)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">수익률</span>
            <span className="text-sm font-semibold" style={{ color: changeColor }}>
              {formatPercent(totalChangePercent)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
