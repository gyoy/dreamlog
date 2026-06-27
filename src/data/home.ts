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
      title: '행성 수집',
      description: '꿈을 기록할 때마다 나만의 행성을 수집해요.',
      ctaLabel: '상세보기',
    },
    {
      id: 'constellation',
      title: '별자리 모드',
      description: '달마다 정해진 별자리를 꿈별로 채워가요.',
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
  notification: { x: 326, y: 42, width: 52, height: 62 },
  recordCta: { x: 28, y: 218, width: 144, height: 66 },
  summaryCard: { x: 18, y: 343, width: 175, height: 143 },
  summaryDetailButton: { x: 31, y: 454, width: 138, height: 32 },
  modePreviewCard: { x: 200, y: 343, width: 175, height: 143 },
  modePreviewDetailButton: { x: 214, y: 454, width: 138, height: 32 },
  recentAll: { x: 307, y: 518, width: 62, height: 34 },
  recentDreamRows: [
    { x: 32, y: 570, width: 306, height: 52 },
    { x: 32, y: 625, width: 306, height: 52 },
    { x: 32, y: 680, width: 306, height: 52 },
  ],
  favoriteButtons: [
    { x: 337, y: 576, width: 39, height: 39 },
    { x: 337, y: 631, width: 39, height: 39 },
    { x: 337, y: 686, width: 39, height: 39 },
  ],
  tabs: [
    { x: 16, y: 759, width: 72, height: 74 },
    { x: 88, y: 759, width: 72, height: 74 },
    { x: 160, y: 759, width: 72, height: 74 },
    { x: 232, y: 759, width: 72, height: 74 },
    { x: 304, y: 759, width: 72, height: 74 },
  ],
} satisfies Record<string, DesignRect | DesignRect[]>;
