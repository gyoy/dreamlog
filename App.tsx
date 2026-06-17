import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DreamBottomTabBar } from './src/components/DreamBottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import type { HomeTabId } from './src/types/home';
import { theme } from './src/theme';

// 모든 프로젝트 이미지 에셋 목록 — 첫 화면 로딩 시 오프스크린 prefetch 및 메모리 캐싱용
const ALL_IMAGES = [
  // 온보딩 이미지
  require('./assets/onboarding/onboarding-1.png'),
  require('./assets/onboarding/onboarding-2.png'),
  require('./assets/onboarding/onboarding-3.png'),
  require('./assets/onboarding/onboarding-4.png'),

  // 기록 화면 이미지
  require('./assets/record/back-icon.png'),
  require('./assets/record/header-cloud.png'),
  require('./assets/record/hero-sun.png'),
  require('./assets/record/hero-planet.png'),
  require('./assets/record/hero-cloud.png'),
  require('./assets/record/hero-planet-or-cloud.png'),
  require('./assets/record/bottom-tab-background.png'),
  require('./assets/record/mode-selected-background.png'),
  require('./assets/record/mode-default-background.png'),
  require('./assets/record/mode-grid-icon.png'),
  require('./assets/record/mode-star-icon.png'),

  // 홈 화면 분리 파트 이미지
  require('./assets/home/parts/home-avatar.png'),
  require('./assets/home/parts/home-moon.png'),
  require('./assets/home/parts/home-record-book.png'),
  require('./assets/home/parts/home-record-cloud.png'),
  require('./assets/home/parts/home-mode-thumbnail.png'),
  require('./assets/home/parts/home-recent-thumb-1.png'),
  require('./assets/home/parts/home-recent-thumb-2.png'),

  // 설정 화면 이미지
  require('./assets/settings/profile-avatar.png'),
  require('./assets/settings/badge-star.png'),
  require('./assets/settings/badge-cloud.png'),
  require('./assets/settings/badge-planet.png'),
  require('./assets/settings/badge-cal3.png'),
  require('./assets/settings/badge-cal7.png'),
  require('./assets/settings/badge-cal30.png'),
  require('./assets/settings/mode-sun.png'),
  require('./assets/settings/mode-cloud-box.png'),
  require('./assets/settings/tip-star.png'),
];

type AppScreen = 'home' | 'record' | 'archive' | 'stats' | 'more';

