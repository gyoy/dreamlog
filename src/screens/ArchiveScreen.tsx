import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import { theme } from '../theme';
import type { HomeTabId } from '../types/home';

type ArchiveScreenProps = {
  active?: boolean;
  onTabPress?: (tabId: HomeTabId) => void;
};

export function ArchiveScreen({ active, onTabPress }: ArchiveScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        duration: 300,
        easing: Easing.out(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [active, fadeAnim]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      {
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      <ScrollView
        bounces
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>꿈 보관소</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>임시 파일</Text>
            </View>
          </View>

          {/* Intro Card */}
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>📁</Text>
            </View>
            <Text style={styles.cardTitle}>꿈 아카이브가 준비 중이에요</Text>
            <Text style={styles.cardDesc}>
              이전에 꾸었던 꿈들을 날짜별, 키워드별로 모아 한눈에 찾아보고 관리할 수 있는 공간입니다. 완성된 아카이브 기능을 곧 만나보세요!
            </Text>

            {/* Mockup Wireframe Layout */}
            <View style={styles.mockupContainer}>
              <Text style={styles.mockupLabel}>아카이브 미리보기</Text>
              
              {/* Mock Calendar Grid */}
              <View style={styles.mockGrid}>
                {Array.from({ length: 14 }).map((_, i) => (
                  <View key={i} style={[styles.mockCell, i === 4 && styles.mockCellActive]}>
                    <Text style={[styles.mockCellText, i === 4 && styles.mockCellTextActive]}>
                      {i + 1}
                    </Text>
                    {i === 4 && <View style={styles.mockDot} />}
                  </View>
                ))}
              </View>

              {/* Mock List Item */}
              <View style={styles.mockList}>
                <View style={styles.mockItem}>
                  <View style={styles.mockItemDot} />
                  <View style={styles.mockItemLines}>
                    <View style={[styles.mockLine, { width: '80%' }]} />
                    <View style={[styles.mockLine, { width: '45%', marginTop: 6 }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Go to Home Button */}
            <Pressable
              onPress={() => onTabPress?.('home')}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>홈으로 돌아가기</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#f5f4fa',
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 120,
  },
  container: {
    alignSelf: 'center',
    paddingTop: 16,
    width: 393,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.titleLarge,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
  },
  badge: {
    backgroundColor: 'rgba(192, 82, 130, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(192, 82, 130, 0.2)',
  },
  badgeText: {
    color: theme.colors.weekendPink,
    fontSize: theme.typography.sizes.labelSmall,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
  },
  card: {
    backgroundColor: theme.colors.bgWhite,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f2f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 32,
    fontFamily: theme.typography.fontFamily,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
    marginBottom: 10,
  },
  cardDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  mockupContainer: {
    width: '100%',
    backgroundColor: '#fbfaff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  mockupLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 16,
  },
  mockCell: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCellActive: {
    backgroundColor: 'rgba(144, 126, 255, 0.15)',
  },
  mockCellText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  mockCellTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily,
  },
  mockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    bottom: 3,
  },
  mockList: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
  },
  mockItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mockItemDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f2ff',
    marginRight: 10,
  },
  mockItemLines: {
    flex: 1,
  },
  mockLine: {
    height: 6,
    backgroundColor: '#ece8f7',
    borderRadius: 3,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: theme.colors.textLight,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.semibold,
  },
});
