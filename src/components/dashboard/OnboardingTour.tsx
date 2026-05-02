'use client';

import { useEffect, useState } from 'react';
import { Joyride, EventData, STATUS, Step } from 'react-joyride';
import { useOnboardingTour } from '@/hooks/use-onboarding-tour';

const TOUR_STEPS: Step[] = [
  {
    target: '#tour-header',
    title: '내 자산 관리',
    content: '주식·암호화폐·예금 등 모든 자산을 한 화면에서 관리합니다.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-holdings-table',
    title: '보유 자산',
    content: '현재가·평가금액·수익률을 실시간으로 확인합니다.',
    placement: 'top',
  },
  {
    target: '#tour-add-asset-btn',
    title: '자산 추가',
    content: '주식·암호화폐·예금을 포트폴리오에 추가합니다.',
    placement: 'bottom',
  },
  {
    target: '#tour-settings-btn',
    title: '설정',
    content: 'AI 키 등록 및 투어 재시작은 여기서 할 수 있습니다.',
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
