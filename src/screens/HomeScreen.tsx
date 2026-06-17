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

import { getSavedDreams } from '../utils/dreamStorage';
import { RECORD_PRIMARY_KEYWORDS, RECORD_EXTRA_KEYWORDS } from '../data/record';
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

type HomeScreenProps = {
  active?: boolean;
  data?: HomeData;
  onNotificationPress?: () => void;
  onRecordPress?: () => void;
  onSummaryPress?: () => void;
  onDreamModePress?: (mode: HomeDreamMode) => void;
  onPlanetModePress?: () => void;
  onRecentDreamPress?: (dream: RecentDream) => void;
  onRecentAllPress?: () => void;
  onFavoritePress?: (dream: RecentDream) => void;
  onTabPress?: (tabId: HomeTabId) => void;
};

const homeBackgroundSource = Platform.select({
  default: require('../../assets/home/home-background.png'),
  web: require('../../assets/home/home-background-web.png'),
});

// ─── 애니메이션 상수 ────────────────────────────────────────────────────────
const EASE_OUT_QUINT  = Easing.bezier(0.22, 1.0, 0.36, 1.0);
const EASE_IN_OUT_CUBIC = Easing.bezier(0.65, 0.0, 0.35, 1.0);
const EASE_OUT_BACK   = Easing.bezier(0.34, 1.26, 0.64, 1.0);
const noop = () => {};

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
      title: '별자리 모드',
    };
  }

  return {
    ctaLabel: '상세보기',
    description: '별이 연결된 나만의 꿈 우주를 확인해보세요.',
    id: 'planet',
    title: '행성계 모드',
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
  const { height, width } = useWindowDimensions();
  const entrance = useRef(new Animated.Value(0)).current;

  // DB 연동 및 동적 데이터 상태
  const [dreams, setDreams] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(2);

  // 꿈 기록 로드 함수
  const loadDreams = async () => {
    try {
      const stored = await getSavedDreams();
      setDreams(stored);
    } catch (e) {
      console.error('Failed to load dreams on HomeScreen:', e);
    }
  };

  // 알림 개수 로드 함수
  const loadNotificationCount = async () => {
    try {
      const stored = await AsyncStorage.getItem('@dreamlog_notification_count');
      if (stored !== null) {
        setNotificationCount(parseInt(stored, 10));
      } else {
        setNotificationCount(2); // default
      }
    } catch (e) {
      console.error('Failed to load notification count:', e);
    }
  };

  useEffect(() => {
    if (active) {
      loadDreams();
      loadNotificationCount();
    }
  }, [active]);

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

  // 최근 기록 동적 데이터 매핑 (가장 최근 2건 정렬하여 추출)
  const recentDreamsList = useMemo(() => {
    const sorted = [...dreams].sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return sorted.slice(0, 2);
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

  // 알림 클릭 시 로컬 뱃지 소거 핸들러
  const handleNotificationPressLocal = () => {
    if (notificationCount > 0) {
      Alert.alert(
        '알림',
        '새로운 알림을 모두 읽음 처리했습니다.',
        [
          {
            text: '확인',
            onPress: async () => {
              setNotificationCount(0);
              try {
                await AsyncStorage.setItem('@dreamlog_notification_count', '0');
              } catch (e) {
                console.error('Failed to save notification count:', e);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('알림', '새로운 알림이 없습니다.');
    }
    onNotificationPress?.();
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

  const layout = useMemo(() => getScreenLayout(width, height), [height, width]);
  const primaryDreamMode = useMemo(
    () => data.dreamModes.find((mode) => mode.id === 'planet') ?? data.dreamModes[0] ?? getFallbackMode('planet'),
    [data.dreamModes],
  );
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
    if (onDreamModePress) {
      onDreamModePress(primaryDreamMode);
      return;
    }

    if (primaryDreamMode.id === 'planet') {
      onPlanetModePress();
    }
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
    <View style={styles.root}>
      <StatusBar hidden />
      <Animated.View
        style={[
          styles.imageLayer,
          {
            left: layout.image.left,
            top: layout.image.top,
            width: layout.image.width,
            height: layout.image.height,
            overflow: 'hidden',
          },
          animatedImageStyle,
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          accessible={false}
          resizeMode="cover"
          source={homeBackgroundSource}
          style={{
            width: layout.image.width,
            height: layout.image.height,
          }}
        />
      </Animated.View>

      {/* ──────────────────────────────────────────────────────────────────────
          [가변성 요소 오버레이 렌더링]
          배경 이미지 위에 위치별로 실시간 동적 텍스트와 에셋들을 절대좌표로 렌더링
          ────────────────────────────────────────────────────────────────────── */}

      {/* 1. 좋은 아침이에요, {userName} (greeting-title) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: layout.image.left + 89 * layout.scale,
          top: layout.image.top + 43 * layout.scale,
          width: 245 * layout.scale,
          height: 38 * layout.scale,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Pretendard',
            fontWeight: '600', // semibold
            fontSize: 16 * layout.scale,
            color: '#2d237a',
            includeFontPadding: false,
          }}
        >
          좋은 아침이에요, {data.userName}
        </Text>
      </View>

      {/* 2. 알림 개수 뱃지 (notification-count-badge) - 피드백 반영: 더 정교하고 작게 조정 */}
      {notificationCount > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: layout.image.left + 351 * layout.scale,
            top: layout.image.top + 41 * layout.scale,
            width: 20 * layout.scale,
            height: 20 * layout.scale,
            borderRadius: 10 * layout.scale,
            backgroundColor: '#7558f7',
            borderWidth: 1.5 * layout.scale,
            borderColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#6f4be8',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'Pretendard',
              fontWeight: '800',
              fontSize: 10 * layout.scale,
              color: '#ffffff',
              includeFontPadding: false,
            }}
          >
            {notificationCount}
          </Text>
        </View>
      )}

      {/* 3. 이번 달 꿈 기록 개수 (dream-count-value) - 개 기록했어요. 와 동일 선상 정렬 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: layout.image.left + 39 * layout.scale,
          top: layout.image.top + 392 * layout.scale,
          height: 24 * layout.scale,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Pretendard',
            fontWeight: '500',
            fontSize: 24 * layout.scale,
            color: '#2d237a',
            includeFontPadding: false,
          }}
        >
          {monthlySummary.currentCount}
        </Text>
      </View>

      {/* 4. 전월 대비 증감 수치 - 지난 달보다 와 동일 선상 정렬 및 감소 시 빨간색 표시 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: layout.image.left + 94 * layout.scale,
          top: layout.image.top + 427 * layout.scale,
          height: 18 * layout.scale,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Pretendard',
            fontWeight: '800',
            fontSize: 13 * layout.scale,
            color: monthlySummary.previousMonthDelta >= 0 ? '#27ae60' : '#e74c3c',
            includeFontPadding: false,
          }}
        >
          {monthlySummary.previousMonthDelta >= 0
            ? `+${monthlySummary.previousMonthDelta}개`
            : `${monthlySummary.previousMonthDelta}개`}
        </Text>
      </View>

      {/* 5. 최근 기록 동적 렌더링 (recentDreamRows) */}
      {mappedRecentDreams.map((dream, index) => {
        const rowRect = HOME_HIT_AREAS.recentDreamRows[index];
        if (!rowRect) return null;
        
        const y = rowRect.y;
        const thumbSource = index === 0
          ? require('../../assets/home/parts/home-recent-thumb-1.png')
          : require('../../assets/home/parts/home-recent-thumb-2.png');

        return (
          <View key={`recent-info-${dream.id}`} pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            {/* 썸네일 */}
            <Image
              source={thumbSource}
              style={{
                position: 'absolute',
                left: layout.image.left + 32 * layout.scale,
                top: layout.image.top + (y + 6.5) * layout.scale,
                width: 48 * layout.scale,
                height: 48 * layout.scale,
                borderRadius: 12 * layout.scale,
              }}
              resizeMode="cover"
            />

            {/* 꿈 제목 */}
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 92 * layout.scale,
                top: layout.image.top + (y + 4) * layout.scale,
                width: 170 * layout.scale,
                height: 20 * layout.scale,
                justifyContent: 'center',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: '800',
                  fontSize: 14 * layout.scale,
                  color: '#2d237a',
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
                left: layout.image.left + 92 * layout.scale,
                top: layout.image.top + (y + 26) * layout.scale,
                flexDirection: 'row',
                gap: 4 * layout.scale,
              }}
            >
              {dream.tags.map((tag: any) => (
                <View
                  key={tag.id}
                  style={{
                    backgroundColor: '#f0ecff',
                    borderRadius: 8 * layout.scale,
                    paddingHorizontal: 8 * layout.scale,
                    paddingVertical: 2 * layout.scale,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: '600',
                      fontSize: 10 * layout.scale,
                      color: '#7558f7',
                      includeFontPadding: false,
                    }}
                  >
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* 작성 날짜 */}
            <View
              style={{
                position: 'absolute',
                left: layout.image.left + 265 * layout.scale,
                top: layout.image.top + (y + 22) * layout.scale,
                width: 70 * layout.scale,
                height: 18 * layout.scale,
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: '400',
                  fontSize: 11 * layout.scale,
                  color: '#8a82ad',
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
                left: layout.image.left + 337 * layout.scale,
                top: layout.image.top + (y + 9) * layout.scale,
                width: 39 * layout.scale,
                height: 39 * layout.scale,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 20 * layout.scale,
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
        style={[
          styles.hitArea,
          styles.webNoOutline,
          hitStyle(HOME_HIT_AREAS.recordCta),
        ]}
        testID="home-record-cta"
      >
        {({ pressed }) => (
          <Animated.View
            style={[
              {
                width: HOME_HIT_AREAS.recordCta.width * layout.scale,
                height: HOME_HIT_AREAS.recordCta.height * layout.scale,
                borderRadius: 20 * layout.scale,
                backgroundColor: pressed ? 'rgba(117, 88, 247, 0.08)' : 'transparent',
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
              onPress={() => onRecentDreamPress(dream)}
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

      {/* =======================================================
          MODAL 1: 오늘의 꿈 기록하기 모달
          ======================================================= */}
      <Modal
        animationType="none"
        transparent={true}
        visible={isRecordModalVisible}
        onRequestClose={closeRecordModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeRecordModal} />
          
          <Animated.View 
            style={[
              styles.recordContainer,
              { transform: [{ translateY: recordModalTranslate }] }
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
            <Text style={styles.loadingText}>AI 꿈 분석가가 꿈결님의 꿈 우주를</Text>
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
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={closeResultModal}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  imageLayer: {
    position: 'absolute',
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

  // 1. 꿈 기록 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 38, 0.65)',
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
});
