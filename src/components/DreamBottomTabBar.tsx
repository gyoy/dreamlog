import { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HOME_DATA } from '../data/home';
import { theme } from '../theme';
import type { HomeTabId } from '../types/home';
import { useTheme } from '../context/ThemeContext';

type DreamBottomTabBarProps = {
  activeTab: HomeTabId;
  onTabPress?: (tabId: HomeTabId) => void;
  width: number;
  hideBackground?: boolean;
  isHomeScreen?: boolean;
};

const tabBarBackground = require('../../assets/record/bottom-tab-background-clean.png');

const TAB_FRAME_WIDTH = 417;
const TAB_FRAME_HEIGHT = 119;
const TAB_IMAGE_HEIGHT = 313;
const TAB_IMAGE_TOP = -97;

const TAB_INDEX_MAP: Record<HomeTabId, number> = {
  home: 0,
  record: 1,
  archive: 2,
  stats: 3,
  more: 4,
};

const getTabIconName = (tabId: HomeTabId, isActive: boolean): any => {
  switch (tabId) {
    case 'home':
      return isActive ? 'home' : 'home-outline';
    case 'record':
      return isActive ? 'pencil' : 'pencil-outline';
    case 'archive':
      return isActive ? 'planet' : 'planet-outline';
    case 'stats':
      return isActive ? 'stats-chart' : 'stats-chart-outline';
    case 'more':
      return isActive ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
    default:
      return 'ellipse-outline';
  }
};

export function DreamBottomTabBar({
  activeTab,
  onTabPress,
  width,
  hideBackground = false,
  isHomeScreen = false,
}: DreamBottomTabBarProps) {
  const { scaledFontSize } = useTheme();
  const frameWidth = Math.min(width, TAB_FRAME_WIDTH);
  const scale = frameWidth / TAB_FRAME_WIDTH;
  const tabs = HOME_DATA.tabs;

  const tabIndex = TAB_INDEX_MAP[activeTab] ?? 0;
  const slideAnim = useRef(new Animated.Value(tabIndex)).current;

  // 활성 탭이 바뀔 때 부드럽게 스프링 애니메이션 구동
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: tabIndex,
      useNativeDriver: true,
      damping: 18,
      stiffness: 140,
      mass: 0.8,
    }).start();
  }, [tabIndex]);

  const INDICATOR_WIDTH = 20;
  const tabRowLeft = 12 * scale;
  const tabRowWidth = frameWidth - 24 * scale;
  const tabCenter = (index: number) =>
    tabRowLeft + ((index + 0.5) * tabRowWidth) / 5 - INDICATOR_WIDTH / 2;

  // X축 translateX 연동 (디자인 좌표 기준 기기 너비별 정밀 센터 매칭)
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, 1, 2, 3, 4].map(tabCenter),
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          height: TAB_FRAME_HEIGHT * scale,
          width: frameWidth,
        },
      ]}
    >
      {!hideBackground && (
        <View
          pointerEvents="none"
          style={[
            styles.background,
            {
              height: TAB_IMAGE_HEIGHT * scale,
              top: TAB_IMAGE_TOP * scale,
              width: TAB_FRAME_WIDTH * scale,
            },
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            accessible={false}
            resizeMode="stretch"
            source={tabBarBackground}
            style={[
              {
                width: '100%',
                height: '100%',
              },
              Platform.select({
                web: {
                  imageRendering: '-webkit-optimize-contrast',
                } as any,
              }),
            ]}
          />
        </View>
      )}
      {/* 슬라이딩 활성 탭 인디케이터 (wrapper 기준 오프셋을 사용하여 배경 아이콘 센터와 정밀 동기화) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            transform: [{ translateX }],
          },
        ]}
      />
      <View style={styles.hitRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const activeColor = '#7C67E8';
          const inactiveColor = '#898398';
          return (
            <Pressable
              accessibilityLabel={`${tab.label} 탭${isActive ? ', 선택됨' : ''}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={tab.id}
              onPress={() => onTabPress?.(tab.id)}
              style={({ pressed }) => [
                styles.tabHitArea,
                Platform.OS === 'web' ? styles.webNoOutline : null,
                pressed && styles.pressed,
              ]}
              testID={`bottom-tab-${tab.id}`}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={getTabIconName(tab.id, isActive)}
                  size={21}
                  color={isActive ? activeColor : inactiveColor}
                />
                <Text style={[
                  styles.tabLabel,
                  {
                    color: isActive ? activeColor : inactiveColor,
                    fontSize: scaledFontSize(10),
                  },
                ]}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    overflow: 'visible',
    width: '100%',
  },
  background: {
    left: 0,
    position: 'absolute',
  },
  backgroundContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  hitRow: {
    bottom: 12,
    flexDirection: 'row',
    height: 74,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  tabHitArea: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  indicator: {
    backgroundColor: '#7C67E8',
    borderRadius: 999,
    height: 4.5,
    width: 20,
    position: 'absolute',
    bottom: 16,
    left: 0,
    shadowColor: '#7C67E8',
    shadowOffset: { height: 1.5, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    marginTop: 4,
  },
  screenReaderOnly: {
    color: 'transparent',
    fontSize: 1,
    fontFamily: theme.typography.fontFamily,
    height: 1,
    opacity: 0,
    width: 1,
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
