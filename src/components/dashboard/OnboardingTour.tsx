'use client';

import { useEffect, useState } from 'react';
import { Joyride, EventData, STATUS, Step } from 'react-joyride';
import { useOnboardingTour } from '@/hooks/use-onboarding-tour';

const TOUR_STEPS: Step[] = [
  {
    target: '#tour-header',
    title: '내 자산 관리에 오신 것을 환영합니다!',
    content:
      '이 서비스로 주식, 암호화폐, 예금 등 모든 자산을 한눈에 관리할 수 있습니다.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-summary-card',
    title: '총 자산 현황',
    content:
      '현재 보유 중인 전체 자산 가치와 전일 대비 수익률을 실시간으로 확인할 수 있습니다.',
    placement: 'right',
  },
  {
    target: '#tour-insight-card',
    title: 'AI 인사이트',
    content:
      'AI가 포트폴리오를 분석하여 리스크 경고, 리밸런싱 제안, 시장 조언을 제공합니다.',
    placement: 'right',
  },
  {
    target: '#tour-risk-panel',
    title: '리스크 프로필',
    content:
      '현재 포트폴리오의 리스크 수준을 게이지로 보여줍니다. 분산 투자가 잘 되어 있을수록 안전합니다.',
    placement: 'right',
  },
  {
    target: '#tour-rebalance-panel',
    title: '자산군 비중 비교',
    content:
      '목표 비중과 현재 비중을 비교하고, 리밸런싱이 필요한 자산군을 파악합니다.',
    placement: 'right',
  },
  {
    target: '#tour-holdings-table',
    title: '보유 자산 목록',
    content:
      '보유 중인 모든 자산의 현재 가격, 평가금액, 수익률을 확인합니다.',
    placement: 'left',
  },
  {
    target: '#tour-add-asset-btn',
    title: '자산 추가',
    content:
      '주식, 암호화폐, 예금 등 새로운 자산을 포트폴리오에 추가할 수 있습니다.',
    placement: 'bottom',
  },
  {
    target: '#tour-chart-allocation',
    title: '자산 비중 차트',
    content: '자산군별 비중을 원형 차트로 한눈에 파악합니다.',
    placement: 'left',
  },
  {
    target: '#tour-settings-btn',
    title: '설정',
    content:
      'AI API 키 등록, 환율 설정을 할 수 있습니다. 이 투어는 설정에서 언제든 다시 볼 수 있습니다.',
    placement: 'bottom',
  },
];

export default function OnboardingTour() {
  const [mounted, setMounted] = useState(false);
  const { isRunning, handleTourEnd } = useOnboardingTour();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleEvent = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      handleTourEnd();
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={isRunning}
      continuous
      onEvent={handleEvent}
      locale={{
        back: '이전',
        close: '닫기',
        last: '완료',
        next: '다음',
        nextWithProgress: '다음 ({current}/{total})',
        open: '열기',
        skip: '건너뛰기',
      }}
      options={{
        primaryColor: '#2563eb',
        overlayColor: 'rgba(0,0,0,0.55)',
        zIndex: 10000,
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
      }}
      styles={{
        tooltip: {
          borderRadius: 12,
        },
      }}
    />
  );
}
