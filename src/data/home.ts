import type { DesignRect, HomeData } from '../types/home';

export const HOME_DESIGN_WIDTH = 393;
export const HOME_DESIGN_HEIGHT = 852;

export const HOME_DATA: HomeData = {
  userName: '꿈결님',
  greeting: '좋은 아침이에요, 꿈결님',
  prompt: '오늘은 어떤 꿈을 꾸셨나요?',
  notificationCount: 2,
  recordCta: {
    title: '오늘의 꿈 기록하기',
    description: '기억이 생생할때, 꿈을 기록해보세요',
    buttonLabel: '기록하기',
    accessibilityLabel: '오늘의 꿈 기록하기',
  },
  typographySettings: {
    fontScale: 1,
  },
  monthlySummary: {
    currentCount: 12,
    previousMonthDelta: 3,
  },
  dreamModes: [
    {
      id: 'planet',
      title: '행성계 모드',
      description: '별이 연결된 나만의 꿈 우주를 확인해보세요.',
      ctaLabel: '상세보기',
    },
    {
      id: 'constellation',
      title: '별자리 모드',
      description: '키워드와 감정의 흐름을 별자리처럼 연결해보세요.',
      ctaLabel: '상세보기',
    },
  ],
  recentDreams: [
    {
      id: 'sea-of-stars',
      title: '별이 쏟아지는 바다 위를 걸었어요',
      dateLabel: '5월 15일 (수)',
      tags: [
        { id: 'sea', label: '바다' },
        { id: 'star', label: '별' },
      ],
      isFavorite: true,
    },
    {
      id: 'castle-clouds',
      title: '분홍빛 구름 위에 있는 성',
      dateLabel: '5월 14일 (화)',
      tags: [
        { id: 'castle', label: '성' },
        { id: 'sky', label: '하늘' },
      ],
      isFavorite: false,
    },
  ],
  tabs: [
    { id: 'home', label: '홈' },
    { id: 'record', label: '기록' },
    { id: 'archive', label: '아카이브' },
    { id: 'stats', label: '통계' },
    { id: 'more', label: '설정' },
  ],
};

export const HOME_HIT_AREAS = {
  notification: { x: 327, y: 38, width: 60, height: 66 },
  recordCta: { x: 16, y: 137, width: 361, height: 185 },
  summaryCard: { x: 16, y: 342, width: 177, height: 151 },
  summaryDetailButton: { x: 34, y: 454, width: 140, height: 35 },
  modePreviewCard: { x: 199, y: 342, width: 178, height: 151 },
  modePreviewDetailButton: { x: 217, y: 454, width: 140, height: 35 },
  recentAll: { x: 306, y: 522, width: 62, height: 34 },
  recentDreamRows: [
    { x: 32, y: 579, width: 306, height: 61 },
    { x: 32, y: 648, width: 306, height: 61 },
  ],
  favoriteButtons: [
    { x: 337, y: 588, width: 39, height: 39 },
    { x: 337, y: 657, width: 39, height: 39 },
  ],
  tabs: [
    { x: 16, y: 759, width: 72, height: 74 },
    { x: 88, y: 759, width: 72, height: 74 },
    { x: 160, y: 759, width: 72, height: 74 },
    { x: 232, y: 759, width: 72, height: 74 },
    { x: 304, y: 759, width: 72, height: 74 },
  ],
} satisfies Record<string, DesignRect | DesignRect[]>;
