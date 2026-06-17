import type { ImageSourcePropType } from 'react-native';

export type SourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OnboardingPage = {
  id: string;
  source: ImageSourcePropType;
  sourceWidth: number;
  sourceHeight: number;
  nextHitArea: SourceRect;
  skipHitArea: SourceRect;
  completionLabel: string;
};

const createHitArea = (
  sourceWidth: number,
  sourceHeight: number,
  rect: SourceRect,
): SourceRect => ({
  x: Math.round(sourceWidth * rect.x),
  y: Math.round(sourceHeight * rect.y),
  width: Math.round(sourceWidth * rect.width),
  height: Math.round(sourceHeight * rect.height),
});

const buttonRatio: SourceRect = {
  x: 0.3,
  y: 0.855,
  width: 0.4,
  height: 0.1,
};

const skipRatio: SourceRect = {
  x: 0.745,
  y: 0.078,
  width: 0.18,
  height: 0.058,
};

export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    id: 'dream-record',
    source: require('../../assets/onboarding/onboarding-1.png'),
    sourceWidth: 1664,
    sourceHeight: 3476,
    nextHitArea: createHitArea(1664, 3476, buttonRatio),
    skipHitArea: createHitArea(1664, 3476, skipRatio),
    completionLabel: '다음',
  },
  {
    id: 'meaning',
    source: require('../../assets/onboarding/onboarding-2.png'),
    sourceWidth: 1636,
    sourceHeight: 3508,
    nextHitArea: createHitArea(1636, 3508, buttonRatio),
    skipHitArea: createHitArea(1636, 3508, skipRatio),
    completionLabel: '다음',
  },
  {
    id: 'patterns',
    source: require('../../assets/onboarding/onboarding-3.png'),
    sourceWidth: 1636,
    sourceHeight: 3508,
    nextHitArea: createHitArea(1636, 3508, buttonRatio),
    skipHitArea: createHitArea(1636, 3508, skipRatio),
    completionLabel: '다음',
  },
  {
    id: 'planet-system',
    source: require('../../assets/onboarding/onboarding-4.png'),
    sourceWidth: 1636,
    sourceHeight: 3508,
    nextHitArea: createHitArea(1636, 3508, buttonRatio),
    skipHitArea: createHitArea(1636, 3508, skipRatio),
    completionLabel: '다음',
  },
];