export default function App() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const [activeTab, setActiveTab] = useState<HomeTabId>('home');
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);
  const [shouldRenderHomeScreen, setShouldRenderHomeScreen] = useState(false);
  const prefetchedRef = useRef(false);
  const { width, height } = useWindowDimensions();

  // 화면 크기에 따른 탭 바 너비 계산 (기록하기 화면의 가로 너비 기준 스케일과 동기화)
  const appWidth = Math.min(width, 393);
  const appScale = Math.min(1, Math.max(0.84, appWidth / 393));
  const screenWidth = 393 * appScale;

  // 앱 시작 직후 모든 이미지 백그라운드 선로딩 (한 번만)
  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    ALL_IMAGES.forEach((src) => {
      try {
        const resolved = Image.resolveAssetSource(src);
        if (resolved?.uri) {
          Image.prefetch(resolved.uri).catch(() => {});
        }
      } catch (e) {
        // 플랫폼별 예외 차단
      }
    });
  }, []);

  // 로컬 저장소에서 온보딩 완료 상태 로드
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const val = await AsyncStorage.getItem('@dreamlog_onboarding_completed');
        if (val === 'true') {
          setHasCompletedOnboarding(true);
          setShouldRenderHomeScreen(true); // 이미 완료했다면 즉시 홈 화면 활성화
        }
      } catch (e) {
        // 로드 예외 무시
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadOnboardingState();
  }, []);

  // 아직 온보딩을 안 한 사용자(최초 실행)를 위해 온보딩 진입 후 1.2초 지연하여 HomeScreen 백그라운드 마운트
  useEffect(() => {
    if (hasCompletedOnboarding) return;
    const timer = setTimeout(() => {
      setShouldRenderHomeScreen(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding]);

  const handleTabPress = (tabId: HomeTabId) => {
    setActiveTab(tabId);
    if (tabId === 'record') {
      setActiveScreen('record');
    } else if (tabId === 'archive') {
      setActiveScreen('archive');
    } else if (tabId === 'stats') {
      setActiveScreen('stats');
    } else if (tabId === 'more') {
      setActiveScreen('more');
    } else {
      setActiveScreen('home');
    }
  };

  const handleRecordPress = (preselectedDate?: string) => {
    setTargetDate(preselectedDate);
    setActiveTab('record');
    setActiveScreen('record');
  };

  const handleOnboardingComplete = () => {
    AsyncStorage.setItem('@dreamlog_onboarding_completed', 'true').catch(() => {});
    setHasCompletedOnboarding(true);
    setActiveTab('home');
    setActiveScreen('home');
  };

  if (!isStorageLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      {/* 이미지 오프스크린 선로딩 레이어 (메모리 디코딩 강제화로 깜빡임 방지) */}
      <View style={styles.prefetchContainer} pointerEvents="none">
        {ALL_IMAGES.map((src, index) => (
          <Image key={index} source={src} style={styles.prefetchImage} />
        ))}
      </View>

      {!hasCompletedOnboarding ? (
        <>
          {shouldRenderHomeScreen && (
            <View style={styles.hidden} pointerEvents="none">
              <HomeScreen
                active={false}
                onRecordPress={handleRecordPress}
                onTabPress={handleTabPress}
                onRecentDreamPress={(dream) => handleRecordPress(dream.date)}
                onSummaryPress={() => handleTabPress('archive')}
                onPlanetModePress={() => handleTabPress('archive')}
                onDreamModePress={() => handleTabPress('archive')}
              />
            </View>
          )}
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </>
      ) : (
        <View style={styles.root}>
          {/* 영속 마운트(Offstage rendering) 기법: 언마운트 레이아웃 지연을 원천 제거하여 즉시 전환 구현 */}
          <View
            pointerEvents={activeScreen === 'home' ? 'auto' : 'none'}
            style={activeScreen === 'home' ? styles.root : styles.hidden}
          >
            <HomeScreen
              active={activeScreen === 'home'}
              onRecordPress={handleRecordPress}
              onTabPress={handleTabPress}
              onRecentDreamPress={(dream) => handleRecordPress(dream.date)}
              onSummaryPress={() => handleTabPress('archive')}
              onPlanetModePress={() => handleTabPress('archive')}
              onDreamModePress={() => handleTabPress('archive')}
            />
          </View>

          <View
            pointerEvents={activeScreen === 'record' ? 'auto' : 'none'}
            style={activeScreen === 'record' ? styles.root : styles.hidden}
          >
            <RecordScreen
              active={activeScreen === 'record'}
              targetDate={targetDate}
              onBack={() => {
                setTargetDate(undefined);
                // Go back to the tab we came from (or default to home)
                const prevTab = activeTab === 'record' ? 'home' : activeTab;
                setActiveTab(prevTab);
                setActiveScreen(prevTab);
              }}
              onSubmit={() => {
                setTargetDate(undefined);
                // Redirect to calendar to see the new entry
                setActiveTab('archive');
                setActiveScreen('archive');
              }}
              onTabPress={handleTabPress}
            />
          </View>

          <View
            pointerEvents={activeScreen === 'archive' ? 'auto' : 'none'}
            style={activeScreen === 'archive' ? styles.root : styles.hidden}
          >
            <CalendarScreen
              active={activeScreen === 'archive'}
              onRecordPress={handleRecordPress}
              onTabPress={handleTabPress}
            />
          </View>

          <View
            pointerEvents={activeScreen === 'stats' ? 'auto' : 'none'}
            style={activeScreen === 'stats' ? styles.root : styles.hidden}
          >
            <StatsScreen
              active={activeScreen === 'stats'}
              onTabPress={handleTabPress}
              onRecordPress={handleRecordPress}
            />
          </View>

          <View
            pointerEvents={activeScreen === 'more' ? 'auto' : 'none'}
            style={activeScreen === 'more' ? styles.root : styles.hidden}
          >
            <MoreScreen
              active={activeScreen === 'more'}
              onTabPress={handleTabPress}
            />
          </View>

          {/* 공통 하단 탭 바 (화면 전환 시에도 언마운트 되지 않아 애니메이션이 연속됨) */}
          <View pointerEvents="box-none" style={styles.bottomTabLayer}>
            <DreamBottomTabBar
              activeTab={activeTab}
              onTabPress={handleTabPress}
              width={screenWidth}
              isHomeScreen={activeScreen === 'home'}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgWhite },
  // 화면 밖으로 밀어내 완전히 숨김 (opacity:0은 전환 시 흰색 번쩍임 유발)
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ translateX: 9999 }],
  },
  prefetchContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: -100,
    top: -100,
    opacity: 0.01,
    overflow: 'hidden',
  },
  prefetchImage: {
    width: 1,
    height: 1,
  },
  bottomTabLayer: {
    alignItems: 'center',
    bottom: theme.spacing.xl, // 12
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 999,
  },
});
