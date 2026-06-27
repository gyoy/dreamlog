import type { ImageSourcePropType } from 'react-native';

export type DreamPlanetOption = {
  id: string;
  label: string;
  source: ImageSourcePropType;
  accent: string;
};

export const DREAM_PLANET_OPTIONS: DreamPlanetOption[] = [
  { id: 'dream-planet-1', label: '라일락 행성', source: require('../../assets/planets/planet-1-lavender.png'), accent: '#A58CF0' },
  { id: 'dream-planet-2', label: '민트 행성', source: require('../../assets/planets/planet-2-mint.png'), accent: '#77CFC0' },
  { id: 'dream-planet-3', label: '복숭아 행성', source: require('../../assets/planets/planet-3-peach.png'), accent: '#F2A7A1' },
  { id: 'dream-planet-4', label: '하늘빛 행성', source: require('../../assets/planets/planet-4-sky.png'), accent: '#81BFE8' },
  { id: 'dream-planet-5', label: '별빛 행성', source: require('../../assets/planets/planet-5-gold.png'), accent: '#E6B95B' },
  { id: 'dream-planet-6', label: '베리 행성', source: require('../../assets/planets/planet-6-berry.png'), accent: '#846ED7' },
];

export function getDreamPlanetOption(planetId?: string): DreamPlanetOption {
  if (!planetId) return DREAM_PLANET_OPTIONS[0];
  const numeric = Number(planetId.match(/(\d+)$/)?.[1] ?? 1);
  const normalizedIndex = Math.max(0, (numeric - 1) % DREAM_PLANET_OPTIONS.length);
  return DREAM_PLANET_OPTIONS[normalizedIndex];
}
