import type { DreamKeyword, DreamMood, RecordModeOption } from '../types/record';

export const RECORD_DESIGN_WIDTH = 393;
export const RECORD_DESIGN_HEIGHT = 852;

export const RECORD_LIMITS = {
  title: 30,
  keywords: 10,
  memo: 300,
};

export const RECORD_MODE_OPTIONS: RecordModeOption[] = [
  {
    id: 'planet',
    label: '행성계 모드',
    helperText: '내 꿈으로 나만의 행성계를 만들어요.',
    accessibilityLabel: '행성계 모드 선택',
  },
  {
    id: 'constellation',
    label: '별자리 모드',
    helperText: '내 꿈으로 나만의 별자리를 만들어요.',
    accessibilityLabel: '별자리 모드 선택',
  },
];

export const RECORD_PRIMARY_KEYWORDS: DreamKeyword[] = [
  { id: 'sky', label: '하늘', isPrimary: true },
  { id: 'sea', label: '바다', isPrimary: true },
  { id: 'star', label: '별', isPrimary: true },
  { id: 'moon', label: '달', isPrimary: true },
  { id: 'cloud', label: '구름', isPrimary: true },
  { id: 'forest', label: '숲', isPrimary: true },
  { id: 'road', label: '길', isPrimary: true },
  { id: 'home', label: '집', isPrimary: true },
  { id: 'flight', label: '비행', isPrimary: true },
  { id: 'travel', label: '여행', isPrimary: true },
];

export const RECORD_EXTRA_KEYWORDS: DreamKeyword[] = [
  { id: 'school', label: '학교' },
  { id: 'person', label: '사람' },
  { id: 'animal', label: '동물' },
  { id: 'food', label: '음식' },
  { id: 'rain', label: '비' },
  { id: 'snow', label: '눈' },
  { id: 'river', label: '강' },
  { id: 'mountain', label: '산' },
  { id: 'door', label: '문' },
  { id: 'light', label: '빛' },
  { id: 'wind', label: '바람' },
  { id: 'flower', label: '꽃' },
];

export const RECORD_MOODS: DreamMood[] = [
  { id: 'happy', label: '행복', faceColor: '#ffd66b', expression: 'smile' },
  { id: 'calm', label: '평온', faceColor: '#94ddd0', expression: 'line' },
  { id: 'curious', label: '신기함', faceColor: '#ffd56e', expression: 'open' },
  { id: 'fear', label: '두려움', faceColor: '#ff8588', expression: 'fear' },
  { id: 'sad', label: '슬픔', faceColor: '#9ec4f7', expression: 'sad' },
];

export const RECORD_INITIAL_SELECTED_KEYWORDS = ['flight', 'travel'];
