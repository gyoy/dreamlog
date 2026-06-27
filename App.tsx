import { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';

import { ThemeProvider } from './src/context/ThemeContext';
import { DreamBottomTabBar } from './src/components/DreamBottomTabBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import type { HomeTabId } from './src/types/home';
import type { SavedDream } from './src/types/record';
import { theme } from './src/theme';

// 모든 프로젝트 이미지 에셋 목록 — 첫 화면 로딩 시 오프스크린 prefetch 및 메모리 캐싱용
  const CRITICAL_IMAGES = [
  // 온보딩 이미지
  require('./assets/onboarding/onboarding-1.png'),
  require('./assets/onboarding/onboarding-2.png'),
  require('./assets/onboarding/onboarding-3.png'),
  require('./assets/onboarding/onboarding-4.png'),
  require('./assets/record/bottom-tab-background-clean.png'),
  require('./assets/home/rebuilt/avatar-image.png'),
  require('./assets/home/rebuilt/moon-status-illustration.png'),
  require('./assets/home/rebuilt/notification-icon.png'),
  require('./assets/home/rebuilt/book-pencil-illustration.png'),
  require('./assets/home/rebuilt/cloud-illustration.png'),
  require('./assets/home/rebuilt/constellation-mode-cloud.png'),
];
const ONBOARDING_STORAGE_KEY = '@dreamlog_onboarding_completed_v2';
const ARCHIVE_VIEW_MODE_KEY = '@dreamlog_archive_view_mode';

type AppScreen = 'home' | 'record' | 'archive' | 'stats' | 'more';

const PRETENDARD_FONT_SOURCES = {
  Pretendard: require('./assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  'Pretendard-ExtraBold': require('./assets/fonts/Pretendard-ExtraBold.otf'),
  'Pretendard-Black': require('./assets/fonts/Pretendard-Black.otf'),
  Cafe24SsurroundAir: require('./assets/fonts/Cafe24SsurroundAir.ttf'),
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(PRETENDARD_FONT_SOURCES);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [userName, setUserName] = useState('꿈결님');
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const [activeTab, setActiveTab] = useState<HomeTabId>('home');
  const [recordReturnTab, setRecordReturnTab] = useState<HomeTabId>('home');
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);
  const [targetDreamId, setTargetDreamId] = useState<string | undefined>(undefined);
  const [lastSavedDream, setLastSavedDream] = useState<SavedDream | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const prefetchedRef = useRef(false);
  const { width, height } = useWindowDimensions();

  console.log('[App] State Check:', {
    fontsLoaded,
    fontError: fontError ? fontError.message : null,
    isStorageLoaded,
    hasCompletedOnboarding,
    activeScreen,
  });

  // 화면 크기에 따른 탭 바 너비 계산 (기록하기 화면의 가로 너비 기준 스케일과 동기화)
  const appWidth = Math.min(width, 393);
  const appScale = Math.min(1, Math.max(0.84, appWidth / 393));
  const screenWidth = 393 * appScale;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    try {
      const styleId = 'dreamlog-font-faces';
      if (document.getElementById(styleId)) return;

      const weights = [
        ['Pretendard-Regular', 400],
        ['Pretendard-Medium', 500],
        ['Pretendard-SemiBold', 600],
        ['Pretendard-Bold', 700],
        ['Pretendard-ExtraBold', 800],
        ['Pretendard-Black', 900],
      ] as const;
      const style = document.createElement('style');
      style.id = styleId;
      const pretendardFaces = weights
        .map(([family, weight]) => {
          const uri = Asset.fromModule(PRETENDARD_FONT_SOURCES[family]).uri;
          return `@font-face{font-family:'Pretendard';src:url('${uri}') format('opentype');font-style:normal;font-weight:${weight};font-display:swap;}`;
        })
        .join('');
      const displayUri = Asset.fromModule(PRETENDARD_FONT_SOURCES.Cafe24SsurroundAir).uri;
      style.textContent = `${pretendardFaces}@font-face{font-family:'Cafe24SsurroundAir';src:url('${displayUri}') format('truetype');font-style:normal;font-weight:400;font-display:swap;}`;
      document.head.appendChild(style);
    } catch (e) {
      console.error('Failed to inject font faces on Web:', e);
    }
  }, []);

  // 앱 시작 직후 모든 이미지 백그라운드 선로딩 (한 번만)
  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    CRITICAL_IMAGES.forEach((src) => {
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
        const [completed, storedUserName] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
          AsyncStorage.getItem('@dreamlog_user_name'),
        ]);
        setHasCompletedOnboarding(completed === 'true');
        if (storedUserName?.trim()) {
          setUserName(storedUserName.trim());
        }
      } catch (e) {
        // 로드 예외 무시
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadOnboardingState();
  }, []);

  const handleTabPress = (tabId: HomeTabId) => {
    const previousTab = activeTab === 'record' ? recordReturnTab : activeTab;
    setActiveTab(tabId);
    if (tabId === 'record') {
      setRecordReturnTab(previousTab);
      setTargetDate(undefined);
      setTargetDreamId(undefined);
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

  const handleRecordPress = (preselectedDate?: string, dreamId?: string) => {
    setRecordReturnTab(activeTab === 'record' ? 'home' : activeTab);
    setTargetDate(preselectedDate);
    setTargetDreamId(dreamId);
    setActiveTab('record');
    setActiveScreen('record');
  };

  const handleOnboardingComplete = (_source?: string, completedUserName?: string) => {
    const normalizedUserName = completedUserName?.trim();
    if (normalizedUserName) {
      setUserName(normalizedUserName);
    }
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true').catch(() => {});
    setHasCompletedOnboarding(true);
    setRefreshTrigger(Date.now());
    setActiveTab('home');
    setActiveScreen('home');
  };

  const shouldBlockRendering = Platform.OS === 'web'
    ? !isStorageLoaded
    : ((!fontsLoaded && !fontError) || !isStorageLoaded);

  if (shouldBlockRendering) {
    return <View style={styles.root} />;
  }

  return (
    <ThemeProvider>
      <View style={styles.root}>
        {!hasCompletedOnboarding ? (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        ) : (
          <View style={styles.root}>
            {/* 영속 마운트(Offstage rendering) 기법: 언마운트 레이아웃 지연을 원천 제거하여 즉시 전환 구현 */}
            <View
              pointerEvents={activeScreen === 'home' ? 'auto' : 'none'}
              style={activeScreen === 'home' ? styles.root : styles.hidden}
            >
              <HomeScreen
                active={activeScreen === 'home'}
                refreshTrigger={refreshTrigger}
                userName={userName}
                onProfilePress={() => handleTabPress('more')}
                onRecordPress={handleRecordPress}
                onTabPress={handleTabPress}
                onRecentDreamPress={(dream) => handleRecordPress(dream.date, dream.id)}
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
                targetDreamId={targetDreamId}
                onBack={() => {
                  setTargetDate(undefined);
                  setTargetDreamId(undefined);
                  setActiveTab(recordReturnTab);
                  setActiveScreen(recordReturnTab);
                }}
                onSubmit={(_, savedDream) => {
                  setTargetDate(undefined);
                  setTargetDreamId(undefined);
                  setLastSavedDream(savedDream);
                  setRefreshTrigger(Date.now());
                  if (savedDream.mode === 'constellation') {
                    AsyncStorage.setItem(ARCHIVE_VIEW_MODE_KEY, 'constellation').catch(() => {});
                  } else if (savedDream.mode === 'planet') {
                    AsyncStorage.setItem(ARCHIVE_VIEW_MODE_KEY, 'planet').catch(() => {});
                  }
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
                highlightDreamId={lastSavedDream?.id}
                refreshTrigger={refreshTrigger}
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
                refreshTrigger={refreshTrigger}
                userName={userName}
                onProfilePress={() => handleTabPress('more')}
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
                userName={userName}
                onUserNameChange={setUserName}
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
    </ThemeProvider>
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
    display: 'none',
  },
  bottomTabLayer: {
    alignItems: 'center',
    bottom: 32,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 999,
  },
});
