import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSavedDreams, deleteDream, saveDream } from '../utils/dreamStorage';
import { RECORD_PRIMARY_KEYWORDS, RECORD_EXTRA_KEYWORDS, RECORD_MOODS } from '../data/record';
import type { SavedDream } from '../types/record';
import { MoodFace } from '../components/MoodFace';
import { Ionicons } from '@expo/vector-icons';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  syncDynamicNotifications,
} from '../utils/notificationStorage';
import {
  HOME_DATA,
  HOME_DESIGN_HEIGHT,
  HOME_DESIGN_WIDTH,
  HOME_HIT_AREAS,
} from '../data/home';
import { theme } from '../theme';
import type {
  DesignRect,
  DreamModeId,
  HomeData,
  HomeDreamMode,
  HomeTabId,
  RecentDream,
} from '../types/home';
import { analyzeDream, type DreamAnalysisResult } from '../services/gemini';
import { useTheme } from '../context/ThemeContext';
import { MONTHLY_CONSTELLATIONS, RESERVE_CONSTELLATIONS } from '../data/constellations';

type HomeScreenProps = {
  active?: boolean;
  data?: HomeData;
  refreshTrigger?: number;
  userName?: string;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  onRecordPress?: (preselectedDate?: string, dreamId?: string) => void;
  onSummaryPress?: () => void;
  onDreamModePress?: (mode: HomeDreamMode) => void;
  onPlanetModePress?: () => void;
  onRecentDreamPress?: (dream: RecentDream) => void;
  onRecentAllPress?: () => void;
  onFavoritePress?: (dream: RecentDream) => void;
  onTabPress?: (tabId: HomeTabId) => void;
};

const homeAvatarSource = require('../../assets/home/rebuilt/avatar-image.png');
const homeMoonSource = require('../../assets/home/rebuilt/moon-status-illustration.png');
const homeNotificationSource = require('../../assets/home/rebuilt/notification-icon.png');
const homeBookSource = require('../../assets/home/rebuilt/book-pencil-illustration.png');
const homeButtonSource = require('../../assets/home/rebuilt/button-background.png');
const homeButtonPencilSource = require('../../assets/home/rebuilt/button-pencil-icon.png');
const homeCloudSource = require('../../assets/home/rebuilt/cloud-illustration.png');
const homePurpleStarSource = require('../../assets/home/rebuilt/decor-purple-star.png');
const homeYellowStarSource = require('../../assets/home/rebuilt/decor-yellow-star.png');
const homeHeroConstellationSource = require('../../assets/home/rebuilt/hero-constellation-lines.png');
const homeConstellationModeSource = require('../../assets/home/rebuilt/home-constellation-mode-v2.png');
const dreamlogWordmarkSource = require('../../assets/brand/dreamlog-wordmark.png');
const CONSTELLATION_GUIDES = [
  require('../../assets/constellation-guides-premium/01-capricorn.png'),
  require('../../assets/constellation-guides-premium/02-aquarius.png'),
  require('../../assets/constellation-guides-premium/03-pisces.png'),
  require('../../assets/constellation-guides-premium/04-aries.png'),
  require('../../assets/constellation-guides-premium/05-taurus.png'),
  require('../../assets/constellation-guides-premium/06-gemini.png'),
  require('../../assets/constellation-guides-premium/07-cancer.png'),
  require('../../assets/constellation-guides-premium/08-leo.png'),
  require('../../assets/constellation-guides-premium/09-virgo.png'),
  require('../../assets/constellation-guides-premium/10-libra.png'),
  require('../../assets/constellation-guides-premium/11-scorpio.png'),
  require('../../assets/constellation-guides-premium/12-sagittarius.png'),
] as const;
const RESERVE_GUIDES = [
  require('../../assets/constellation-guides-premium/13-cassiopeia.png'),
  require('../../assets/constellation-guides-premium/14-cygnus.png'),
  require('../../assets/constellation-guides-premium/15-pegasus.png'),
  require('../../assets/constellation-guides-premium/16-andromeda.png'),
  require('../../assets/constellation-guides-premium/17-orion.png'),
  require('../../assets/constellation-guides-premium/18-lyra.png'),
] as const;
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];
const CONSTELLATION_COLLECTION_KEY = '@dreamlog_constellation_collection_v1';

// ─── 애니메이션 상수 ────────────────────────────────────────────────────────
const EASE_OUT_QUINT  = Easing.bezier(0.22, 1.0, 0.36, 1.0);
const EASE_IN_OUT_CUBIC = Easing.bezier(0.65, 0.0, 0.35, 1.0);
const EASE_OUT_BACK   = Easing.bezier(0.34, 1.26, 0.64, 1.0);
const noop = () => {};

const HOME_BACKGROUND_WIDTH = 393;
const HOME_BACKGROUND_HEIGHT = 852;
const HOME_FRAME_PADDING = 0;

const getScreenLayout = (width: number, height: number) => {
  const scale = Math.min(width / HOME_DESIGN_WIDTH, height / HOME_DESIGN_HEIGHT);
  const screenWidth = HOME_DESIGN_WIDTH * scale;
  const screenHeight = HOME_DESIGN_HEIGHT * scale;

  // 디바이스 툴 테두리가 제거되었으므로 배경을 화면 상단(0)에 밀착시킵니다.
  const top = 0;

  return {
    image: {
      height: screenHeight,
      left: (width - screenWidth) / 2,
      top: top,
      width: screenWidth,
    },
    scale,
  };
};

const mapRectToScreen = (
  rect: DesignRect,
  imageLeft: number,
  imageTop: number,
  imageScale: number,
) => ({
  height: rect.height * imageScale,
  left: imageLeft + rect.x * imageScale,
  top: imageTop + rect.y * imageScale,
  width: rect.width * imageScale,
});

const getFallbackMode = (modeId: DreamModeId): HomeDreamMode => {
  if (modeId === 'constellation') {
    return {
      ctaLabel: '상세보기',
      description: '키워드와 감정의 흐름을 별자리처럼 연결해보세요.',
      id: 'constellation',
      title: '별자리 기록',
    };
  }

  return {
    ctaLabel: '상세보기',
    description: '별이 연결된 나만의 꿈 우주를 확인해보세요.',
    id: 'planet',
    title: '행성 수집',
  };
};

const getKeywordLabel = (id: string) => {
  const allKeywords = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
  const found = allKeywords.find((k) => k.id === id);
  return found ? found.label : id;
};

