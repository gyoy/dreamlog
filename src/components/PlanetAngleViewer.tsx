import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, type ImageSourcePropType, type StyleProp, type ViewStyle, View } from 'react-native';

type Props = {
  sources: ImageSourcePropType[];
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  initialIndex?: number;
};

const clamp = (value: number, length: number) => Math.max(0, Math.min(length - 1, value));

export function PlanetAngleViewer({ sources, style, disabled = false, initialIndex = 0 }: Props) {
  const [index, setIndex] = useState(() => clamp(initialIndex, Math.max(1, sources.length)));
  const indexRef = useRef(index);
  const opacity = useRef(new Animated.Value(1)).current;

  const setFrame = useCallback((next: number) => {
    if (!sources.length) return;
    const safeIndex = clamp(next, sources.length);
    if (safeIndex === indexRef.current) return;
    indexRef.current = safeIndex;
    setIndex(safeIndex);
    opacity.stopAnimation();
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 115, useNativeDriver: true }).start();
  }, [opacity, sources.length]);

  useEffect(() => {
    const safeIndex = clamp(indexRef.current, Math.max(1, sources.length));
    indexRef.current = safeIndex;
    setIndex(safeIndex);
  }, [sources.length]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => !disabled && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onMoveShouldSetPanResponderCapture: (_event, gesture) => !disabled && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) < 10) return;
      const calculated = Math.round(-gesture.dx / 54);
      const step = Math.max(-3, Math.min(3, calculated || (gesture.dx < 0 ? 1 : -1)));
      setFrame(indexRef.current + step);
    },
  }), [disabled, setFrame]);

  if (!sources.length) return <View style={[styles.root, style]} />;

  return (
    <View style={[styles.root, style]} {...responder.panHandlers}>
      <Animated.Image key={index} source={sources[index]} resizeMode="contain" style={[styles.image, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
});
