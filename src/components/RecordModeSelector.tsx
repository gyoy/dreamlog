import { memo, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { RecordModeId, RecordModeOption } from '../types/record';
import { theme } from '../theme';

type RecordModeSelectorProps = {
  mode: RecordModeId;
  options: RecordModeOption[];
  onChange: (mode: RecordModeId) => void;
};

const selectedBackground = require('../../assets/record/mode-selected-background.png');
const defaultBackground = require('../../assets/record/mode-default-background.png');
const gridIcon = require('../../assets/record/mode-grid-icon.png');
const starIcon = require('../../assets/record/mode-star-icon.png');

const MODE_AREA_WIDTH = 339;
const MODE_AREA_HEIGHT = 114;

export const RecordModeSelector = memo(function RecordModeSelector({
  mode,
  options,
  onChange,
}: RecordModeSelectorProps) {
  const modeAnim = useRef(new Animated.Value(mode === 'planet' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(modeAnim, {
      toValue: mode === 'planet' ? 0 : 1,
      useNativeDriver: false,
      damping: 22,
      stiffness: 160,
      mass: 0.8,
    }).start();
  }, [mode, modeAnim]);

  // Planet Button Progress (1 when planet, 0 when constellation)
  const planetProgress = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Constellation Button Progress (0 when planet, 1 when constellation)
  const constellationProgress = modeAnim;

  // Planet Layouts
  const planetLeft = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const planetTop = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });
  const planetWidth = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [160, 110] });
  const planetHeight = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [68, 38] });

  // Constellation Layouts
  const constellationLeft = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [203, 177] });
  const constellationTop = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] });
  const constellationWidth = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [110, 160] });
  const constellationHeight = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [38, 68] });

  // Arrow Layouts (slides and rotates 180 degrees to indicate selected mode)
  const arrowLeft = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [173.5, 145.5],
  });

  const arrowRotate = modeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const renderButton = (
    id: RecordModeId,
    progress: Animated.AnimatedInterpolation<number>,
    layoutStyle: any,
    option: RecordModeOption
  ) => {
    const isSelected = id === mode;
    
    // Interpolated icon/label styles
    const iconSize = progress.interpolate({ inputRange: [0, 1], outputRange: [34, 46] });
    const iconTop = progress.interpolate({ inputRange: [0, 1], outputRange: [2, 11] });
    const labelLeft = progress.interpolate({ inputRange: [0, 1], outputRange: [43, 63] });
    const labelTop = progress.interpolate({ inputRange: [0, 1], outputRange: [11, 25] });
    const labelColor = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.textSecondary, theme.colors.textPrimary],
    });
    
    const defaultBgOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const selectedBgOpacity = progress;

    return (
      <Animated.View style={[styles.modeSlot, layoutStyle]}>
        <Pressable
          accessibilityLabel={option.accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => onChange(id)}
          style={({ pressed }) => [
            styles.modePressable,
            Platform.OS === 'web' ? styles.webNoOutline : null,
            pressed && styles.pressed,
          ]}
        >
          <Animated.Image
            accessibilityIgnoresInvertColors
            accessible={false}
            resizeMode="stretch"
            source={defaultBackground}
            style={[styles.modeBackground, { opacity: defaultBgOpacity }]}
          />
          <Animated.Image
            accessibilityIgnoresInvertColors
            accessible={false}
            resizeMode="stretch"
            source={selectedBackground}
            style={[styles.modeBackground, { opacity: selectedBgOpacity }]}
          />
          <Animated.Image
            accessibilityIgnoresInvertColors
            accessible={false}
            resizeMode="contain"
            source={id === 'planet' ? gridIcon : starIcon}
            style={[
              styles.modeIcon,
              {
                width: iconSize,
                height: iconSize,
                top: iconTop,
              },
            ]}
          />
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.modeLabel,
              {
                left: labelLeft,
                top: labelTop,
                color: labelColor,
              },
            ]}
          >
            {option.label}
          </Animated.Text>
        </Pressable>
      </Animated.View>
    );
  };

  const planetOption = options.find((o) => o.id === 'planet')!;
  const constellationOption = options.find((o) => o.id === 'constellation')!;

  return (
    <View style={styles.container}>
      {renderButton('planet', planetProgress, { left: planetLeft, top: planetTop, width: planetWidth, height: planetHeight }, planetOption)}
      {renderButton('constellation', constellationProgress, { left: constellationLeft, top: constellationTop, width: constellationWidth, height: constellationHeight }, constellationOption)}
      
      {/* Dynamic Animated Arrow Indicator */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.arrowWrap,
          {
            left: arrowLeft,
            transform: [{ rotate: arrowRotate }],
          },
        ]}
      >
        <Text style={styles.arrowText}>◀</Text>
      </Animated.View>

      <Animated.Text style={[styles.helperText, { left: 0, opacity: planetProgress }]}>
        {planetOption.helperText}
      </Animated.Text>
      <Animated.Text style={[styles.helperText, { left: 177, opacity: constellationProgress }]}>
        {constellationOption.helperText}
      </Animated.Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    height: MODE_AREA_HEIGHT,
    overflow: 'visible',
    position: 'relative',
    width: MODE_AREA_WIDTH,
  },
  modeSlot: {
    position: 'absolute',
  },
  modePressable: {
    height: '100%',
    justifyContent: 'center',
    overflow: 'visible',
    width: '100%',
  },
  modeBackground: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  modeIcon: {
    left: 15,
    position: 'absolute',
  },
  modeLabel: {
    fontSize: theme.typography.sizes.labelMedium, // 12
    fontWeight: theme.typography.weights.semibold, // '600'
    includeFontPadding: false,
    lineHeight: 17,
    position: 'absolute',
    textShadowColor: 'rgba(111, 75, 232, 0.1)',
    textShadowOffset: { height: 3, width: 0 },
    textShadowRadius: 8,
  },
  arrowWrap: {
    position: 'absolute',
    top: 26,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  arrowText: {
    color: theme.colors.accentLight, // #8c7eff
    fontSize: theme.typography.sizes.labelSmall, // 11
    fontWeight: '900',
  },
  helperText: {
    top: 70,
    color: theme.colors.textHelper, // #756fa5
    fontSize: theme.typography.sizes.caption, // 10
    fontWeight: '300',
    includeFontPadding: false,
    lineHeight: 18,
    position: 'absolute',
    textShadowColor: 'rgba(111, 75, 232, 0.1)',
    textShadowOffset: { height: 3, width: 0 },
    textShadowRadius: 8,
    width: 160,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
