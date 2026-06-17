import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ONBOARDING_PAGES, type SourceRect } from '../data/onboarding';
import { theme } from '../theme';

type CompletionSource = 'next' | 'skip';

type OnboardingScreenProps = {
  onComplete?: (source: CompletionSource) => void;
};

const TRANSITION_DURATION_MS = 180;
const DOT_CENTER_X_RATIOS = [0.382, 0.446, 0.51, 0.574] as const;
const DOT_CENTER_Y_RATIO = 0.141;
const DOT_DIAMETER_RATIO = 0.029;
const TRANSITION_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const mapRectToScreen = (
  rect: SourceRect,
  imageLeft: number,
  imageTop: number,
  imageScale: number,
) => ({
  left: imageLeft + rect.x * imageScale,
  top: imageTop + rect.y * imageScale,
  width: rect.width * imageScale,
  height: rect.height * imageScale,
});

const getPageLayout = (
  page: (typeof ONBOARDING_PAGES)[number],
  width: number,
  height: number,
) => {
  const imageScale = Math.max(width / page.sourceWidth, height / page.sourceHeight);
  const imageWidth = page.sourceWidth * imageScale;
  const imageHeight = page.sourceHeight * imageScale;
  const imageLeft = (width - imageWidth) / 2;
  const imageTop = (height - imageHeight) / 2;
  const dotSize = page.sourceWidth * DOT_DIAMETER_RATIO * imageScale;
  const dotCenterY = imageTop + page.sourceHeight * DOT_CENTER_Y_RATIO * imageScale;

  return {
    image: {
      left: imageLeft,
      top: imageTop,
      width: imageWidth,
      height: imageHeight,
    },
    nextButton: mapRectToScreen(page.nextHitArea, imageLeft, imageTop, imageScale),
    skipButton: mapRectToScreen(page.skipHitArea, imageLeft, imageTop, imageScale),
    dots: {
      size: dotSize,
      centers: DOT_CENTER_X_RATIOS.map((ratio) => ({
        x: imageLeft + page.sourceWidth * ratio * imageScale,
        y: dotCenterY,
      })),
    },
  };
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const page = ONBOARDING_PAGES[pageIndex];
  const isLastPage = pageIndex === ONBOARDING_PAGES.length - 1;

  const layouts = useMemo(() => {
    return ONBOARDING_PAGES.map((p) => getPageLayout(p, width, height));
  }, [height, width]);

  const currentLayout = layouts[pageIndex];

  const activeDotStyle = useMemo(() => {
    const size = layouts[0].dots.size;

    const translateX = scrollAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: layouts.map((lay, i) => lay.dots.centers[i].x - size / 2),
    });

    const translateY = scrollAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: layouts.map((lay, i) => lay.dots.centers[i].y - size / 2),
    });

    const scale = scrollAnim.interpolate({
      inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
      outputRange: [1, 1.15, 1, 1.15, 1, 1.15, 1],
    });

    return {
      height: size,
      left: 0,
      top: 0,
      width: size,
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  }, [layouts, scrollAnim]);

  const animateToPage = (nextPageIndex: number) => {
    setIsTransitioning(true);
    setPageIndex(nextPageIndex);

    Animated.timing(scrollAnim, {
      duration: 380,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      toValue: nextPageIndex,
      useNativeDriver: true,
    }).start(() => {
      setIsTransitioning(false);
    });
  };

  const goNext = () => {
    if (isTransitioning) {
      return;
    }

    if (isLastPage) {
      onComplete?.('next');
      return;
    }

    animateToPage(pageIndex + 1);
  };

  const skip = () => {
    onComplete?.('skip');
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {ONBOARDING_PAGES.map((p, index) => {
        const pageLayout = layouts[index];

        const pageInputRange = [index - 1, index, index + 1].filter(
          (val) => val >= 0 && val < ONBOARDING_PAGES.length
        );
        const pageOpacityRange = pageInputRange.map((val) => (val >= index ? 1 : 0));
        const pageTranslateRange = pageInputRange.map((val) => {
          if (val === index - 1) return 18;
          if (val === index) return 0;
          return -12;
        });

        const opacity = scrollAnim.interpolate({
          inputRange: pageInputRange,
          outputRange: pageOpacityRange,
          extrapolate: 'clamp',
        });

        const translateX = scrollAnim.interpolate({
          inputRange: pageInputRange,
          outputRange: pageTranslateRange,
          extrapolate: 'clamp',
        });

        return (
          <Animated.Image
            key={index}
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={p.source}
            style={[
              styles.screenImage,
              pageLayout.image,
              {
                opacity,
                transform: [{ translateX }],
                zIndex: index,
              },
            ]}
          />
        );
      })}
      <View pointerEvents="none" style={[styles.dotsLayer, { zIndex: 5 }]}>
        {currentLayout.dots.centers.map((center, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                height: currentLayout.dots.size,
                left: center.x - currentLayout.dots.size / 2,
                top: center.y - currentLayout.dots.size / 2,
                width: currentLayout.dots.size,
                zIndex: 10,
              },
            ]}
          />
        ))}
        <Animated.View style={[styles.activeDot, activeDotStyle, { zIndex: 11 }]} />
      </View>
      <Pressable
        accessibilityLabel="온보딩 건너뛰기"
        accessibilityRole="button"
        disabled={isTransitioning}
        onPress={skip}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          currentLayout.skipButton,
          pressed && styles.pressedFeedback,
          { zIndex: 20 },
        ]}
        testID="onboarding-skip-button"
      >
        <Text style={styles.srOnly}>건너뛰기</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={isLastPage ? '온보딩 시작하기' : '다음 온보딩 보기'}
        accessibilityRole="button"
        disabled={isTransitioning}
        onPress={goNext}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          currentLayout.nextButton,
          pressed && styles.pressedFeedback,
          { zIndex: 20 },
        ]}
        testID="onboarding-next-button"
      >
        <Text style={styles.srOnly}>{page.completionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  screenImage: {
    position: 'absolute',
  },
  dotsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    backgroundColor: '#e9e5f3',
    borderRadius: 999,
    opacity: 0.95,
    position: 'absolute',
  },
  activeDot: {
    backgroundColor: '#7558f7',
    borderRadius: 999,
    elevation: 3,
    position: 'absolute',
    shadowColor: '#7558f7',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
  },
  hitArea: {
    position: 'absolute',
  },
  pressedFeedback: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  webNoOutline:
    Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
        } as never)
      : {},
  srOnly: {
    color: 'transparent',
    fontSize: 1,
    fontFamily: theme.typography.fontFamily,
    height: 1,
    opacity: 0,
    width: 1,
  },
});
