import type { ImageSourcePropType } from 'react-native';

export const DREAM_STAR_IDS = ['gold', 'pink', 'cream', 'lavender', 'sky', 'mint'] as const;

export type DreamStarId = (typeof DREAM_STAR_IDS)[number];

export type DreamStarOption = {
  id: DreamStarId;
  label: string;
  description: string;
  source: ImageSourcePropType;
};

export const DREAM_STAR_OPTIONS: DreamStarOption[] = [
  {
    id: 'gold',
    label: '햇살별',
    description: '따뜻한 황금빛',
    source: require('../../assets/stars/dream-star-gold.png'),
  },
  {
    id: 'pink',
    label: '복숭아별',
    description: '포근한 분홍빛',
    source: require('../../assets/stars/dream-star-pink.png'),
  },
  {
    id: 'cream',
    label: '크림별',
    description: '은은한 우윳빛',
    source: require('../../assets/stars/dream-star-cream.png'),
  },
  {
    id: 'lavender',
    label: '라벤더별',
    description: '몽글한 보랏빛',
    source: require('../../assets/stars/dream-star-lavender.png'),
  },
  {
    id: 'sky',
    label: '하늘별',
    description: '차분한 새벽빛',
    source: require('../../assets/stars/dream-star-sky.png'),
  },
  {
    id: 'mint',
    label: '민트별',
    description: '산뜻한 꿈빛',
    source: require('../../assets/stars/dream-star-mint.png'),
  },
];

export const DEFAULT_DREAM_STAR_ID: DreamStarId = 'gold';

export function isDreamStarId(value: unknown): value is DreamStarId {
  return typeof value === 'string' && DREAM_STAR_IDS.includes(value as DreamStarId);
}

export function getDreamStarOption(value?: string): DreamStarOption {
  return DREAM_STAR_OPTIONS.find((option) => option.id === value) ?? DREAM_STAR_OPTIONS[0];
}
