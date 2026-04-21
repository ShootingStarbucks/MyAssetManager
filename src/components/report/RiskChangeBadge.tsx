import { Card, CardHeader, CardContent } from '@/components/ui/Card';

type RiskLevel = 'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE' | string;

type Props = {
  riskProfile: { current: string; previous: string };
};

const RISK_STYLES: Record<string, { bg: string; label: string }> = {
  AGGRESSIVE: { bg: 'bg-red-100 text-red-700', label: '공격형' },
  MODERATE: { bg: 'bg-yellow-100 text-yellow-700', label: '중립형' },
  CONSERVATIVE: { bg: 'bg-green-100 text-green-700', label: '안전형' },
};

function getRiskStyle(level: string) {
  return RISK_STYLES[level] ?? { bg: 'bg-gray-100 text-gray-700', label: level };
}

function Badge({ level }: { level: string }) {
  const { bg, label } = getRiskStyle(level);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bg}`}>
      {label}
    </span>
  );
}

export function RiskChangeBadge({ riskProfile }: Props) {
  const { current, previous } = riskProfile;
  const unchanged = current === previous;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-800">리스크 변화</h2>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Badge level={previous} />
          <span className="text-gray-400 text-lg">→</span>
          <Badge level={current} />
        </div>
        {unchanged && (
          <p className="mt-3 text-xs text-gray-400">변화 없음</p>
        )}
      </CardContent>
    </Card>
  );
}