export function HomeScreen({
  active,
  data = HOME_DATA,
  refreshTrigger,
  userName: propUserName,
  onProfilePress = noop,
  onNotificationPress = noop,
  onRecordPress,
  onSummaryPress = noop,
  onDreamModePress,
  onPlanetModePress = noop,
  onRecentDreamPress = noop,
  onRecentAllPress = noop,
  onFavoritePress = noop,
  onTabPress = noop,
}: HomeScreenProps) {
  console.log('[HomeScreen] Render active:', active);
  const { textSize, isDark } = useTheme();
  const fontScale = textSize === 'small' ? 1 : textSize === 'default' ? 1.15 : 1.26;
  const { height: rawHeight, width: rawWidth } = useWindowDimensions();
  const width = Math.min(rawWidth, 393);
  const height = Math.min(rawHeight, 852);
  const entrance = useRef(new Animated.Value(0)).current;
  const recordButtonPress = useRef(new Animated.Value(0)).current;
  const moonFloat = useRef(new Animated.Value(0)).current;
  const bookFloat = useRef(new Animated.Value(0)).current;
  const cloudFloat = useRef(new Animated.Value(0)).current;
  const modeFloat = useRef(new Animated.Value(0)).current;

  // DB 연동 및 동적 데이터 상태
  const [dreams, setDreams] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(2);
  const [userName, setUserName] = useState(propUserName || '꿈결님');
  const [selectedDetailDream, setSelectedDetailDream] = useState<SavedDream | null>(null);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [isConstellationModalVisible, setIsConstellationModalVisible] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [collectedMonths, setCollectedMonths] = useState<number[]>([]);
  const [selectedConstellationMonth, setSelectedConstellationMonth] = useState(
    new Date().getMonth() + 1,
  );

  // 꿈 기록 로드 함수
  const loadDreams = async () => {
    try {
      const stored = await getSavedDreams();
      setDreams(stored);
      await loadNotifications(stored);
    } catch (e) {
      console.error('Failed to load dreams on HomeScreen:', e);
    }
  };

  // 알림 목록 및 개수 로드/동기화 함수
  const loadNotifications = async (currentDreamsList?: any[]) => {
    try {
      const targetDreams = currentDreamsList || dreams;
      const unreadCount = await syncDynamicNotifications(targetDreams);
      setNotificationCount(unreadCount);
      const list = await getNotifications();
      setNotificationsList(list);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  // 닉네임 로드 함수
  const loadUserName = async () => {
    try {
      const stored = await AsyncStorage.getItem('@dreamlog_user_name');
      if (stored !== null && stored.trim() !== '') {
        setUserName(stored.trim());
      } else {
        setUserName('꿈결님');
      }
    } catch (e) {
      console.error('Failed to load user name on HomeScreen:', e);
    }
  };

  useEffect(() => {
    if (active) {
      loadDreams();
      loadUserName();
    }
  }, [active, refreshTrigger]);

  useEffect(() => {
    if (propUserName?.trim()) {
      setUserName(propUserName.trim());
    }
  }, [propUserName]);

  // 이번 달 꿈 기록 통계 자동 계산
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1 ~ 12
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;

    const curPrefix = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const curCount = dreams.filter((d) => d.date?.startsWith(curPrefix)).length;
    const prevCount = dreams.filter((d) => d.date?.startsWith(prevPrefix)).length;
    const delta = curCount - prevCount;

    return {
      currentCount: curCount,
      previousMonthDelta: delta,
    };
  }, [dreams]);

  // 최근 기록 동적 데이터 매핑 (가장 최근 3건 정렬하여 추출)
  const recentDreamsList = useMemo(() => {
    const sorted = [...dreams].sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return sorted.slice(0, 3);
  }, [dreams]);

  const mappedRecentDreams = useMemo(() => {
    return recentDreamsList.map((d) => {
      // 날짜 YYYY-MM-DD -> M월 D일 (요일) 변환
      let dateLabel = d.date;
      const parts = (d.date || '').split('-');
      if (parts.length === 3) {
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(parseInt(parts[0], 10), month - 1, day);
        const dayOfWeekStr = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
        dateLabel = `${month}월 ${day}일 (${dayOfWeekStr})`;
      }

      return {
        id: d.id,
        title: d.title || '제목 없음',
        dateLabel,
        tags: (d.selectedKeywordIds || []).map((id: string) => ({
          id,
          label: getKeywordLabel(id),
        })),
        isFavorite: Boolean(d.isFavorite),
        date: d.date,
        mode: d.mode,
      };
    });
  }, [recentDreamsList]);

  // 로컬 즐겨찾기 클릭 핸들러
  const handleFavoritePressLocal = async (dream: RecentDream) => {
    const updatedDreams = dreams.map((d) => {
      if (d.id === dream.id) {
        return { ...d, isFavorite: !d.isFavorite };
      }
      return d;
    });
    setDreams(updatedDreams);

    try {
      const allDreams = await getSavedDreams();
      const idx = allDreams.findIndex((d) => d.id === dream.id);
      if (idx !== -1) {
        allDreams[idx].isFavorite = !allDreams[idx].isFavorite;
        await AsyncStorage.setItem('@dreamlog_saved_dreams', JSON.stringify(allDreams));
      }
    } catch (e) {
      console.error('Failed to update favorite status from Home:', e);
    }
    onFavoritePress?.(dream);
  };

  // 최근 기록 클릭 핸들러 (상세 보기 모달 오픈)
  const handleRecentDreamPressLocal = (dreamId: string) => {
    const found = dreams.find((d) => d.id === dreamId);
    if (found) {
      setSelectedDetailDream(found);
    }
  };

  // 최근 기록 상세 모달 - 수정 핸들러
  const handleEditDreamLocal = (date: string, dreamId?: string) => {
    setSelectedDetailDream(null);
    if (onRecordPress) {
      onRecordPress(date, dreamId);
    }
  };

  // 최근 기록 상세 모달 - 삭제 핸들러
  const handleDeleteDreamLocal = async (id: string) => {
    Alert.alert(
      '꿈 기록 삭제',
      '이 꿈 기록을 은하수 보관함에서 영구히 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDream(id);
              setSelectedDetailDream(null);
              await loadDreams();
            } catch (e) {
              console.error('Failed to delete dream on HomeScreen:', e);
            }
          },
        },
      ]
    );
  };

  // 알림 아이콘 클릭 핸들러 (실제 알림 모달 오픈)
  const handleNotificationPressLocal = async () => {
    try {
      const list = await getNotifications();
      setNotificationsList(list);
      setIsNotificationModalVisible(true);
    } catch (e) {
      console.error('Failed to open notifications modal:', e);
    }
    onNotificationPress?.();
  };

  // 모든 알림 읽음 처리 핸들러
  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await markAllAsRead();
      await loadNotifications();
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    }
  };

  // 모든 알림 삭제 핸들러
  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      await loadNotifications();
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  };

  // 특정 알림 읽음 처리 핸들러
  const handleMarkSingleAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      await loadNotifications();
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  // UI 상태 관리 States
  const [isRecordModalVisible, setIsRecordModalVisible] = useState(false);
  const [dreamText, setDreamText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DreamAnalysisResult | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ─── Animated Values ──────────────────────────────────────────────────────
  const recordModalProgress = useRef(new Animated.Value(0)).current;
  const loadingBreath  = useRef(new Animated.Value(0)).current;
  const loadingGlow    = useRef(new Animated.Value(0)).current;
  const loadingRotate  = useRef(new Animated.Value(0)).current;
  const resultProgress = useRef(new Animated.Value(0)).current;
  const errorProgress  = useRef(new Animated.Value(0)).current;
  const loopAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const fullLayout = useMemo(() => {
    const scale = Math.max(rawWidth / 393, rawHeight / 852);
    const screenWidth = 393 * scale;
    const screenHeight = 852 * scale;
    const top = (rawHeight - screenHeight) / 2;
    const left = (rawWidth - screenWidth) / 2;
    return {
      image: { width: screenWidth, height: screenHeight, left, top },
      scale,
    };
  }, [rawWidth, rawHeight]);

  const layout = useMemo(() => {
    const offsetLeft = (rawWidth - width) / 2;
    const offsetTop = (rawHeight - height) / 2;

    const scale = Math.max(width / 393, height / 852);
    const screenWidth = 393 * scale;
    const screenHeight = 852 * scale;
    const top = offsetTop + (height - screenHeight) / 2;
    const left = offsetLeft + (width - screenWidth) / 2;
    return {
      image: { width: screenWidth, height: screenHeight, left, top },
      scale,
    };
  }, [rawWidth, rawHeight, width, height]);
  const textLayout = useMemo(() => {
    if (textSize === 'large') {
      return {
        brandTop: 47,
        heroTitleTop: 155,
        heroBodyTop: 186,
        heroButtonTop: 242,
        cardTitleTop: 353,
        summaryCountTop: 383,
        summaryBodyTop: 390,
        summaryCompareTop: 421,
        summaryDeltaTop: 427,
        cardButtonTop: 458,
        constellationBodyTop: 391,
        recentTitleTop: 523,
        recentTitleWidth: 158,
        recentRowTitleTop: 3,
        recentRowTitleWidth: 154,
        recentRowTagsTop: 28,
        recentRowDateTop: 22,
      };
    }

    if (textSize === 'small') {
      return {
        brandTop: 52,
        heroTitleTop: 160,
        heroBodyTop: 190,
        heroButtonTop: 245,
        cardTitleTop: 357,
        summaryCountTop: 387,
        summaryBodyTop: 393,
        summaryCompareTop: 426,
        summaryDeltaTop: 432,
        cardButtonTop: 463,
        constellationBodyTop: 398,
        recentTitleTop: 527,
        recentTitleWidth: 166,
        recentRowTitleTop: 7,
        recentRowTitleWidth: 174,
        recentRowTagsTop: 29,
        recentRowDateTop: 25,
      };
    }

    return {
      brandTop: 49,
      heroTitleTop: 158,
      heroBodyTop: 189,
      heroButtonTop: 246,
      cardTitleTop: 356,
      summaryCountTop: 386,
      summaryBodyTop: 393,
      summaryCompareTop: 425,
      summaryDeltaTop: 431,
      cardButtonTop: 462,
      constellationBodyTop: 395,
      recentTitleTop: 525,
      recentTitleWidth: 158,
      recentRowTitleTop: 5,
      recentRowTitleWidth: 164,
      recentRowTagsTop: 29,
      recentRowDateTop: 25,
    };
  }, [textSize]);
  const cardTitleFontScale = fontScale;
  const primaryDreamMode = useMemo(
    () => data.dreamModes.find((mode) => mode.id === 'constellation') ?? data.dreamModes[0] ?? getFallbackMode('constellation'),
    [data.dreamModes],
  );
  const dreamMonthsThisYear = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from(new Set(
      dreams
        .map((dream) => String(dream.date ?? ''))
        .filter((date) => date.startsWith(`${year}-`))
        .map((date) => Number(date.slice(5, 7)))
        .filter((month) => month >= 1 && month <= 12),
    )).sort((a, b) => a - b);
  }, [dreams]);
  const completedMonths = useMemo(() => new Set(collectedMonths), [collectedMonths]);
  const selectedMonthDreams = useMemo(
    () => dreams.filter((dream) => Number(String(dream.date ?? '').slice(5, 7)) === selectedConstellationMonth),
    [dreams, selectedConstellationMonth],
  );
  const selectedGuide = MONTHLY_CONSTELLATIONS[selectedConstellationMonth - 1];

  useEffect(() => {
    const loadConstellationCollection = async () => {
      try {
        const stored = await AsyncStorage.getItem(CONSTELLATION_COLLECTION_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        const persistedMonths = Array.isArray(parsed)
          ? parsed.filter((month): month is number => Number.isInteger(month) && month >= 1 && month <= 12)
          : [];
        setCollectedMonths(
          Array.from(new Set([...persistedMonths, ...dreamMonthsThisYear])).sort((a, b) => a - b),
        );
      } catch (error) {
        console.error('Failed to load constellation collection:', error);
        setCollectedMonths(dreamMonthsThisYear);
      }
    };

    void loadConstellationCollection();
  }, [dreamMonthsThisYear]);

  useEffect(() => {
    if (collectedMonths.length === 0) return;
    AsyncStorage.setItem(CONSTELLATION_COLLECTION_KEY, JSON.stringify(collectedMonths)).catch(
      (error) => console.error('Failed to save constellation collection:', error),
    );
  }, [collectedMonths]);
  const dreamModeAccessibilityLabel = useMemo(() => {
    const modeNames = data.dreamModes.map((mode) => mode.title).join(', ');

    return modeNames
      ? `꿈 모드 상세보기. ${modeNames}를 확인할 수 있어요`
      : `${primaryDreamMode.title} 상세보기`;
  }, [data.dreamModes, primaryDreamMode.title]);

  // ─── [Entrance] 화면 최초 진입 ──────────────────────────────────────────
  useEffect(() => {
    if (active !== false) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        toValue: 1,
        duration: 260,
        easing: EASE_OUT_QUINT,
        useNativeDriver: true,
      }).start();
    }
  }, [active, entrance]);

  // ─── [Record Modal] 슬라이드 업/다운 ────────────────────────────────────
  useEffect(() => {
    if (isRecordModalVisible) {
      Animated.spring(recordModalProgress, {
        toValue: 1,
        mass: 0.8,
        stiffness: 380,
        damping: 34,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecordModalVisible, recordModalProgress]);

  // ─── [Loading] 3축 독립 루프 ─────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      loadingBreath.setValue(0);
      loadingGlow.setValue(0);
      loadingRotate.setValue(0);

      const breathLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingBreath, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(loadingBreath, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingGlow, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(loadingGlow, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      const rotateLoop = Animated.loop(
        Animated.timing(loadingRotate, {
          toValue: 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      loopAnimationRef.current = Animated.parallel([
        breathLoop,
        glowLoop,
        rotateLoop,
      ]);
      loopAnimationRef.current.start();
    } else {
      loopAnimationRef.current?.stop();
      loadingBreath.setValue(0);
      loadingGlow.setValue(0);
      loadingRotate.setValue(0);
    }
    return () => {
      loopAnimationRef.current?.stop();
    };
  }, [isLoading, loadingBreath, loadingGlow, loadingRotate]);

  // ─── [Result Card] 등장 ──────────────────────────────────────────────────
  useEffect(() => {
    if (analysisResult !== null) {
      resultProgress.setValue(0);
      Animated.timing(resultProgress, {
        toValue: 1,
        duration: 380,
        easing: EASE_OUT_BACK,
        useNativeDriver: true,
      }).start();
    }
  }, [analysisResult, resultProgress]);

  // ─── [Error Modal] 등장 ──────────────────────────────────────────────────
  useEffect(() => {
    if (errorModalVisible) {
      errorProgress.setValue(0);
      Animated.timing(errorProgress, {
        toValue: 1,
        duration: 300,
        easing: EASE_OUT_QUINT,
        useNativeDriver: true,
      }).start();
    }
  }, [errorModalVisible, errorProgress]);

  useEffect(() => {
    const makeLoop = (value: Animated.Value, duration: number, delay: number, output: [number, number]) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();

    makeLoop(moonFloat, 3200, 0, [0, -4]);
    makeLoop(bookFloat, 3600, 120, [0, -6]);
    makeLoop(cloudFloat, 2800, 220, [0, -3]);
    makeLoop(modeFloat, 3400, 160, [0, -4]);
  }, [bookFloat, cloudFloat, modeFloat, moonFloat]);

  // ─── 보간 스타일 계산 ──────────────────────────────────────────────────
  const animatedImageStyle = useMemo(
    () => ({
      opacity: entrance,
      transform: [
        {
          translateY: entrance.interpolate({
            inputRange: [0, 1],
            outputRange: [4, 0],
          }),
        },
      ],
    }),
    [entrance],
  );

  const hitStyle = (rect: DesignRect) =>
    mapRectToScreen(rect, layout.image.left, layout.image.top, layout.scale);

  const handleDreamModePress = () => {
    onRecordPress?.();
  };

  const animateRecordButton = (toValue: number) => {
    Animated.spring(recordButtonPress, {
      toValue,
      useNativeDriver: true,
      damping: 18,
      stiffness: 280,
      mass: 0.55,
    }).start();
  };

  const handleRecordCtaPress = () => {
    if (onRecordPress) {
      onRecordPress();
      return;
    }

    setDreamText('');
    setIsRecordModalVisible(true);
  };

  const handleAnalyzeDream = async () => {
    if (dreamText.trim().length < 5) {
      setErrorMessage('꿈 일기 내용은 최소 5자 이상 입력하셔야 분석이 가능합니다.');
      setErrorModalVisible(true);
      return;
    }

    setIsRecordModalVisible(false);
    setIsLoading(true);

    try {
      const result = await analyzeDream(dreamText, 'user-device-id-01');
      setAnalysisResult(result);
    } catch (error: any) {
      console.error('[AI Analysis Error]', error);
      if (error?.message && error.message.includes('한도')) {
        setErrorMessage('오늘의 꿈 분석 에너지를 모두 사용했습니다. 내일 밤 새로운 꿈 은하수와 함께 돌아오세요!');
      } else {
        setErrorMessage('꿈 우주와의 연결이 불안정합니다. 인터넷 상태를 확인하시거나 잠시 후 다시 시도해 주세요.');
      }
      setErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnalysisResult = async () => {
    if (!analysisResult) return;

    try {
      const storedKeywordsRaw = await AsyncStorage.getItem('@dreamlog_custom_all_keywords');
      let currentAllKeywords = storedKeywordsRaw 
        ? JSON.parse(storedKeywordsRaw) 
        : [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];

      const mappedKeywordIds: string[] = [];
      for (const symbol of analysisResult.symbols) {
        const found = currentAllKeywords.find((k: any) => k.label === symbol || k.id === symbol);
        if (found) {
          mappedKeywordIds.push(found.id);
        } else {
          const newId = `custom_kw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          currentAllKeywords.push({ id: newId, label: symbol, isPrimary: true });
          mappedKeywordIds.push(newId);
        }
      }
      await AsyncStorage.setItem('@dreamlog_custom_all_keywords', JSON.stringify(currentAllKeywords));

      let mappedMoodId = 'calm';
      const emotionMap: Record<string, string> = {
        '행복': 'happy', '기쁨': 'happy', '설렘': 'excited', '신남': 'excited',
        '평온': 'calm', '평온함': 'calm', '차분함': 'calm',
        '슬픔': 'sad', '우울': 'sad', '외로움': 'sad',
        '두려움': 'scared', '무서움': 'scared', '불안': 'scared',
        '분노': 'angry', '화남': 'angry', '짜증': 'angry',
        '신기함': 'calm', '신비': 'calm', '신비로움': 'calm'
      };
      
      const cleanEmotion = analysisResult.emotion.trim();
      let matchedId = emotionMap[cleanEmotion];
      if (!matchedId) {
        const foundMood = RECORD_MOODS.find(m => cleanEmotion.includes(m.label) || m.label.includes(cleanEmotion));
        if (foundMood) {
          matchedId = foundMood.id;
        }
      }
      if (matchedId) {
        mappedMoodId = matchedId;
      }

      const payload = {
        title: analysisResult.summary || '오늘의 꿈 분석',
        mode: 'constellation' as const,
        selectedStarId: 'gold' as const,
        selectedKeywordIds: mappedKeywordIds,
        selectedKeywords: mappedKeywordIds.map(id => currentAllKeywords.find((k: any) => k.id === id)).filter(Boolean),
        selectedMoodIds: [mappedMoodId],
        selectedMoods: RECORD_MOODS.filter(m => m.id === mappedMoodId),
        memo: dreamText,
      };

      await saveDream(payload, undefined, undefined, analysisResult.interpretation);

      const updatedDreams = await getSavedDreams();
      setDreams(updatedDreams);

      const { syncDynamicNotifications } = require('../utils/notificationStorage');
      const unreadCount = await syncDynamicNotifications(updatedDreams);
      setNotificationCount(unreadCount);

      Animated.timing(resultProgress, {
        toValue: 0,
        duration: 200,
        easing: EASE_IN_OUT_CUBIC,
        useNativeDriver: true,
      }).start(() => {
        setAnalysisResult(null);
        setDreamText('');
      });

      Alert.alert('저장 완료', '오늘의 꿈 우주 조각이 보관함에 안전하게 저장되었습니다.');
    } catch (e) {
      console.error('Failed to save AI analysis result dream:', e);
      Alert.alert('저장 실패', '꿈 일기 저장에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const closeRecordModal = () => {
    Animated.timing(recordModalProgress, {
      toValue: 0,
      duration: 260,
      easing: EASE_IN_OUT_CUBIC,
      useNativeDriver: true,
    }).start(() => {
      setIsRecordModalVisible(false);
    });
  };

  const closeResultModal = () => {
    Animated.timing(resultProgress, {
      toValue: 0,
      duration: 200,
      easing: EASE_IN_OUT_CUBIC,
      useNativeDriver: true,
    }).start(() => {
      setAnalysisResult(null);
    });
  };

  const closeErrorModal = () => {
    Animated.timing(errorProgress, {
      toValue: 0,
      duration: 200,
      easing: EASE_IN_OUT_CUBIC,
      useNativeDriver: true,
    }).start(() => {
      setErrorModalVisible(false);
    });
  };

  const recordModalTranslate = recordModalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [900, 0],
  });
  const recordModalBackdropOpacity = recordModalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const recordModalContentOpacity = recordModalProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.6, 1],
  });

  const loadingBreathScale = loadingBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const loadingGlowOpacity = loadingGlow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.65, 1.0, 0.65],
  });
  const loadingRotateDeg = loadingRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScaleStyle = {
    transform: [
      { scale: loadingBreathScale },
      { rotate: loadingRotateDeg },
    ],
    opacity: loadingGlowOpacity,
  };

  const resultCardScale = resultProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const resultCardOpacity = resultProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });

  const errorTranslateY = errorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const errorOpacity = errorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#140f22' : styles.root.backgroundColor }]}>
      <StatusBar hidden />
      <ScrollView
        bounces
        contentContainerStyle={styles.homeScrollContent}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
      <View style={{ height: rawHeight, width: rawWidth, position: 'relative' }}>
      <Animated.View
        style={[
          styles.imageLayer,
          {
            left: fullLayout.image.left,
            top: fullLayout.image.top,
            width: fullLayout.image.width,
            height: fullLayout.image.height,
            overflow: 'hidden',
          },
          animatedImageStyle,
        ]}
      >
        <View style={[styles.homeCanvas, { backgroundColor: isDark ? '#1A1430' : styles.homeCanvas.backgroundColor }]}>
          <View style={[styles.homeCardSurface, styles.heroCardSurface, { backgroundColor: isDark ? '#201a39' : '#F9F7FE' }]} />
          <View style={[styles.homeCardSurface, styles.summaryCardSurface, { backgroundColor: isDark ? '#201a39' : '#F9F7FE' }]} />
          <View style={[styles.homeCardSurface, styles.modeCardSurface, { backgroundColor: isDark ? '#201a39' : '#F9F7FE' }]} />
          <View style={[styles.homeCardSurface, styles.recentCardSurface, { backgroundColor: isDark ? '#201a39' : '#F9F7FE' }]} />
        </View>
      </Animated.View>

      {/* ──────────────────────────────────────────────────────────────────────
          [가변성 요소 오버레이 렌더링]
          배경 이미지 위에 위치별로 실시간 동적 텍스트와 에셋들을 절대좌표로 렌더링
          ────────────────────────────────────────────────────────────────────── */}

      {/* 1. 실행 예시 기반 헤더 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: layout.image.left + 22 * layout.scale,
          top: layout.image.top + 50 * layout.scale,
          width: 326 * layout.scale,
          height: 70 * layout.scale,
        }}
      >
        <Image source={homeAvatarSource} style={{
          position: 'absolute',
          left: 0,
          top: 3 * layout.scale,
          width: 52 * layout.scale,
          height: 52 * layout.scale,
        }} resizeMode="contain" />
        <Text style={{
          position: 'absolute',
          left: 64 * layout.scale,
          top: 1 * layout.scale,
          color: '#5D51C2',
          fontFamily: theme.typography.displayFontFamily,
          fontSize: 24 * layout.scale,
          letterSpacing: 0.2 * layout.scale,
          lineHeight: 29 * layout.scale,
        }}>꿈로그</Text>
        <Text
          style={{
            fontFamily: 'Pretendard',
            fontWeight: '600',
            fontSize: 15 * layout.scale * fontScale,
            color: '#241B4B',
            position: 'absolute',
            left: 64 * layout.scale,
            top: 33 * layout.scale,
            includeFontPadding: false,
            letterSpacing: 0.18 * layout.scale,
            lineHeight: 21 * layout.scale * fontScale,
          }}
        >
          좋은 아침이에요, {userName}
        </Text>
        <Text
          style={{
            fontFamily: 'Pretendard',
            fontWeight: '400',
            fontSize: 11 * layout.scale * fontScale,
            color: '#81799E',
            position: 'absolute',
            left: 64 * layout.scale,
            top: 54 * layout.scale,
            includeFontPadding: false,
            letterSpacing: 0.18 * layout.scale,
            lineHeight: 17 * layout.scale * fontScale,
          }}
        >
          오늘은 어떤 꿈 꾸셨나요?
        </Text>
        <Animated.Image source={homeMoonSource} style={[
          {
          position: 'absolute',
          left: 248 * layout.scale,
          top: 4 * layout.scale,
          width: 66 * layout.scale,
          height: 66 * layout.scale,
        },
        {
          transform: [{
            translateY: moonFloat.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -4 * layout.scale],
            }),
          }],
        }
        ]} resizeMode="contain" />
        <Image source={homeNotificationSource} style={{
          position: 'absolute',
          left: 307 * layout.scale,
          top: 14 * layout.scale,
          width: 34 * layout.scale,
          height: 34 * layout.scale,
        }} resizeMode="contain" />
      </View>

      {/* 2. 알림 개수 뱃지 (notification-count-badge) - 피드백 반영: 더 정교하고 작게 조정 */}
      {notificationCount > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: layout.image.left + 350 * layout.scale,
            top: layout.image.top + 49 * layout.scale,
            width: 16 * layout.scale,
            height: 16 * layout.scale,
            borderRadius: 8 * layout.scale,
            backgroundColor: '#7C67E8',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Pretendard',
              fontWeight: '700',
              fontSize: 10 * layout.scale * fontScale,
              color: '#ffffff',
              includeFontPadding: false,
            }}
          >
            {notificationCount}
          </Text>
        </View>
      )}

      {/* 3. 실행 예시 위치에 맞춘 정적 UI 문구 */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Image source={homePurpleStarSource} resizeMode="contain" style={{
          position: 'absolute',
          left: layout.image.left + 164 * layout.scale,
          top: layout.image.top + 151 * layout.scale,
          width: 24 * layout.scale,
          height: 24 * layout.scale,
        }} />
        <Image source={homeYellowStarSource} resizeMode="contain" style={{
          position: 'absolute',
          left: layout.image.left + 335 * layout.scale,
          top: layout.image.top + 154 * layout.scale,
          width: 22 * layout.scale,
          height: 22 * layout.scale,
        }} />
        <Animated.Image source={homeBookSource} resizeMode="contain" style={[
        {
          position: 'absolute',
          left: layout.image.left + 208 * layout.scale,
          top: layout.image.top + 148 * layout.scale,
          width: 178 * layout.scale,
          height: 178 * layout.scale,
        },
        {
          transform: [{
            translateY: bookFloat.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -6 * layout.scale],
            }),
          }],
        }
        ]} />
        <Image
          source={homeHeroConstellationSource}
          resizeMode="contain"
          style={{
            position: 'absolute',
            left: layout.image.left + 131 * layout.scale,
            top: layout.image.top + 151 * layout.scale,
            width: 150 * layout.scale,
            height: 145 * layout.scale,
            opacity: 0.44,
          }}
        />
        <Animated.Image source={homeCloudSource} resizeMode="contain" style={[
        {
          position: 'absolute',
          left: layout.image.left + 304 * layout.scale,
          top: layout.image.top + 213 * layout.scale,
          width: 96 * layout.scale,
          height: 96 * layout.scale,
        },
        {
          transform: [{
            translateY: cloudFloat.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -3 * layout.scale],
            }),
          }],
        }
        ]} />
        <Image source={homeButtonSource} resizeMode="stretch" style={{
          position: 'absolute',
          left: layout.image.left + 32 * layout.scale,
          top: layout.image.top + 226 * layout.scale,
          width: 132 * layout.scale,
          height: 50 * layout.scale,
        }} />
        <Image source={homeButtonPencilSource} resizeMode="contain" style={{
          position: 'absolute',
          left: layout.image.left + 57 * layout.scale,
          top: layout.image.top + 242 * layout.scale,
          width: 18 * layout.scale,
          height: 18 * layout.scale,
        }} />
        <Animated.Image source={homeConstellationModeSource} resizeMode="contain" style={[
        {
          position: 'absolute',
          left: layout.image.left + 286 * layout.scale,
          top: layout.image.top + 351 * layout.scale,
          width: 84 * layout.scale,
          height: 102 * layout.scale,
        },
        {
          transform: [{
            translateY: modeFloat.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -4 * layout.scale],
            }),
          }],
        }
        ]} />
        <Text style={[styles.homeOverlayTitle, {
          left: layout.image.left + 36 * layout.scale,
          top: layout.image.top + textLayout.heroTitleTop * layout.scale,
          fontSize: 17 * layout.scale * fontScale,
        }]}>오늘의 꿈 기록하기</Text>
        <Text style={[styles.homeOverlayBody, {
          left: layout.image.left + 36 * layout.scale,
          top: layout.image.top + textLayout.heroBodyTop * layout.scale,
          fontSize: 12 * layout.scale * fontScale,
        }]}>기억이 생생할때, 꿈을 기록해보세요</Text>
        <Text style={[styles.homeOverlayButton, {
          left: layout.image.left + 69 * layout.scale,
          top: layout.image.top + (textLayout.heroButtonTop + (textSize === 'small' ? -5 : textSize === 'large' ? 0 : -5)) * layout.scale,
          width: 88 * layout.scale,
          fontSize: (textSize === 'small' ? 11.5 : textSize === 'large' ? 12.5 : 12) * layout.scale * fontScale,
        }]}>기록하기</Text>

        <Text style={[styles.homeOverlaySectionTitle, {
          left: layout.image.left + 31 * layout.scale,
          top: layout.image.top + textLayout.cardTitleTop * layout.scale,
          fontSize: 13 * layout.scale * cardTitleFontScale,
        }]}>이번 달 꿈 요약</Text>
        <Text style={[styles.homeOverlayBody, {
          left: layout.image.left + (textSize === 'large' ? 42 : 44) * layout.scale,
          top: layout.image.top + (textLayout.summaryBodyTop - (textSize === 'small' ? 2 : textSize === 'large' ? 4 : 5)) * layout.scale,
          fontSize: (textSize === 'small' ? 18 : textSize === 'large' ? 22 : 20) * layout.scale * fontScale,
          lineHeight: (textSize === 'small' ? 24 : textSize === 'large' ? 28 : 26) * layout.scale * fontScale,
          fontWeight: '500',
          color: '#5D51C2',
        }]}>{monthlySummary.currentCount}</Text>
        <Text style={[styles.homeOverlayBody, {
          left: layout.image.left + 66 * layout.scale,
          top: layout.image.top + textLayout.summaryBodyTop * layout.scale,
          fontSize: 12 * layout.scale * fontScale,
        }]}>개 기록했어요.</Text>
        <Text style={[styles.homeOverlayBody, {
          left: layout.image.left + 32 * layout.scale,
          top: layout.image.top + textLayout.summaryCompareTop * layout.scale,
          fontSize: 11 * layout.scale * fontScale,
        }]}>지난 달보다</Text>
        <Text style={[styles.homeOverlayButton, {
          left: layout.image.left + 51 * layout.scale,
          top: layout.image.top + textLayout.cardButtonTop * layout.scale,
          width: 110 * layout.scale,
          fontSize: 11 * layout.scale * fontScale,
        }]}>상세보기</Text>

        <Text style={[styles.homeOverlaySectionTitle, {
          left: layout.image.left + 217 * layout.scale,
          top: layout.image.top + textLayout.cardTitleTop * layout.scale,
          fontSize: 13 * layout.scale * cardTitleFontScale,
        }]}>별자리 모드</Text>
        <Text style={[styles.homeOverlayBody, {
          left: layout.image.left + 217 * layout.scale,
          top: layout.image.top + textLayout.constellationBodyTop * layout.scale,
          width: 82 * layout.scale,
          fontSize: 9.25 * layout.scale * fontScale,
          lineHeight: 14 * layout.scale * fontScale,
        }]} numberOfLines={2}>이번 달 별자리를{'\n'}꿈별로 채워요.</Text>
        <Text style={[styles.homeOverlayButton, {
          left: layout.image.left + 237 * layout.scale,
          top: layout.image.top + textLayout.cardButtonTop * layout.scale,
          width: 110 * layout.scale,
          fontSize: 11 * layout.scale * fontScale,
        }]}>상세보기</Text>

        <View style={{
          position: 'absolute',
          left: layout.image.left + 35 * layout.scale,
          top: layout.image.top + textLayout.recentTitleTop * layout.scale,
          width: textLayout.recentTitleWidth * layout.scale,
          height: 31 * layout.scale,
          backgroundColor: 'transparent',
          justifyContent: 'center',
        }}>
          <Text style={{
            fontFamily: theme.typography.displayFontFamily,
            fontWeight: '400',
            fontSize: 15 * layout.scale * fontScale,
            color: '#5D51C2',
            letterSpacing: 0.25 * layout.scale,
            lineHeight: 22 * layout.scale * fontScale,
          }}>최근 기록</Text>
        </View>
      </View>

      {/* 4. 전월 대비 증감 수치 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: layout.image.left + (textSize === 'large' ? 111 : textSize === 'small' ? 92 : 96) * layout.scale,
          top: layout.image.top + (textLayout.summaryDeltaTop - (textSize === 'large' ? 6 : textSize === 'small' ? 8 : 8)) * layout.scale,
          height: 18 * layout.scale,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Pretendard',
            fontWeight: '700',
            fontSize: 12 * layout.scale * fontScale,
            color: monthlySummary.previousMonthDelta >= 0 ? '#48B98B' : '#DD7588',
            includeFontPadding: false,
          }}
        >
          {monthlySummary.previousMonthDelta >= 0
            ? `+${monthlySummary.previousMonthDelta}개`
            : `${monthlySummary.previousMonthDelta}개`}
        </Text>
      </View>

      {/* 5. 최근 기록 동적 렌더링 */}
      {mappedRecentDreams.map((dream, index) => {
        const rowRect = HOME_HIT_AREAS.recentDreamRows[index];
        if (!rowRect) return null;
        
        const y = rowRect.y;
        const thumbSource = index === 0
          ? require('../../assets/home/parts/home-recent-thumb-1.png')
          : require('../../assets/home/parts/home-recent-thumb-2.png');
        const bubbleColors = ['#FFFDF8', '#FBFAFF', '#F8FCFF'];
        const accentColors = ['#F1C75B', '#9B86EE', '#72BFDD'];

        return (
          <View key={`recent-info-${dream.id}`} pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 28 * layout.scale,
                top: layout.image.top + y * layout.scale,
                width: 337 * layout.scale,
                height: 50 * layout.scale,
                borderRadius: 16 * layout.scale,
                backgroundColor: bubbleColors[index] ?? '#F4F0FC',
                ...Platform.select({
                  web: {
                    boxShadow:
                      '0px 8px 22px rgba(111,92,196,0.11), inset 0px 1px 0px rgba(255,255,255,0.92)',
                  } as never,
                  default: {
                    shadowColor: '#8B7DFF',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.11,
                    shadowRadius: 22,
                    elevation: 5,
                  },
                }),
              }}
            />
            <View style={{
              position: 'absolute',
              left: layout.image.left + 31 * layout.scale,
              top: layout.image.top + (y + 11) * layout.scale,
              width: 4 * layout.scale,
              height: 28 * layout.scale,
              borderRadius: 7 * layout.scale,
              backgroundColor: accentColors[index] ?? '#A992FF',
            }} />
            {/* 썸네일 */}
            <Image
              source={thumbSource}
              style={{
                position: 'absolute',
                left: layout.image.left + 43 * layout.scale,
                top: layout.image.top + (y + 5) * layout.scale,
                width: 40 * layout.scale,
                height: 40 * layout.scale,
                borderRadius: 13 * layout.scale,
              }}
              resizeMode="cover"
            />

            {/* 꿈 제목 */}
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 94 * layout.scale,
                top: layout.image.top + (y + textLayout.recentRowTitleTop) * layout.scale,
                width: textLayout.recentRowTitleWidth * layout.scale,
                height: 20 * layout.scale,
                justifyContent: 'center',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: theme.typography.displayFontFamily,
                  fontWeight: '400',
                  fontSize: 12 * layout.scale * fontScale,
                  color: '#5D51C2',
                  letterSpacing: 0.18 * layout.scale,
                  lineHeight: 20 * layout.scale * fontScale,
                  includeFontPadding: false,
                }}
              >
                {dream.title}
              </Text>
            </View>

            {/* 키워드 태그 리스트 */}
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 94 * layout.scale,
                top: layout.image.top + (y + textLayout.recentRowTagsTop) * layout.scale,
                flexDirection: 'row',
                gap: 4 * layout.scale,
              }}
            >
              {dream.tags.slice(0, 1).map((tag: any) => (
                <View
                  key={tag.id}
                  style={{
                    backgroundColor: '#EEE9FF',
                    borderRadius: 8 * layout.scale,
                    paddingHorizontal: 8 * layout.scale,
                    paddingVertical: 2 * layout.scale,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: '500',
                      fontSize: 10 * layout.scale * fontScale,
                      color: '#7064C9',
                      letterSpacing: 0.15 * layout.scale,
                      includeFontPadding: false,
                    }}
                  >
                    {tag.label}
                  </Text>
                </View>
              ))}
              <View
                style={{
                  backgroundColor: dream.mode === 'planet' ? '#E8F6F4' : '#F0EBFF',
                  borderRadius: 8 * layout.scale,
                  paddingHorizontal: 7 * layout.scale,
                  paddingVertical: 2 * layout.scale,
                }}
              >
                <Text style={{
                  color: dream.mode === 'planet' ? '#4C978B' : '#7161C7',
                  fontFamily: 'Pretendard-Medium',
                  fontSize: 9 * layout.scale * fontScale,
                  includeFontPadding: false,
                }}>
                  {dream.mode === 'planet' ? '행성' : '꿈별'}
                </Text>
              </View>
            </View>

            {/* 작성 날짜 */}
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 258 * layout.scale,
                top: layout.image.top + (y + 5) * layout.scale,
                width: 70 * layout.scale,
                height: 20 * layout.scale,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(241,237,252,0.82)',
                borderRadius: 10 * layout.scale,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: '400',
                  fontSize: 8.5 * layout.scale * Math.min(fontScale, 1.12),
                  color: '#9189AE',
                  letterSpacing: 0.12 * layout.scale,
                  includeFontPadding: false,
                }}
              >
                {dream.dateLabel}
              </Text>
            </View>

            {/* 즐겨찾기 별 */}
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 341 * layout.scale,
                top: layout.image.top + (y + 11) * layout.scale,
                width: 28 * layout.scale,
                height: 28 * layout.scale,
                borderRadius: 14 * layout.scale,
                backgroundColor: 'rgba(242,238,252,0.86)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 16 * layout.scale,
                  color: dream.isFavorite ? '#ffd86a' : '#c2bbdf',
                  includeFontPadding: false,
                  lineHeight: 22 * layout.scale,
                }}
              >
                {dream.isFavorite ? '★' : '☆'}
              </Text>
            </View>
          </View>
        );
      })}

      {/* ──────────────────────────────────────────────────────────────────────
          [터치 히트영역 설정]
          ────────────────────────────────────────────────────────────────────── */}
      <Pressable
        accessibilityLabel="프로필 열기"
        accessibilityRole="button"
        onPress={onProfilePress}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          {
            left: layout.image.left + 18 * layout.scale,
            top: layout.image.top + 44 * layout.scale,
            width: 190 * layout.scale,
            height: 72 * layout.scale,
          },
          pressed && styles.pressedFeedback,
        ]}
        testID="home-profile-button"
      >
        <Text style={styles.srOnly}>프로필 열기</Text>
      </Pressable>

      <Pressable
        accessibilityLabel={`알림 ${notificationCount}개 보기`}
        accessibilityRole="button"
        onPress={handleNotificationPressLocal}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.notification),
          pressed && styles.pressedFeedback,
        ]}
        testID="home-notification-button"
      >
        <Text style={styles.srOnly}>알림 보기</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="오늘의 꿈 기록하기"
        accessibilityRole="button"
        onPress={handleRecordCtaPress}
        onPressIn={() => animateRecordButton(1)}
        onPressOut={() => animateRecordButton(0)}
        style={[
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.recordCta),
        ]}
        testID="home-record-cta"
      >
        {() => (
          <Animated.View
            style={[
              {
                width: HOME_HIT_AREAS.recordCta.width * layout.scale,
                height: HOME_HIT_AREAS.recordCta.height * layout.scale,
                borderRadius: 20 * layout.scale,
                backgroundColor: 'rgba(117, 88, 247, 0.07)',
                opacity: recordButtonPress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [
                  {
                    scale: recordButtonPress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.985],
                    }),
                  },
                  {
                    translateY: recordButtonPress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.25],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </Pressable>

      <Pressable
        accessibilityLabel={`이번 달 꿈 요약. ${monthlySummary.currentCount}개 기록, 지난 달보다 ${monthlySummary.previousMonthDelta}개 증가`}
        accessibilityRole="button"
        onPress={onSummaryPress}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.summaryCard),
          pressed && styles.pressedFeedback,
        ]}
        testID="home-summary-card"
      >
        <Text style={styles.srOnly}>이번 달 꿈 요약 상세보기</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="이번 달 꿈 요약 상세보기"
        accessibilityRole="button"
        onPress={onSummaryPress}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.summaryDetailButton),
          pressed && styles.pressedFeedback,
        ]}
        testID="home-summary-detail-button"
      >
        <Text style={styles.srOnly}>상세보기</Text>
      </Pressable>

      <Pressable
        accessibilityLabel={dreamModeAccessibilityLabel}
        accessibilityRole="button"
        onPress={handleDreamModePress}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.modePreviewCard),
          pressed && styles.pressedFeedback,
        ]}
        testID="home-mode-preview-card"
      >
        <Text style={styles.srOnly}>{dreamModeAccessibilityLabel}</Text>
      </Pressable>

      <Pressable
        accessibilityLabel={`${primaryDreamMode.title} ${primaryDreamMode.ctaLabel}`}
        accessibilityRole="button"
        onPress={handleDreamModePress}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.modePreviewDetailButton),
          pressed && styles.pressedFeedback,
        ]}
        testID="home-mode-preview-detail-button"
      >
        <Text style={styles.srOnly}>{primaryDreamMode.ctaLabel}</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="최근 기록 전체 보기"
        accessibilityRole="button"
        onPress={onRecentAllPress}
        style={({ pressed }) => [
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.recentAll),
          pressed && styles.pressedFeedback,
        ]}
        testID="home-recent-all-button"
      >
        <Text style={styles.srOnly}>전체 보기</Text>
      </Pressable>

      {mappedRecentDreams.map((dream, index) => {
        const rowRect = HOME_HIT_AREAS.recentDreamRows[index];
        const favoriteRect = HOME_HIT_AREAS.favoriteButtons[index];

        if (!rowRect || !favoriteRect) {
          return null;
        }

        return (
          <View key={dream.id}>
            <Pressable
              accessibilityLabel={`${dream.title}. ${dream.dateLabel}`}
              accessibilityRole="button"
              onPress={() => handleRecentDreamPressLocal(dream.id)}
              style={({ pressed }) => [
                styles.hitArea,
                styles.webNoOutline,
                hitStyle(rowRect),
                pressed && styles.pressedFeedback,
              ]}
              testID={`home-recent-dream-${dream.id}`}
            >
              <Text style={styles.srOnly}>{dream.title}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`${dream.title} 즐겨찾기 ${
                dream.isFavorite ? '해제' : '추가'
              }`}
              accessibilityRole="button"
              onPress={() => handleFavoritePressLocal(dream)}
              style={({ pressed }) => [
                styles.hitArea,
                styles.webNoOutline,
                hitStyle(favoriteRect),
                pressed && styles.pressedFeedback,
              ]}
              testID={`home-favorite-${dream.id}`}
            >
              <Text style={styles.srOnly}>즐겨찾기</Text>
            </Pressable>
          </View>
        );
      })}

      {data.tabs.map((tab, index) => {
        const rect = HOME_HIT_AREAS.tabs[index];

        if (!rect) {
          return null;
        }

        return (
          <Pressable
            accessibilityLabel={`${tab.label} 탭`}
            accessibilityRole="tab"
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [
              styles.hitArea,
              styles.webNoOutline,
              hitStyle(rect),
              pressed && styles.pressedFeedback,
            ]}
            testID={`home-tab-${tab.id}`}
          >
            <Text style={styles.srOnly}>{tab.label}</Text>
          </Pressable>
        );
      })}
      </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isConstellationModalVisible}
        onRequestClose={() => setIsConstellationModalVisible(false)}
      >
        <View style={styles.constellationOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setIsConstellationModalVisible(false)}
          />
          <View style={styles.constellationCard}>
            <View style={styles.constellationHeader}>
              <View>
                <Text style={[styles.constellationEyebrow, { fontSize: 11 * fontScale }]}>
                  {new Date().getFullYear()} 별자리 기록
                </Text>
                <Text style={[styles.constellationTitle, { fontSize: 21 * fontScale }]}>
                  달마다 다른 꿈별을 채워가요
                </Text>
              </View>
              <Pressable
                accessibilityLabel="별자리 모달 닫기"
                style={styles.constellationClose}
                onPress={() => setIsConstellationModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#5f5790" />
              </Pressable>
            </View>
            <Text style={[styles.constellationDescription, { fontSize: 13 * fontScale }]}>
              기록 하나마다 황금빛 점이 하나씩 채워져요. 대표 별자리가 완성되면 예비 별자리가 이어집니다.
            </Text>
            <View style={styles.constellationNavigator}>
              <Pressable
                accessibilityLabel="이전 달 별자리"
                style={styles.constellationNavButton}
                onPress={() => setSelectedConstellationMonth((month) => month === 1 ? 12 : month - 1)}
              >
                <Ionicons name="chevron-back" size={20} color="#5D51C2" />
              </Pressable>
              <View style={styles.constellationMonthHeading}>
                <Text style={styles.constellationMonthHeadingText}>
                  {selectedConstellationMonth}월 · {selectedGuide.name}
                </Text>
                <Text style={styles.constellationMonthHeadingSub}>
                  {selectedMonthDreams.length}개 기록 · {selectedGuide.points}개 점
                </Text>
              </View>
              <Pressable
                accessibilityLabel="다음 달 별자리"
                style={styles.constellationNavButton}
                onPress={() => setSelectedConstellationMonth((month) => month === 12 ? 1 : month + 1)}
              >
                <Ionicons name="chevron-forward" size={20} color="#5D51C2" />
              </Pressable>
            </View>
            <View style={styles.constellationGuideWrap}>
              <Image
                source={CONSTELLATION_GUIDES[selectedConstellationMonth - 1]}
                style={styles.constellationGuideImage}
                resizeMode="contain"
              />
              <View style={styles.constellationDotProgress}>
                {Array.from({ length: selectedGuide.points }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.constellationProgressDot,
                      index < selectedMonthDreams.length && styles.constellationProgressDotFilled,
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.constellationMonthStrip}>
              {MONTH_LABELS.map((label, index) => (
                <Pressable
                  key={label}
                  onPress={() => setSelectedConstellationMonth(index + 1)}
                  style={[
                    styles.constellationMonthChip,
                    selectedConstellationMonth === index + 1 && styles.constellationMonthChipSelected,
                  ]}
                >
                  <Text style={[
                    styles.constellationMonthChipText,
                    selectedConstellationMonth === index + 1 && styles.constellationMonthChipTextSelected,
                  ]}>
                    {index + 1}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.reserveTitle}>완성 후 이어지는 예비 별자리</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reserveList}>
              {RESERVE_CONSTELLATIONS.map((guide, index) => (
                <View key={guide.id} style={styles.reserveItem}>
                  <Image source={RESERVE_GUIDES[index]} style={styles.reserveImage} resizeMode="contain" />
                  <Text style={styles.reserveLabel}>{guide.name}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.constellationProgress}>
              <Text style={[styles.constellationProgressText, { fontSize: 12 * fontScale }]}>
                올해 {completedMonths.size}개월의 별자리 기록을 시작했어요
              </Text>
              <View style={styles.constellationProgressTrack}>
                <View
                  style={[
                    styles.constellationProgressFill,
                    { width: `${(completedMonths.size / 12) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 1: 오늘의 꿈 기록하기 모달
          ======================================================= */}
      <Modal
        animationType="none"
        transparent={true}
        visible={isRecordModalVisible}
        onRequestClose={closeRecordModal}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: recordModalBackdropOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeRecordModal} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.recordKeyboardWrap}
          >
            <Animated.View
              style={[
                styles.recordContainer,
                {
                  opacity: recordModalContentOpacity,
                  transform: [{ translateY: recordModalTranslate }],
                },
              ]}
            >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>오늘의 꿈 기록하기</Text>
              <TouchableOpacity
                onPress={closeRecordModal}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              multiline
              placeholder="어젯밤 꿈의 내용을 상세하게 들려주세요. 감정이나 특별히 보았던 상징물이 있으면 함께 써도 좋습니다."
              placeholderTextColor="#a09abb"
              value={dreamText}
              onChangeText={setDreamText}
              style={styles.textInput}
              maxLength={8000}
            />

            <View style={styles.charCountContainer}>
              <Text style={styles.charCountText}>{dreamText.length} / 8000자</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAnalyzeDream}
              style={styles.submitCta}
            >
              <Text style={styles.submitCtaText}>AI 분석 및 우주에 연결하기</Text>
            </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* =======================================================
          MODAL 2: AI 분석 중 로딩 오버레이
          ======================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLoading}
      >
        <View style={styles.loadingOverlay}>
          <Animated.View style={[styles.loadingCenterBox, pulseScaleStyle]}>
            <ActivityIndicator size="large" color={theme.colors.textLight} style={styles.spinner} />
            <Text style={styles.loadingText}>AI 해석 도우미가 {userName}의 꿈 우주를</Text>
            <Text style={styles.loadingSubText}>섬세하게 탐색하고 있어요. 잠시만 기다려주세요...</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 3: 꿈 분석 결과 팝업 카드
          ======================================================= */}
      <Modal
        animationType="none"
        transparent={true}
        visible={analysisResult !== null}
        onRequestClose={closeResultModal}
      >
        <View style={styles.resultOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeResultModal} />
          
          <Animated.View 
            style={[
              styles.resultContainer,
              { 
                opacity: resultCardOpacity,
                transform: [{ scale: resultCardScale }] 
              }
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.resultHeader}>🔮 꿈 우주 분석서</Text>

              {/* 1줄 요약 */}
              <View style={styles.resultCard}>
                <Text style={styles.resultSectionTitle}>꿈 요약</Text>
                <Text style={styles.resultTextContent}>{analysisResult?.summary}</Text>
              </View>

              {/* 감정 및 상징 태그 */}
              <View style={styles.resultCard}>
                <Text style={styles.resultSectionTitle}>감정 & 상징</Text>
                <View style={styles.tagWrapper}>
                  <View style={[styles.badge, styles.emotionBadge]}>
                    <Text style={styles.badgeText}>❤️ 감정: {analysisResult?.emotion}</Text>
                  </View>
                  {analysisResult?.symbols.map((symbol, idx) => (
                    <View key={idx} style={[styles.badge, styles.symbolBadge]}>
                      <Text style={styles.badgeText}>✨ #{symbol}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 상세 해몽 */}
              <View style={styles.resultCard}>
                <Text style={styles.resultSectionTitle}>우주의 메세지</Text>
                <Text style={styles.resultInterpretation}>{analysisResult?.interpretation}</Text>
              </View>
              <Text style={styles.resultNotice}>
                AI 해석은 참고용 기록 도우미이며 의료적 또는 정신건강 진단을 대신하지 않습니다.
              </Text>
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveAnalysisResult}
              style={styles.resultCloseCta}
            >
              <Text style={styles.resultCloseCtaText}>우주 조각 저장하기</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 4: 오류 및 한도 초과 알림
          ======================================================= */}
      <Modal
        animationType="none"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={closeErrorModal}
      >
        <View style={styles.errorOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeErrorModal} />
          
          <Animated.View 
            style={[
              styles.errorContainer,
              { 
                opacity: errorOpacity,
                transform: [{ translateY: errorTranslateY }]
              }
            ]}
          >
            <Text style={styles.errorTitle}>은하수 통신 알림</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={closeErrorModal}
              style={styles.errorCloseButton}
            >
              <Text style={styles.errorCloseButtonText}>확인</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 5: 꿈 상세 정보 모달
          ======================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedDetailDream !== null}
        onRequestClose={() => setSelectedDetailDream(null)}
      >
        <View style={styles.detailOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedDetailDream(null)} />
          
          {selectedDetailDream && (() => {
            const moodId = selectedDetailDream.selectedMoodIds?.[0] || 'calm';
            const foundMood = RECORD_MOODS.find(m => m.id === moodId) || RECORD_MOODS[1];
            
            // Format date for display
            let displayDate = selectedDetailDream.date;
            const dateParts = selectedDetailDream.date.split('-');
            if (dateParts.length === 3) {
              const month = parseInt(dateParts[1], 10);
              const day = parseInt(dateParts[2], 10);
              const dateObj = new Date(parseInt(dateParts[0], 10), month - 1, day);
              const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
              displayDate = `${month}월 ${day}일 (${daysOfWeek[dateObj.getDay()]})`;
            }

            return (
              <View style={styles.detailContainer}>
                {/* Header */}
                <View style={styles.detailHeaderRow}>
                  <Text style={styles.detailDateText}>{displayDate}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedDetailDream(null)}
                    style={styles.detailCloseBtn}
                  >
                    <Ionicons name="close" size={16} color="#7f78a7" />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.detailTitleText}>{selectedDetailDream.title}</Text>

                {/* Mood Info */}
                <View style={styles.detailMoodRow}>
                  <MoodFace mood={foundMood} size={36} />
                  <View style={styles.detailMoodInfo}>
                    <Text style={styles.detailMoodLabel}>기분: {foundMood.label}</Text>
                    <Text style={styles.detailMoodDesc}>이날 꿈속에서 느낀 지배적인 감정이에요.</Text>
                  </View>
                </View>

                {/* Keywords */}
                {selectedDetailDream.selectedKeywordIds && selectedDetailDream.selectedKeywordIds.length > 0 && (
                  <View style={styles.detailTagWrapper}>
                    {selectedDetailDream.selectedKeywordIds.map((kwId: string) => {
                      const kwLabel = getKeywordLabel(kwId);
                      return (
                        <View key={kwId} style={styles.detailTag}>
                          <Text style={styles.detailTagText}>✨ #{kwLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Memo */}
                <Text style={styles.detailSectionTitle}>꿈 일기 내용</Text>
                <ScrollView style={styles.detailMemoScroll} showsVerticalScrollIndicator={true}>
                  <Text style={styles.detailMemoText}>{selectedDetailDream.memo || '작성된 내용이 없습니다.'}</Text>
                </ScrollView>

                {/* AI Interpretation if available */}
                {selectedDetailDream.aiInterpretation && (
                  <View style={styles.detailAiSection}>
                    <Text style={styles.detailSectionTitle}>🔮 AI 참고 해석</Text>
                    <ScrollView style={styles.detailAiScroll} showsVerticalScrollIndicator={true}>
                      <Text style={styles.detailAiText}>{selectedDetailDream.aiInterpretation}</Text>
                    </ScrollView>
                    <Text style={styles.detailAiNotice}>
                      참고용 해석이에요. 건강 또는 정신건강 판단은 전문가 상담을 이용해 주세요.
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    onPress={() => handleEditDreamLocal(selectedDetailDream.date, selectedDetailDream.id)}
                    style={styles.detailButtonEdit}
                  >
                    <Text style={styles.detailButtonEditText}>수정하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteDreamLocal(selectedDetailDream.id)}
                    style={styles.detailButtonDelete}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* =======================================================
          MODAL 6: 알림 목록 모달
          ======================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isNotificationModalVisible}
        onRequestClose={() => setIsNotificationModalVisible(false)}
      >
        <View style={styles.notifOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsNotificationModalVisible(false)} />
          
          <View style={styles.notifContainer}>
            {/* Header */}
            <View style={styles.notifHeader}>
              <Text style={styles.notifHeaderTitle}>🌌 우주 알림 센터</Text>
              <TouchableOpacity
                onPress={() => setIsNotificationModalVisible(false)}
                style={styles.notifCloseBtn}
              >
                <Ionicons name="close" size={18} color="#7f78a7" />
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            {notificationsList.length > 0 && (
              <View style={styles.notifActionRow}>
                <TouchableOpacity onPress={handleMarkAllNotificationsAsRead} style={styles.notifActionBtn}>
                  <Text style={styles.notifActionBtnText}>모두 읽음</Text>
                </TouchableOpacity>
                <View style={styles.notifActionDivider} />
                <TouchableOpacity onPress={handleClearAllNotifications} style={styles.notifActionBtn}>
                  <Text style={styles.notifActionBtnText}>모두 삭제</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notification Items List */}
            <ScrollView 
              style={styles.notifScroll} 
              contentContainerStyle={notificationsList.length === 0 ? styles.notifEmptyContainer : undefined}
              showsVerticalScrollIndicator={true}
            >
              {notificationsList.length === 0 ? (
                <View style={styles.notifEmptyBox}>
                  <Ionicons name="notifications-off-outline" size={48} color="#c7c2e2" style={styles.notifEmptyIcon} />
                  <Text style={styles.notifEmptyText}>현재 도착한 은하수 알림이 없습니다.</Text>
                  <Text style={styles.notifEmptySubText}>새로운 꿈을 기록하면 다양한 소식을 받을 수 있어요.</Text>
                </View>
              ) : (
                notificationsList.map((item) => {
                  // Format time
                  let relativeTime = '방금 전';
                  try {
                    const diffMs = Date.now() - new Date(item.timestamp).getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins < 1) relativeTime = '방금 전';
                    else if (diffMins < 60) relativeTime = `${diffMins}분 전`;
                    else {
                      const diffHours = Math.floor(diffMins / 60);
                      if (diffHours < 24) relativeTime = `${diffHours}시간 전`;
                      else {
                        const diffDays = Math.floor(diffHours / 24);
                        relativeTime = `${diffDays}일 전`;
                      }
                    }
                  } catch {}

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => handleMarkSingleAsRead(item.id)}
                      style={[
                        styles.notifItem,
                        !item.isRead && styles.notifItemUnread
                      ]}
                    >
                      <View style={styles.notifItemHeader}>
                        <Text style={[
                          styles.notifItemTitle,
                          !item.isRead && styles.notifItemTitleUnread
                        ]}>
                          {item.title}
                        </Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifItemBody}>{item.body}</Text>
                      <Text style={styles.notifItemTime}>{relativeTime}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F0FC',
    overflow: 'hidden',
  },
  homeScrollContent: {
    paddingBottom: 18,
    paddingTop: 14,
  },
  imageLayer: {
    position: 'absolute',
  },
  homeCanvas: {
    backgroundColor: '#F4F0FC',
    height: '100%',
    width: '100%',
  },
  homeCardSurface: {
    backgroundColor: '#F9F7FE',
    borderWidth: 0,
    position: 'absolute',
    ...Platform.select({
      web: {
          boxShadow:
            '0px 10px 24px rgba(139,125,255,0.12), inset 0px 2px 4px rgba(139,125,255,0.07)',
        } as never,
      default: {
        shadowColor: '#8B7DFF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 5,
      },
    }),
  },
  heroCardSurface: {
    borderRadius: 24,
    height: 184,
    left: 18,
    top: 137,
    width: 357,
  },
  summaryCardSurface: {
    borderRadius: 20,
    height: 143,
    left: 18,
    top: 343,
    width: 175,
  },
  modeCardSurface: {
    borderRadius: 20,
    height: 143,
    left: 200,
    top: 343,
    width: 175,
  },
  recentCardSurface: {
    borderRadius: 24,
    height: 245,
    left: 18,
    top: 511,
    width: 357,
  },
  backgroundImage: {
    height: '100%',
    width: '100%',
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
  recordCtaCard: {
    backgroundColor: '#ffffff',
  },
  homeOverlayTitle: {
    position: 'absolute',
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '400',
    color: '#5D51C2',
    letterSpacing: 0.25,
    lineHeight: 25,
  },
  homeOverlaySectionTitle: {
    position: 'absolute',
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '400',
    color: '#5D51C2',
    letterSpacing: 0.22,
    lineHeight: 20,
  },
  homeOverlayBody: {
    position: 'absolute',
    fontFamily: 'Pretendard',
    fontWeight: '400',
    color: '#756EA0',
    letterSpacing: 0.18,
    lineHeight: 18,
  },
  homeOverlayButton: {
    position: 'absolute',
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '400',
    color: '#5D51C2',
    letterSpacing: 0.18,
    lineHeight: 18,
    textAlign: 'center',
  },
  constellationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 27, 73, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  constellationCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#F9F7FE',
    padding: 20,
    borderWidth: 0,
    shadowColor: '#49349b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  constellationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  constellationEyebrow: {
    fontFamily: 'Pretendard',
    fontWeight: '500',
    color: '#5D51C2',
    letterSpacing: 0.25,
    marginBottom: 4,
  },
  constellationTitle: {
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '400',
    color: '#5D51C2',
    letterSpacing: 0.2,
    lineHeight: 29,
  },
  constellationClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  constellationDescription: {
    fontFamily: 'Pretendard',
    fontWeight: '400',
    color: '#756EA0',
    lineHeight: 21,
    letterSpacing: 0.18,
    marginTop: 10,
    marginBottom: 16,
  },
  constellationNavigator: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  constellationNavButton: {
    alignItems: 'center',
    backgroundColor: '#EEE9FF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  constellationMonthHeading: {
    alignItems: 'center',
  },
  constellationMonthHeadingText: {
    color: '#5D51C2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  constellationMonthHeadingSub: {
    color: '#8C84A9',
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.18,
    marginTop: 3,
  },
  constellationGuideWrap: {
    alignItems: 'center',
    backgroundColor: '#EEE9FF',
    borderRadius: 22,
    paddingBottom: 10,
    paddingTop: 8,
  },
  constellationGuideImage: {
    height: 250,
    width: 205,
  },
  constellationDotProgress: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: -4,
  },
  constellationProgressDot: {
    backgroundColor: '#D8D0F2',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  constellationProgressDotFilled: {
    backgroundColor: '#FFD75E',
    shadowColor: '#E8B936',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  constellationMonthStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
    marginTop: 11,
  },
  constellationMonthChip: {
    alignItems: 'center',
    backgroundColor: '#F1EDFA',
    borderRadius: 10,
    height: 23,
    justifyContent: 'center',
    width: 23,
  },
  constellationMonthChipSelected: {
    backgroundColor: '#5D51C2',
  },
  constellationMonthChipText: {
    color: '#8C84A9',
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '500',
  },
  constellationMonthChipTextSelected: {
    color: '#FFFFFF',
  },
  reserveTitle: {
    color: '#5D51C2',
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.18,
    marginBottom: 7,
    marginTop: 12,
  },
  reserveList: {
    gap: 8,
    paddingRight: 8,
  },
  reserveItem: {
    alignItems: 'center',
    backgroundColor: '#F1EDFA',
    borderRadius: 14,
    padding: 6,
    width: 72,
  },
  reserveImage: {
    height: 62,
    width: 50,
  },
  reserveLabel: {
    color: '#756EA0',
    fontFamily: 'Pretendard',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  constellationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  constellationMonth: {
    width: '23%',
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: '#F6F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  constellationMonthUnlocked: {
    backgroundColor: '#FFF8E3',
    borderWidth: 1,
    borderColor: '#ffe5a0',
  },
  constellationImage: {
    width: 48,
    height: 48,
  },
  constellationImageLocked: {
    opacity: 0.2,
    tintColor: '#aaa4ba',
  },
  constellationMonthLabel: {
    marginTop: 2,
    fontFamily: 'Pretendard',
    fontWeight: '700',
    color: '#aaa4ba',
  },
  constellationMonthLabelUnlocked: {
    color: '#765a20',
  },
  constellationProgress: {
    marginTop: 16,
    backgroundColor: '#f6f3ff',
    borderRadius: 16,
    padding: 13,
  },
  constellationProgressText: {
    fontFamily: 'Pretendard',
    fontWeight: '500',
    color: '#5D51C2',
    letterSpacing: 0.18,
    marginBottom: 8,
  },
  constellationProgressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#E3DCFF',
    overflow: 'hidden',
  },
  constellationProgressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#7C67E8',
  },

  // 1. 꿈 기록 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 38, 0.65)',
    justifyContent: 'flex-end',
  },
  recordKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  recordContainer: {
    backgroundColor: '#1c1735',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: '#000',
    shadowOffset: { height: -4, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '900',
    color: theme.colors.textLight,
    letterSpacing: -0.5,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeButtonText: {
    fontSize: theme.typography.sizes.bodySmall,
    fontFamily: theme.typography.fontFamily,
    color: '#cdcae2',
  },
  textInput: {
    backgroundColor: '#262045',
    borderRadius: 16,
    padding: 18,
    color: theme.colors.textLight,
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    height: 200,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
  },
  charCountText: {
    color: '#767192',
    fontSize: theme.typography.sizes.labelMedium,
    fontFamily: theme.typography.fontFamily,
  },
  submitCta: {
    backgroundColor: theme.colors.accentDark,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accentDark,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  submitCtaText: {
    color: theme.colors.textLight,
    fontSize: theme.typography.sizes.titleSmall,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
  },

  // 2. AI 로딩 모달 스타일
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 8, 25, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCenterBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 28,
    transform: [{ scale: 1.3 }],
  },
  loadingText: {
    color: theme.colors.textLight,
    fontSize: 17,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#8b84af',
    fontSize: theme.typography.sizes.bodySmall,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: 18,
  },

  // 3. 꿈 결과 모달 스타일
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 38, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#1b1633',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 24,
    borderWidth: 1,
    borderColor: 'rgba(117, 88, 247, 0.25)',
  },
  resultHeader: {
    fontSize: 21,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '900',
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultSectionTitle: {
    fontSize: theme.typography.sizes.labelMedium,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
    color: '#a59bf2',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  resultTextContent: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.textLight,
    lineHeight: 22,
    fontWeight: '500',
  },
  tagWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  emotionBadge: {
    backgroundColor: 'rgba(235, 87, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(235, 87, 87, 0.3)',
  },
  symbolBadge: {
    backgroundColor: 'rgba(117, 88, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(117, 88, 247, 0.3)',
  },
  badgeText: {
    fontSize: theme.typography.sizes.bodySmall,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.textLight,
    fontWeight: '500',
  },
  resultInterpretation: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    color: '#e2e0ed',
    lineHeight: 24,
  },
  resultNotice: {
    color: '#B9B4D3',
    fontFamily: 'Pretendard',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  resultCloseCta: {
    backgroundColor: theme.colors.accentDark,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  resultCloseCtaText: {
    color: theme.colors.textLight,
    fontSize: theme.typography.sizes.bodyMedium,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold,
  },

  // 4. 오류 알림 모달 스타일
  errorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 8, 25, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorContainer: {
    backgroundColor: '#262045',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  errorTitle: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '900',
    color: '#ff6b6b',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    color: '#cdcae2',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  errorCloseButtonText: {
    color: theme.colors.textLight,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.semibold,
  },

  // 5. 꿈 상세 정보 모달 스타일
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 19, 48, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailContainer: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#2b1a6b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailDateText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '700',
    color: '#8b84b5',
  },
  detailCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f0f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitleText: {
    fontFamily: 'Pretendard',
    fontSize: 18,
    fontWeight: '800',
    color: '#241B4B',
    lineHeight: 24,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '800',
    color: '#a09abb',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8f7fc',
    padding: 10,
    borderRadius: 16,
    marginBottom: 12,
  },
  detailMoodInfo: {
    flex: 1,
  },
  detailMoodLabel: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '700',
    color: '#241B4B',
  },
  detailMoodDesc: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    color: '#8b84b5',
    marginTop: 1,
  },
  detailTagWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  detailTag: {
    backgroundColor: '#f0ecff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailTagText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '700',
    color: '#6952D9',
  },
  detailMemoScroll: {
    maxHeight: 100,
    marginBottom: 14,
    backgroundColor: '#faf9ff',
    padding: 10,
    borderRadius: 12,
  },
  detailMemoText: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    color: '#49426c',
    lineHeight: 18,
  },
  detailAiSection: {
    marginBottom: 14,
    backgroundColor: '#f6f3ff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e2ff',
  },
  detailAiScroll: {
    maxHeight: 100,
  },
  detailAiText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    color: '#5c48b5',
    lineHeight: 18,
  },
  detailAiNotice: {
    color: '#7D769C',
    fontFamily: 'Pretendard',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  detailButtonEdit: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#7C67E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailButtonEditText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailButtonDelete: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 6. 알림 모달 스타일
  notifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 19, 48, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notifContainer: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#2b1a6b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifHeaderTitle: {
    fontFamily: 'Pretendard',
    fontSize: 16,
    fontWeight: '800',
    color: '#241B4B',
  },
  notifCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f0f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f0f7',
  },
  notifActionBtn: {
    paddingVertical: 2,
  },
  notifActionBtnText: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '700',
    color: '#6952D9',
  },
  notifActionDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#d0cae8',
  },
  notifScroll: {
    flex: 1,
  },
  notifEmptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifEmptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  notifEmptyIcon: {
    marginBottom: 12,
  },
  notifEmptyText: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    fontWeight: '700',
    color: '#49426c',
    marginBottom: 4,
    textAlign: 'center',
  },
  notifEmptySubText: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    color: '#8b84b5',
    textAlign: 'center',
  },
  notifItem: {
    backgroundColor: '#f9f9fc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0eff5',
  },
  notifItemUnread: {
    backgroundColor: '#f5f0ff',
    borderColor: '#e5dcff',
  },
  notifItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifItemTitle: {
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '700',
    color: '#5c5483',
    flex: 1,
  },
  notifItemTitleUnread: {
    color: '#241B4B',
    fontWeight: '800',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C67E8',
    marginLeft: 6,
  },
  notifItemBody: {
    fontFamily: 'Pretendard',
    fontSize: 12,
    color: '#5c5483',
    lineHeight: 16,
    marginBottom: 6,
  },
  notifItemTime: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    color: '#a09abb',
  },
});
