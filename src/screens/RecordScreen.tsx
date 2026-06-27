import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveDream, getSavedDreams, formatDateString } from '../utils/dreamStorage';
import { extractDreamTags } from '../services/gemini';
import { RecordKeywordSelector } from '../components/RecordKeywordSelector';
import { RecordModeSelector } from '../components/RecordModeSelector';
import { RecordMoodSelector } from '../components/RecordMoodSelector';
import { theme } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import {
  RECORD_DESIGN_WIDTH,
  RECORD_EXTRA_KEYWORDS,
  RECORD_INITIAL_SELECTED_KEYWORDS,
  RECORD_LIMITS,
  RECORD_MODE_OPTIONS,
  RECORD_MOODS,
  RECORD_PRIMARY_KEYWORDS,
} from '../data/record';
import {
  CONSTELLATION_POINT_LAYOUTS,
  MONTHLY_CONSTELLATIONS,
  getConstellationById,
} from '../data/constellations';
import {
  DEFAULT_DREAM_STAR_ID,
  DREAM_STAR_OPTIONS,
  getDreamStarOption,
  type DreamStarId,
} from '../data/dreamStars';
import type {
  DreamKeyword,
  DreamMood,
  DreamMoodId,
  RecordActionPayload,
  RecordModeId,
  SavedDream,
} from '../types/record';
import { HomeTabId } from '../types/home';

type RecordScreenProps = {
  active?: boolean;
  targetDate?: string;
  targetDreamId?: string;
  onBack?: () => void;
  onSaveDraft?: (payload: RecordActionPayload) => void;
  onSubmit?: (payload: RecordActionPayload, savedDream: SavedDream) => void;
  onTabPress?: (tabId: HomeTabId) => void;
};

const backIcon = require('../../assets/record/back-icon.png');
const headerCloud = require('../../assets/record/header-cloud.png');
const heroSun = require('../../assets/record/hero-sun.png');
const heroPlanet = require('../../assets/record/hero-planet.png');
const heroCloud = require('../../assets/record/hero-cloud.png');
const yellowStarIcon = require('../../assets/record/hero-planet-or-cloud.png');
const collectionStarIcon = require('../../assets/home/rebuilt/decor-yellow-star.png');
const MODE_DETAIL_SKIP_KEY = '@dreamlog_record_mode_detail_skip_v1';
const RECORD_CONSTELLATION_GUIDES = [
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

const noop = () => {};

function ConstellationProgressVisual({
  month,
  filledCount,
  highlightedPointIndex,
  highlightProgress,
  highlightStarSource,
  compact = false,
}: {
  month: number;
  filledCount: number;
  highlightedPointIndex?: number | null;
  highlightProgress?: Animated.Value;
  highlightStarSource?: ImageSourcePropType;
  compact?: boolean;
}) {
  const guide = MONTHLY_CONSTELLATIONS[month - 1];
  const points = CONSTELLATION_POINT_LAYOUTS[guide.id] ?? [];
  const width = compact ? 68 : 150;
  const height = compact ? 85 : 188;
  const starSize = compact ? 9 : 16;

  return (
    <View style={{ width, height, position: 'relative', overflow: 'hidden', borderRadius: compact ? 12 : 20 }}>
      <Image
        source={RECORD_CONSTELLATION_GUIDES[month - 1]}
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
        resizeMode="contain"
      />
      {points.map(([x, y], index) =>
        index < filledCount ? (
          <Image
            key={`${guide.id}-${index}`}
            source={collectionStarIcon}
            resizeMode="contain"
            style={{
              position: 'absolute',
              left: x * width - starSize / 2,
              top: y * height - starSize / 2,
              width: starSize,
              height: starSize,
            }}
          />
        ) : null,
      )}
      {highlightedPointIndex !== null &&
      highlightedPointIndex !== undefined &&
      points[highlightedPointIndex] &&
      highlightProgress ? (
        <Animated.Image
          source={highlightStarSource ?? collectionStarIcon}
          resizeMode="contain"
          style={{
            position: 'absolute',
            left: points[highlightedPointIndex][0] * width - starSize,
            top: points[highlightedPointIndex][1] * height - starSize,
            width: starSize * 2,
            height: starSize * 2,
            opacity: highlightProgress.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                scale: highlightProgress.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0.25, 1.25, 1.8],
                }),
              },
              {
                rotate: highlightProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-14deg', '16deg'],
                }),
              },
            ],
          }}
        />
      ) : null}
    </View>
  );
}

export function RecordScreen({
  active,
  targetDate,
  targetDreamId,
  onBack = noop,
  onSaveDraft,
  onSubmit,
}: RecordScreenProps) {
  const { isDark, fontScale } = useTheme();
  const { width } = useWindowDimensions();
  const screenWidth = Math.min(width, RECORD_DESIGN_WIDTH);
  const contentScale = Math.min(1, Math.max(0.84, screenWidth / RECORD_DESIGN_WIDTH));
  const contentWidth = RECORD_DESIGN_WIDTH;
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);
  const [isRecordContextLoading, setIsRecordContextLoading] = useState(false);
  const isEditing = editingDreamId !== null;

  const subtitleText = useMemo(() => {
    if (isEditing) return '꿈의 내용을 차분히 다듬어보세요';
    if (!targetDate || typeof targetDate !== 'string') return '오늘의 새로운 꿈을 기록해요';
    const parts = targetDate.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return `${month}월 ${day}일의 새 꿈을 기록해요`;
    }
    return '오늘의 새로운 꿈을 기록해요';
  }, [isEditing, targetDate]);

  // Scroll View reference and tracking
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = (event: any) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const toggleScroll = () => {
    if (scrollY > 150) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const [mode, setMode] = useState<RecordModeId>('constellation');
  const [selectedStarId, setSelectedStarId] = useState<DreamStarId>(DEFAULT_DREAM_STAR_ID);
  const [isStarPreviewVisible, setIsStarPreviewVisible] = useState(false);
  const starPreviewProgress = useRef(new Animated.Value(0)).current;
  const [detailMode, setDetailMode] = useState<RecordModeId | null>(null);
  const [skipDetailModeGuide, setSkipDetailModeGuide] = useState<RecordModeId[]>([]);
  const [title, setTitle] = useState('');
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>(
    RECORD_INITIAL_SELECTED_KEYWORDS,
  );
  const [showMoreKeywords, setShowMoreKeywords] = useState(false);
  const [selectedMoodIds, setSelectedMoodIds] = useState<DreamMoodId[]>([]);
  const [memo, setMemo] = useState('');
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [collectionDreams, setCollectionDreams] = useState<SavedDream[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);
  const [celebrationPointNumber, setCelebrationPointNumber] = useState(1);
  const [celebrationConstellationName, setCelebrationConstellationName] = useState('');
  const [celebrationPointIndex, setCelebrationPointIndex] = useState<number | null>(null);
  const celebrationProgress = useRef(new Animated.Value(0)).current;
  const activeRecordDate = targetDate || formatDateString(new Date());
  const activeRecordMonth = Number(activeRecordDate.slice(5, 7)) || new Date().getMonth() + 1;
  const activeConstellation = MONTHLY_CONSTELLATIONS[activeRecordMonth - 1];
  const activeConstellationDreams = useMemo(
    () =>
      collectionDreams.filter(
        (dream) =>
          dream.mode === 'constellation' &&
          dream.date.slice(0, 7) === activeRecordDate.slice(0, 7) &&
          dream.constellationId === activeConstellation.id,
      ),
    [activeConstellation.id, activeRecordDate, collectionDreams],
  );

  // Keywords and Moods States (persisted)
  const [allKeywords, setAllKeywords] = useState<DreamKeyword[]>([]);
  const [allMoods, setAllMoods] = useState<DreamMood[]>([]);

  // Load persisted keywords and moods
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedKeywords = await AsyncStorage.getItem('@dreamlog_custom_all_keywords');
        if (storedKeywords) {
          setAllKeywords(JSON.parse(storedKeywords));
        } else {
          setAllKeywords([...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS]);
        }

        const storedMoods = await AsyncStorage.getItem('@dreamlog_custom_all_moods');
        if (storedMoods) {
          const parsed = JSON.parse(storedMoods);
          const updated = parsed.map((m: any) => {
            if (m.id === 'happy') {
              return { ...m, expression: 'excited' };
            }
            return m;
          });
          setAllMoods(updated);
        } else {
          setAllMoods(RECORD_MOODS);
        }
      } catch (e) {
        setAllKeywords([...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS]);
        setAllMoods(RECORD_MOODS);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(MODE_DETAIL_SKIP_KEY)
      .then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setSkipDetailModeGuide(parsed.filter((item): item is RecordModeId => item === 'constellation' || item === 'planet'));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(MODE_DETAIL_SKIP_KEY, JSON.stringify(skipDetailModeGuide)).catch(() => {});
  }, [skipDetailModeGuide]);

  const keywordMap = useMemo(() => {
    return new Map(allKeywords.map((keyword) => [keyword.id, keyword]));
  }, [allKeywords]);

  const primaryKeywords = useMemo(() => {
    return allKeywords.filter((k) => k.isPrimary);
  }, [allKeywords]);

  const extraKeywords = useMemo(() => {
    return allKeywords.filter((k) => !k.isPrimary);
  }, [allKeywords]);

  // Form Reset
  const resetForm = useCallback(() => {
    setEditingDreamId(null);
    setTitle('');
    setSelectedKeywordIds(RECORD_INITIAL_SELECTED_KEYWORDS);
    setShowMoreKeywords(false);
    setSelectedMoodIds([]);
    setMemo('');
    setMode('constellation');
    setSelectedStarId(DEFAULT_DREAM_STAR_ID);
    setCelebrationPointIndex(null);
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    celebrationProgress.stopAnimation();
    setCelebrationPointIndex(null);
    setIsCelebrationVisible(false);
    setIsSubmitting(false);
    setScrollY(0);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [active, celebrationProgress, targetDate, targetDreamId]);

  useEffect(() => {
    if (!active) return;
    void getSavedDreams().then(setCollectionDreams);
  }, [active, targetDate, targetDreamId]);

  // Editing is explicit by dream id. A date alone always starts a new record so
  // multiple dreams can be created on the same day without overwriting.
  useEffect(() => {
    if (active && targetDreamId) {
      const loadExistingDream = async () => {
        setIsRecordContextLoading(true);
        try {
          const dreamsList = await getSavedDreams();
          const existing = dreamsList.find((d) => d.id === targetDreamId);
          if (existing) {
            setEditingDreamId(existing.id);
            setTitle(existing.title || '');
            setSelectedKeywordIds(existing.selectedKeywordIds || []);
            setSelectedMoodIds(existing.selectedMoodIds || []);
            setMemo(existing.memo || '');
            setMode(existing.mode || 'constellation');
            setSelectedStarId(existing.selectedStarId || DEFAULT_DREAM_STAR_ID);
          } else {
            resetForm();
          }
        } catch (e) {
          console.error('Failed to load existing dream:', e);
        } finally {
          setIsRecordContextLoading(false);
        }
      };
      loadExistingDream();
    } else if (active) {
      setIsRecordContextLoading(false);
      resetForm();
    }
  }, [active, targetDate, targetDreamId, resetForm]);

  const handleStarSelect = useCallback((starId: DreamStarId) => {
    setSelectedStarId(starId);
    setIsStarPreviewVisible(true);
    starPreviewProgress.setValue(0);
    Animated.spring(starPreviewProgress, {
      toValue: 1,
      friction: 5,
      tension: 145,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [starPreviewProgress]);

  const payload = (): RecordActionPayload => {
    const selectedKeywords = selectedKeywordIds
      .map((keywordId) => keywordMap.get(keywordId))
      .filter((keyword): keyword is DreamKeyword => Boolean(keyword));
    const selectedMoods = selectedMoodIds
      .map((moodId) => allMoods.find((moodItem) => moodItem.id === moodId))
      .filter((mood): mood is DreamMood => Boolean(mood));

    return {
      memo,
      mode,
      selectedStarId,
      selectedKeywordIds,
      selectedKeywords,
      selectedMoodIds,
      selectedMoods,
      title,
    };
  };

  const handleKeywordToggle = useCallback((keywordId: string) => {
    setSelectedKeywordIds((current) => {
      if (current.includes(keywordId)) {
        return current.filter((id) => id !== keywordId);
      }

      if (current.length >= RECORD_LIMITS.keywords) {
        return current;
      }

      return [...current, keywordId];
    });
  }, []);

  const handleAddKeyword = useCallback((label: string) => {
    setAllKeywords((prev) => {
      const updated = [
        ...prev,
        { id: `custom_kw_${Date.now()}`, label, isPrimary: true }, // Custom keywords are primary (always visible)
      ];
      AsyncStorage.setItem('@dreamlog_custom_all_keywords', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const handleDeleteKeyword = useCallback((keywordId: string) => {
    setAllKeywords((prev) => {
      const updated = prev.filter((k) => k.id !== keywordId);
      AsyncStorage.setItem('@dreamlog_custom_all_keywords', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setSelectedKeywordIds((current) => current.filter((id) => id !== keywordId));
  }, []);

  const handleModeChange = useCallback((newMode: RecordModeId) => {
    setMode(newMode);
  }, []);

  const handleDetailPress = useCallback((nextDetailMode: RecordModeId) => {
    if (skipDetailModeGuide.includes(nextDetailMode)) {
      setDetailMode(null);
      setMode(nextDetailMode);
      return;
    }
    setDetailMode(nextDetailMode);
  }, [skipDetailModeGuide]);

  const handleToggleMoreKeywords = useCallback(() => {
    setShowMoreKeywords((current) => !current);
  }, []);

  const handleSelectMood = useCallback((moodId: DreamMoodId) => {
    setSelectedMoodIds((current) => {
      if (current.includes(moodId)) {
        return current.filter((id) => id !== moodId);
      }
      return [...current, moodId];
    });
  }, []);

  const handleAddMood = useCallback((newMood: DreamMood) => {
    setAllMoods((prev) => {
      const updated = [...prev, newMood];
      AsyncStorage.setItem('@dreamlog_custom_all_moods', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const handleDeleteMood = useCallback((moodId: DreamMoodId) => {
    setAllMoods((prev) => {
      const updated = prev.filter((m) => m.id !== moodId);
      AsyncStorage.setItem('@dreamlog_custom_all_moods', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    setSelectedMoodIds((prev) => prev.filter((id) => id !== moodId));
  }, []);

  const handleMemoFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const handleMemoContentSizeChange = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleKeywordFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 150, animated: true });
    }, 150);
  }, []);

  const handleSaveDraft = () => {
    onSaveDraft?.(payload());
  };

  const handleBackPress = () => {
    resetForm();
    onBack();
  };

  const handleAiRecommendKeywords = async () => {
    if (!memo.trim()) {
      Alert.alert('알림', '먼저 간단한 메모를 입력해 주셔야 AI가 키워드를 추출할 수 있습니다.');
      return;
    }
    
    setIsAiExtracting(true);
    try {
      const tags = await extractDreamTags(memo);
      if (tags && tags.length > 0) {
        const storedKeywordsRaw = await AsyncStorage.getItem('@dreamlog_custom_all_keywords');
        let currentAllKeywords = storedKeywordsRaw 
          ? JSON.parse(storedKeywordsRaw) 
          : [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];

        const newlySelectedIds: string[] = [];
        const updatedAllKeywords = [...currentAllKeywords];
        let hasNewKeywords = false;

        for (const tag of tags) {
          const found = currentAllKeywords.find((k: any) => k.label === tag || k.id === tag);
          if (found) {
            newlySelectedIds.push(found.id);
          } else {
            const newId = `custom_kw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            updatedAllKeywords.push({ id: newId, label: tag, isPrimary: true });
            newlySelectedIds.push(newId);
            hasNewKeywords = true;
          }
        }

        if (hasNewKeywords) {
          setAllKeywords(updatedAllKeywords);
          await AsyncStorage.setItem('@dreamlog_custom_all_keywords', JSON.stringify(updatedAllKeywords));
        }

        setSelectedKeywordIds((prev) => {
          const merged = Array.from(new Set([...prev, ...newlySelectedIds]));
          return merged.slice(0, RECORD_LIMITS.keywords);
        });

        Alert.alert('AI 분석 완료', `꿈 메모 분석을 통해 [${tags.join(', ')}] 태그를 추천 및 선택하였습니다.`);
      } else {
        Alert.alert('분석 실패', '꿈 메모에서 추출할 수 있는 명확한 키워드를 찾지 못했습니다.');
      }
    } catch (error) {
      console.error('Failed to extract AI keywords in RecordScreen:', error);
      Alert.alert('분석 실패', 'AI 통신 도중 에러가 발생했습니다.');
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleSubmitPress = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const currentPayload = payload();
    try {
      const savedDream = await saveDream(currentPayload, editingDreamId ?? undefined, targetDate);
      setCollectionDreams(await getSavedDreams());

      if (mode === 'constellation') {
        const nextPointIndex = savedDream.constellationPointIndex ?? 0;
        setCelebrationPointIndex(nextPointIndex);
        setCelebrationPointNumber(nextPointIndex + 1);
        setCelebrationConstellationName(
          getConstellationById(savedDream.constellationId)?.name ??
            activeConstellation.name,
        );

        if (Platform.OS === 'web') {
          // 웹 환경: 복잡한 React Native Web Animated sequence의 유실/락을 원천 예방
          setIsCelebrationVisible(true);
          celebrationProgress.setValue(1); // 뿅 튀어나온 형태로 고정 노출

          setTimeout(() => {
            setIsCelebrationVisible(false);
            setIsSubmitting(false);
            onSubmit?.(currentPayload, savedDream);
            resetForm();
          }, 600);
          return;
        }

        // 네이티브 모바일 환경: 원래의 풍부한 스프링 물리 가속 애니메이션 완벽 구현
        celebrationProgress.setValue(0);
        setIsCelebrationVisible(true);

        let isEnded = false;
        const onAnimationEnd = () => {
          if (isEnded) return;
          isEnded = true;
          setIsCelebrationVisible(false);
          setIsSubmitting(false);
          onSubmit?.(currentPayload, savedDream);
          resetForm();
        };

        const safetyTimeout = setTimeout(() => {
          onAnimationEnd();
        }, 1200);

        Animated.sequence([
          Animated.spring(celebrationProgress, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.delay(520),
          Animated.timing(celebrationProgress, {
            toValue: 0,
            duration: 230,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          clearTimeout(safetyTimeout);
          onAnimationEnd();
        });
        return;
      }

      setIsSubmitting(false);
      onSubmit?.(currentPayload, savedDream);
      resetForm();
    } catch (e) {
      console.error('Failed to save dream:', e);
      setIsSubmitting(false);
      Alert.alert('저장 실패', '꿈 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const scaledContentStyle = {
    transform: [{ scale: contentScale }],
  };

  return (
    <SafeAreaView style={[styles.root, isDark && styles.darkRoot]}>
      <StatusBar hidden />
      <View style={styles.keyboardRoot}>
        <ScrollView
          ref={scrollViewRef}
          bounces
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          testID="record-screen-scroll"
        >
          <View
            style={[
              styles.designCanvas,
              { width: contentWidth },
              scaledContentStyle,
            ]}
          >
            <View style={styles.heroSection}>
              <Pressable
                accessibilityLabel="뒤로가기"
                accessibilityRole="button"
                onPress={handleBackPress}
                style={({ pressed }) => [
                  styles.backButton,
                  Platform.OS === 'web' ? styles.webNoOutline : null,
                  pressed && styles.pressed,
                ]}
                testID="record-back-button"
              >
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  resizeMode="contain"
                  source={backIcon}
                  style={styles.backIcon}
                />
              </Pressable>

              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                resizeMode="contain"
                source={headerCloud}
                style={styles.headerCloud}
              />
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                resizeMode="contain"
                source={heroSun}
                style={styles.heroSun}
              />
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                resizeMode="contain"
                source={heroCloud}
                style={styles.heroCloud}
              />
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                resizeMode="contain"
                source={heroPlanet}
                style={styles.heroPlanet}
              />

              <Text style={[styles.headerTitle, { fontSize: 16 * fontScale }]}>
                {isEditing ? '꿈 기록 수정하기' : '새 꿈 기록하기'}
              </Text>
              <View style={styles.subtitleRow}>
                <View style={styles.spacer} />
                <Text style={[styles.headerSubtitle, { fontSize: 15 * fontScale }]}>{subtitleText}</Text>
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  resizeMode="contain"
                  source={yellowStarIcon}
                  style={styles.decorativeStar}
                />
              </View>

              <View style={styles.modeSelectorWrap}>
              <RecordModeSelector
                  mode={mode}
                  onChange={handleModeChange}
                  onDetailPress={handleDetailPress}
                  options={RECORD_MODE_OPTIONS}
                />
              </View>
              <View style={[styles.collectionPreview, isDark && styles.darkCollectionPreview]}>
                {mode === 'constellation' ? (
                  <>
                    <ConstellationProgressVisual
                      month={activeRecordMonth}
                      filledCount={activeConstellationDreams.length}
                      highlightedPointIndex={celebrationPointIndex}
                      highlightProgress={celebrationProgress}
                      highlightStarSource={getDreamStarOption(selectedStarId).source}
                      compact
                    />
                    <View style={styles.collectionPreviewCopy}>
                      <Text style={[styles.collectionPreviewEyebrow, { fontSize: 10 * fontScale }]}>
                        {activeRecordMonth}월의 별자리 기록
                      </Text>
                      <Text style={[styles.collectionPreviewTitle, { fontSize: 15 * fontScale }]}>{activeConstellation.name}</Text>
                      <Text style={[styles.collectionPreviewBody, { fontSize: 11 * fontScale }]}>
                        이번 기록으로 황금빛 점 하나가 채워져요.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Image source={heroPlanet} style={styles.planetCollectionImage} resizeMode="contain" />
                    <View style={styles.collectionPreviewCopy}>
                      <Text style={[styles.collectionPreviewEyebrow, { fontSize: 10 * fontScale }]}>나의 꿈 우주</Text>
                      <Text style={[styles.collectionPreviewTitle, { fontSize: 15 * fontScale }]}>행성 수집하기</Text>
                      <Text style={[styles.collectionPreviewBody, { fontSize: 11 * fontScale }]}>
                        기록을 완료하면 새로운 행성을 하나 얻어요.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View
              style={[
                styles.entryModeBanner,
                isEditing ? styles.entryModeBannerEditing : styles.entryModeBannerNew,
              ]}
            >
              <View style={[
                styles.entryModeBadge,
                isEditing ? styles.entryModeBadgeEditing : styles.entryModeBadgeNew,
              ]}>
                <Text style={[
                  styles.entryModeBadgeText,
                  isEditing ? styles.entryModeBadgeTextEditing : styles.entryModeBadgeTextNew,
                ]}>
                  {isRecordContextLoading ? '확인 중' : isEditing ? '수정 중' : '새 기록'}
                </Text>
              </View>
              <View style={styles.entryModeCopy}>
                <Text style={[styles.entryModeTitle, { fontSize: 14 * fontScale }]}>
                  {isRecordContextLoading
                    ? '이 날짜의 기록 상태를 확인하고 있어요'
                    : isEditing
                      ? '기존 꿈 기록을 수정하고 있어요'
                      : '새로운 꿈 기록을 작성하고 있어요'}
                </Text>
                <Text style={[styles.entryModeDescription, { fontSize: 10.5 * fontScale }]}>
                  {isRecordContextLoading
                    ? '확인이 끝나면 새 기록 또는 수정 상태가 명확하게 표시됩니다.'
                    : isEditing
                      ? '저장하면 기존 기록과 별자리 위치에 변경 내용이 반영됩니다.'
                      : '입력을 마치면 새로운 꿈별이 별자리에 하나 추가됩니다.'}
                </Text>
              </View>
            </View>

            {mode === 'constellation' ? (
              <Card style={styles.starPickerCard} padding={14} shadow>
                <View style={styles.starPickerHeader}>
                  <View style={styles.starPickerHeaderCopy}>
                    <Text style={[styles.starPickerEyebrow, { fontSize: 10 * fontScale }]}>이번 꿈의 별 디자인</Text>
                    <Text style={[styles.starPickerTitle, { fontSize: 16 * fontScale }]}> 
                      별자리에 놓을 별을 골라주세요.
                    </Text>
                  </View>
                  <Text style={[styles.starPickerCount, { fontSize: 10 * fontScale }]}>
                    {isEditing
                      ? '기존 위치 유지'
                      : `${activeConstellationDreams.length + 1}번째 점`}
                  </Text>
                </View>
                <View style={styles.starPickerOptions}>
                  {DREAM_STAR_OPTIONS.map((option) => {
                    const selected = selectedStarId === option.id;
                    return (
                      <Pressable
                        accessibilityLabel={`${option.label} 선택`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={option.id}
                        onPress={() => handleStarSelect(option.id)}
                        style={({ pressed }) => [
                          styles.starPickerOption,
                          selected && styles.starPickerOptionSelected,
                          pressed && styles.starPickerOptionPressed,
                        ]}
                        testID={`record-star-${option.id}`}
                      >
                        <Image source={option.source} resizeMode="contain" style={styles.starPickerImage} />
                        {selected ? (
                          <View style={styles.starPickerSelectedBadge}>
                            <Text style={styles.starPickerSelectedBadgeText}>선택</Text>
                          </View>
                        ) : null}
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.starPickerLabel,
                            selected && styles.starPickerLabelSelected,
                            { fontSize: 9.5 * fontScale },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            ) : null}

            <View style={[
              styles.titleSection,
              mode === 'constellation' && styles.titleInputCardAfterStarPicker,
            ]}>
              <Text style={[styles.formSectionEyebrow, { fontSize: 10 * fontScale }]}>꿈의 기본 정보</Text>
              <Text style={[styles.formSectionTitle, { fontSize: 17 * fontScale }]}>
                오늘 꿈의 제목
              </Text>
              <Text style={[styles.formSectionDescription, { fontSize: 10.5 * fontScale }]}>
                나중에 한눈에 떠올릴 수 있는 짧은 제목을 적어주세요.
              </Text>
              <Card style={styles.titleInputCard} padding={0} shadow={true}>
                <Input
                  accessibilityLabel="오늘 꿈의 제목"
                  maxLength={RECORD_LIMITS.title}
                  onChangeText={setTitle}
                  placeholder="예: 별이 쏟아지는 바다를 걸었어요"
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={title}
                  rightLabel={`${title.length}/${RECORD_LIMITS.title}`}
                  inputStyle={styles.titleInputStyle}
                  style={styles.titleInputContainer}
                />
              </Card>
            </View>

            <View style={styles.keywordSection}>
              <RecordKeywordSelector
                extraKeywords={extraKeywords}
                keywords={primaryKeywords}
                maxSelected={RECORD_LIMITS.keywords}
                onToggleKeyword={handleKeywordToggle}
                onAddKeyword={handleAddKeyword}
                onDeleteKeyword={handleDeleteKeyword}
                onToggleMore={handleToggleMoreKeywords}
                selectedKeywordIds={selectedKeywordIds}
                showMore={showMoreKeywords}
                onFocus={handleKeywordFocus}
                sectionLabel="떠오른 키워드"
              />
            </View>

            <View style={styles.moodSection}>
              <RecordMoodSelector
                moods={allMoods}
                onSelectMood={handleSelectMood}
                selectedMoodIds={selectedMoodIds}
                onAddMood={handleAddMood}
                onDeleteMood={handleDeleteMood}
                sectionLabel="꿈의 감정"
              />
            </View>

            <Card style={styles.memoCard} padding={16} shadow={true}>
              <View style={styles.memoHeader}>
                <Text style={styles.memoTitle}>간단한 메모</Text>
                <Text style={styles.memoOptional}>(선택)</Text>
              </View>
              <Input
                accessibilityLabel="간단한 메모"
                maxLength={RECORD_LIMITS.memo}
                multiline={true}
                onChangeText={setMemo}
                placeholder="꿈에서 느낀 감정이나 분위기를 적어보세요."
                placeholderTextColor={theme.colors.placeholder}
                value={memo}
                onFocus={handleMemoFocus}
                onContentSizeChange={handleMemoContentSizeChange}
                rightLabel={`${memo.length}/${RECORD_LIMITS.memo}`}
                border={false}
                minHeight={24}
                style={styles.memoInputContainer}
              />
              <Button
                variant="secondary"
                label={isAiExtracting ? "AI 키워드 분석 중..." : "🔮 AI 키워드 자동 추출"}
                onPress={handleAiRecommendKeywords}
                disabled={isAiExtracting}
                style={styles.aiExtractButton}
                textStyle={styles.aiExtractButtonText}
              />
            </Card>

            {/* Reverted back to the original standard action buttons and animation style */}
            <View style={styles.actionRow}>
              <Button
                variant="secondary"
                label={isEditing ? '수정 취소' : '임시저장'}
                onPress={isEditing ? handleBackPress : handleSaveDraft}
                disabled={isRecordContextLoading}
                icon={
                  <View style={styles.saveIcon}>
                    <View style={styles.saveIconLine} />
                    <View style={[styles.saveIconLine, styles.saveIconSecondLine]} />
                  </View>
                }
                style={styles.actionBtn}
                textStyle={styles.actionBtnText}
                testID="record-save-draft-button"
              />

              <Button
                variant="primary"
                label={
                  isEditing
                    ? '수정 내용 저장'
                    : mode === 'constellation'
                      ? '새 꿈별 기록 완료'
                      : '새 행성 수집 완료'
                }
                onPress={handleSubmitPress}
                disabled={isSubmitting || isRecordContextLoading}
                style={styles.actionBtn}
                textStyle={styles.actionBtnText}
                testID="record-submit-button"
              />
            </View>
          </View>
        </ScrollView>

        {/* Floating Scroll Toggle Button (Quick scroll between top and bottom) */}
        <Pressable
          onPress={toggleScroll}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.scrollToggle,
            pressed && styles.pressedToggle,
            Platform.OS === 'web' && styles.webNoOutline,
          ]}
        >
          <Text style={styles.scrollToggleText}>{scrollY > 150 ? '▲' : '▼'}</Text>
        </Pressable>
      </View>
      <Modal
        animationType="fade"
        transparent
        visible={isStarPreviewVisible}
        onRequestClose={() => setIsStarPreviewVisible(false)}
      >
        <View style={styles.starPreviewOverlay}>
          <Pressable
            accessibilityLabel="선택한 별 미리보기 닫기"
            onPress={() => setIsStarPreviewVisible(false)}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View
            style={[
              styles.starPreviewCard,
              {
                opacity: starPreviewProgress,
                transform: [{
                  scale: starPreviewProgress.interpolate({
                    inputRange: [0, 0.75, 1],
                    outputRange: [0.72, 1.08, 1],
                  }),
                }],
              },
            ]}
          >
            <Text style={[styles.starPreviewEyebrow, { fontSize: 11 * fontScale }]}>이번 꿈의 별</Text>
            <Text style={[styles.starPreviewTitle, { fontSize: 21 * fontScale }]}>별을 선택하셨어요</Text>
            <View style={styles.starPreviewHalo}>
              <Image
                source={getDreamStarOption(selectedStarId).source}
                resizeMode="contain"
                style={styles.starPreviewImage}
              />
            </View>
            <Text style={[styles.starPreviewLabel, { fontSize: 14 * fontScale }]}>
              {getDreamStarOption(selectedStarId).label}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsStarPreviewVisible(false)}
              style={({ pressed }) => [styles.starPreviewConfirm, pressed && styles.pressed]}
            >
              <Text style={[styles.starPreviewConfirmText, { fontSize: 13 * fontScale }]}>이 별로 기록하기</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={detailMode !== null}
        onRequestClose={() => setDetailMode(null)}
      >
        <View style={styles.modeDetailOverlay}>
          <Pressable
            accessibilityLabel="모드 설명 닫기"
            onPress={() => setDetailMode(null)}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.modeDetailCard, isDark && styles.darkModeDetailCard]}>
            <View style={styles.modeDetailHeader}>
              <View>
                <Text style={[styles.modeDetailEyebrow, { fontSize: 11 * fontScale }]}>
                  {detailMode === 'planet' ? '나의 꿈 우주' : `${activeRecordMonth}월의 꿈별`}
                </Text>
                <Text style={[styles.modeDetailTitle, { fontSize: 20 * fontScale }]}>
                  {detailMode === 'planet' ? '행성을 하나씩 수집해요' : `${activeConstellation.name}를 채워가요`}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="모드 설명 닫기"
                onPress={() => setDetailMode(null)}
                style={({ pressed }) => [
                  styles.modeDetailClose,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modeDetailCloseText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modeDetailVisual}>
              {detailMode === 'planet' ? (
                <Image source={heroPlanet} resizeMode="contain" style={styles.modeDetailPlanet} />
              ) : (
                <ConstellationProgressVisual
                  month={activeRecordMonth}
                  filledCount={activeConstellationDreams.length}
                />
              )}
            </View>

            <Text style={[styles.modeDetailDescription, { fontSize: 13 * fontScale }]}>
              {detailMode === 'planet'
                ? '꿈 기록을 완료할 때마다 서로 다른 빛과 표정을 가진 행성이 우주에 하나씩 추가돼요.'
                : '꿈 기록 하나가 황금빛 점 하나가 되어 이번 달 별자리를 완성해요. 모든 점을 채우면 예비 별자리가 이어져요.'}
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: skipDetailModeGuide.includes(detailMode ?? 'constellation') }}
              onPress={() => {
                if (!detailMode) return;
                setSkipDetailModeGuide((current) =>
                  current.includes(detailMode)
                    ? current.filter((item) => item !== detailMode)
                    : [...current, detailMode],
                );
              }}
              style={styles.modeDetailSkipRow}
            >
              <View style={[styles.modeDetailSkipBox, skipDetailModeGuide.includes(detailMode ?? 'constellation') && styles.modeDetailSkipBoxChecked]}>
                {skipDetailModeGuide.includes(detailMode ?? 'constellation') ? <Text style={styles.modeDetailSkipCheck}>✓</Text> : null}
              </View>
              <Text style={styles.modeDetailSkipText}>다시 보지 않기</Text>
            </Pressable>
            {detailMode === 'constellation' ? (
              <Text style={[styles.modeDetailProgress, { fontSize: 12 * fontScale }]}>
                {activeConstellationDreams.length} / {activeConstellation.points}개의 꿈별을 채웠어요
              </Text>
            ) : null}

            <View style={styles.modeDetailSteps}>
              <View style={styles.modeDetailStep}>
                <Text style={[styles.modeDetailStepNumber, { fontSize: 12 * fontScale }]}>1</Text>
                <Text style={[styles.modeDetailStepText, { fontSize: 10 * fontScale }]}>꿈을 기록해요</Text>
              </View>
              <View style={styles.modeDetailStep}>
                <Text style={[styles.modeDetailStepNumber, { fontSize: 12 * fontScale }]}>2</Text>
                <Text style={[styles.modeDetailStepText, { fontSize: 10 * fontScale }]}>
                  {detailMode === 'planet' ? '새 행성을 받아요' : '황금빛 점을 채워요'}
                </Text>
              </View>
              <View style={styles.modeDetailStep}>
                <Text style={[styles.modeDetailStepNumber, { fontSize: 12 * fontScale }]}>3</Text>
                <Text style={[styles.modeDetailStepText, { fontSize: 10 * fontScale }]}>
                  {detailMode === 'planet' ? '나만의 우주를 만들어요' : '별자리를 완성해요'}
                </Text>
              </View>
            </View>

            <Button
              variant="primary"
              label="이 모드로 기록하기"
              onPress={() => setDetailMode(null)}
              style={styles.modeDetailConfirmButton}
              textStyle={styles.modeDetailConfirmText}
            />
          </View>
        </View>
      </Modal>
      {isCelebrationVisible && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]} pointerEvents="box-none">
          <View style={styles.celebrationOverlay} pointerEvents="none">
            <Animated.View
              style={[
                styles.celebrationContent,
                {
                  opacity: celebrationProgress,
                  transform: [
                    {
                      scale: celebrationProgress.interpolate({
                        inputRange: [0, 0.72, 1],
                        outputRange: [0.2, 1.16, 1],
                      }),
                    },
                    {
                      rotate: celebrationProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-14deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.Image
                source={getDreamStarOption(selectedStarId).source}
                resizeMode="contain"
                style={styles.celebrationStar}
              />
              <Image
                source={getDreamStarOption('lavender').source}
                resizeMode="contain"
                style={[styles.celebrationSparkle, styles.celebrationSparkleLeft]}
              />
              <Image
                source={getDreamStarOption('gold').source}
                resizeMode="contain"
                style={[styles.celebrationSparkle, styles.celebrationSparkleRight]}
              />
              <Text style={[styles.celebrationTitle, { fontSize: 22 * fontScale }]}>
                꿈별이 뿅!
              </Text>
              <Text style={[styles.celebrationBody, { fontSize: 12 * fontScale }]}>
                {celebrationConstellationName}의 {celebrationPointNumber}번째 점에 기록했어요
              </Text>
            </Animated.View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.bgWhite,
    flex: 1,
  },
  darkRoot: {
    backgroundColor: '#140f22',
  },
  aiExtractButton: {
    marginTop: 12,
    height: 38,
    borderColor: 'rgba(117, 88, 247, 0.4)',
  },
  aiExtractButtonText: {
    fontSize: 13,
    color: '#7558f7',
    fontWeight: '700',
  },
  keyboardRoot: {
    flex: 1,
    marginBottom: theme.spacing.layoutXxxl, // 80
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 110,
  },
  designCanvas: {
    alignSelf: 'center',
    backgroundColor: theme.colors.bgWhite,
    minHeight: 0,
    overflow: 'visible',
  },
  heroSection: {
    height: 318,
    overflow: 'visible',
    position: 'relative',
    width: RECORD_DESIGN_WIDTH,
  },
  backButton: {
    height: 49,
    left: theme.spacing.xxl, // 16
    position: 'absolute',
    top: theme.spacing.xl, // 12
    width: 49,
    zIndex: 4,
  },
  backIcon: {
    height: 49,
    width: 49,
  },
  headerCloud: {
    height: 49,
    left: 322,
    position: 'absolute',
    top: 0,
    width: 49,
    zIndex: 2,
  },
  heroSun: {
    height: 112,
    left: 34,
    position: 'absolute',
    top: 25,
    width: 112,
    zIndex: 1,
  },
  heroCloud: {
    height: 54,
    left: 260,
    opacity: 0.72,
    position: 'absolute',
    top: 41,
    width: 54,
    zIndex: 1,
  },
  heroPlanet: {
    height: 76,
    left: 286,
    position: 'absolute',
    top: 54,
    width: 76,
    zIndex: 2,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.titleSmall, // 16
    fontFamily: theme.typography.fontFamily,
    fontWeight: '900',
    includeFontPadding: false,
    left: 0,
    lineHeight: 37,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    textShadowColor: theme.colors.shadowText,
    textShadowOffset: { height: 3, width: 0 },
    textShadowRadius: 8,
    top: theme.spacing.sm, // 6
    zIndex: 3,
  },
  subtitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 60,
    zIndex: 3,
  },
  headerSubtitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.bodyMedium, // 15
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.semibold, // '600'
    includeFontPadding: false,
    lineHeight: 37,
    textShadowColor: theme.colors.shadowText,
    textShadowOffset: { height: 3, width: 0 },
    textShadowRadius: 8,
  },
  decorativeStar: {
    width: 34,
    height: 34,
    marginLeft: theme.spacing.sm, // 6
  },
  spacer: {
    width: 34,
    marginRight: theme.spacing.sm, // 6
  },
  modeSelectorWrap: {
    left: 30,
    position: 'absolute',
    top: 117,
    width: 339,
    zIndex: 3,
  },
  collectionPreview: {
    alignItems: 'center',
    backgroundColor: '#F4F0FC',
    borderRadius: 20,
    flexDirection: 'row',
    height: 96,
    left: 27,
    paddingHorizontal: 13,
    position: 'absolute',
    top: 211,
    width: 339,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  darkCollectionPreview: {
    backgroundColor: '#211a39',
  },
  collectionPreviewImage: {
    height: 82,
    width: 68,
  },
  planetCollectionImage: {
    height: 72,
    width: 72,
  },
  collectionPreviewCopy: {
    flex: 1,
    marginLeft: 12,
  },
  collectionPreviewEyebrow: {
    color: '#8278B5',
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 15,
  },
  collectionPreviewTitle: {
    color: '#5D51C2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.22,
    lineHeight: 22,
  },
  collectionPreviewBody: {
    color: '#756EA0',
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.16,
    lineHeight: 17,
  },
  entryModeBanner: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 19,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 11,
    width: 345,
  },
  entryModeBannerNew: {
    backgroundColor: '#F0EDFF',
  },
  entryModeBannerEditing: {
    backgroundColor: '#FFF5E8',
  },
  entryModeBadge: {
    alignItems: 'center',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 58,
    paddingHorizontal: 9,
  },
  entryModeBadgeNew: {
    backgroundColor: '#7662DF',
  },
  entryModeBadgeEditing: {
    backgroundColor: '#E69A36',
  },
  entryModeBadgeText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  entryModeBadgeTextNew: {
    color: '#FFFFFF',
  },
  entryModeBadgeTextEditing: {
    color: '#FFFFFF',
  },
  entryModeCopy: {
    flex: 1,
    marginLeft: 12,
  },
  entryModeTitle: {
    color: '#4A409D',
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    letterSpacing: 0.22,
    lineHeight: 20,
  },
  entryModeDescription: {
    color: '#696187',
    fontFamily: 'Pretendard',
    fontWeight: '400',
    letterSpacing: 0.12,
    lineHeight: 16,
    marginTop: 2,
  },
  titleSection: {
    alignSelf: 'center',
    backgroundColor: '#FAF8FF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    width: 345,
  },
  titleInputCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    height: 54,
    marginTop: 10,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: 345,
  },
  titleInputCardAfterStarPicker: {
    marginTop: 22,
  },
  formSectionEyebrow: {
    alignSelf: 'flex-start',
    color: '#6C5CC8',
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.18,
    lineHeight: 15,
    backgroundColor: '#EEE8FF',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  formSectionTitle: {
    color: '#342A86',
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '700',
    letterSpacing: 0.12,
    lineHeight: 24,
    marginTop: 3,
  },
  formSectionDescription: {
    color: '#6D668F',
    fontFamily: 'Pretendard',
    fontWeight: '400',
    letterSpacing: 0.14,
    lineHeight: 16,
    marginTop: 6,
  },
  starPickerCard: {
    alignSelf: 'center',
    backgroundColor: '#F8F6FF',
    borderRadius: 24,
    marginTop: 18,
    minHeight: 236,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    width: 345,
  },
  starPickerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starPickerHeaderCopy: {
    flex: 1,
    paddingRight: 8,
  },
  starPickerEyebrow: {
    alignSelf: 'flex-start',
    color: '#6C5CC8',
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.18,
    lineHeight: 15,
    backgroundColor: '#EEE8FF',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  starPickerTitle: {
    color: '#31267F',
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 24,
    marginTop: 3,
  },
  starPickerDescription: {
    color: '#696187',
    fontFamily: 'Pretendard',
    fontWeight: '400',
    letterSpacing: 0.12,
    lineHeight: 15,
    marginTop: 2,
  },
  starPickerCount: {
    backgroundColor: '#E6DFFF',
    borderRadius: 12,
    color: '#594BB3',
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  starPickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 13,
  },
  starPickerOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    flexBasis: '31%',
    flexGrow: 1,
    height: 70,
    justifyContent: 'center',
    paddingHorizontal: 3,
    position: 'relative',
    shadowColor: '#A395E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  starPickerOptionSelected: {
    backgroundColor: '#EEE9FF',
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  starPickerOptionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  starPickerImage: {
    height: 42,
    width: 42,
  },
  starPickerSelectedBadge: {
    backgroundColor: '#6F5BD6',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: 5,
    top: 5,
  },
  starPickerSelectedBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-Medium',
    fontSize: 7,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  starPickerLabel: {
    color: '#8077A9',
    fontFamily: 'Pretendard',
    fontWeight: '400',
    lineHeight: 13,
    marginTop: 1,
  },
  starPickerLabelSelected: {
    color: '#5D51C2',
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
  },
  titleInputContainer: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 22,
  },
  titleInputStyle: {
    height: '100%',
  },
  keywordSection: {
    marginTop: 18,
  },
  moodSection: {
    marginTop: 18,
  },
  memoCard: {
    alignSelf: 'center',
    borderRadius: theme.radius.lg, // 15
    borderWidth: 0,
    minHeight: 76,
    paddingBottom: theme.spacing.lg, // 10
    paddingHorizontal: theme.spacing.xxl, // 16
    paddingTop: theme.spacing.md, // 8
    width: 345,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
  },
  memoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  memoTitle: {
    color: '#2F257F',
    fontSize: 16,
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 24,
  },
  memoOptional: {
    color: theme.colors.textMuted, // #8a82ad
    fontSize: theme.typography.sizes.labelSmall, // 11
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.regular, // '400'
    includeFontPadding: false,
    lineHeight: 21,
    marginLeft: theme.spacing.sm, // 6
    marginTop: 2,
  },
  memoInputContainer: {
    minHeight: 31,
  },
  actionRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 39,
    marginTop: 28,
    width: 339,
  },
  actionBtn: {
    width: 150,
  },
  actionBtnText: {
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '400',
    letterSpacing: 0.18,
  },
  saveIcon: {
    borderColor: theme.colors.accent, // #7b61ff
    borderRadius: theme.radius.xs, // 3
    borderWidth: 1.5,
    height: 18,
    marginRight: theme.spacing.md, // 8
    position: 'relative',
    width: 15,
  },
  saveIconLine: {
    backgroundColor: theme.colors.accent, // #7b61ff
    height: 1.5,
    left: 4,
    position: 'absolute',
    top: 6,
    width: 7,
  },
  saveIconSecondLine: {
    top: 11,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  scrollToggle: {
    position: 'absolute',
    right: 18,
    bottom: theme.spacing.xxl, // 16
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary, // #907eff
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.26,
    shadowRadius: 6,
    elevation: 4.5,
    zIndex: 99,
  },
  scrollToggleText: {
    color: theme.colors.textLight, // #ffffff
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '900',
  },
  pressedToggle: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  starPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(27, 20, 58, 0.42)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  starPreviewCard: {
    alignItems: 'center',
    backgroundColor: '#FBF9FF',
    borderRadius: 30,
    paddingBottom: 22,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#6B58D2',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    width: 310,
  },
  starPreviewEyebrow: {
    color: '#7B70AA',
    fontFamily: 'Pretendard-Medium',
    letterSpacing: 0.35,
  },
  starPreviewTitle: {
    color: '#5145AA',
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '400',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  starPreviewHalo: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 82,
    height: 164,
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    width: 164,
  },
  starPreviewImage: {
    height: 130,
    width: 130,
  },
  starPreviewLabel: {
    color: '#4D438F',
    fontFamily: 'Pretendard-Medium',
    marginTop: 12,
  },
  starPreviewConfirm: {
    alignItems: 'center',
    backgroundColor: '#7662DF',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    marginTop: 17,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    width: '100%',
  },
  starPreviewConfirmText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-Medium',
    letterSpacing: 0.2,
  },
  modeDetailOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(45, 37, 91, 0.28)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modeDetailCard: {
    backgroundColor: '#F9F7FE',
    borderRadius: 30,
    maxWidth: 360,
    paddingBottom: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    width: '100%',
  },
  darkModeDetailCard: {
    backgroundColor: '#211a39',
  },
  modeDetailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeDetailEyebrow: {
    color: '#8A81B8',
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.35,
    lineHeight: 18,
  },
  modeDetailTitle: {
    color: '#5D51C2',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.25,
    lineHeight: 29,
  },
  modeDetailClose: {
    alignItems: 'center',
    backgroundColor: '#EEE9FA',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  modeDetailCloseText: {
    color: '#675DB0',
    fontFamily: 'Pretendard',
    fontSize: 25,
    fontWeight: '300',
    lineHeight: 27,
  },
  modeDetailVisual: {
    alignItems: 'center',
    backgroundColor: '#F0EBFB',
    borderRadius: 24,
    height: 188,
    justifyContent: 'center',
    marginTop: 18,
    overflow: 'hidden',
  },
  modeDetailConstellation: {
    height: 174,
    width: 150,
  },
  modeDetailPlanet: {
    height: 154,
    width: 154,
  },
  modeDetailDescription: {
    color: '#6F6796',
    fontFamily: 'Pretendard',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.25,
    lineHeight: 21,
    marginTop: 16,
  },
  modeDetailSkipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeDetailSkipBox: {
    alignItems: 'center',
    borderColor: '#CBBEFF',
    borderRadius: 7,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  modeDetailSkipBoxChecked: {
    backgroundColor: '#7C67E8',
    borderColor: '#7C67E8',
  },
  modeDetailSkipCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  modeDetailSkipText: {
    color: '#6F6796',
    fontFamily: 'Pretendard',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.18,
  },
  modeDetailProgress: {
    color: '#6957C8',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 8,
    textAlign: 'center',
  },
  modeDetailSteps: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 17,
  },
  modeDetailStep: {
    alignItems: 'center',
    backgroundColor: '#F1EDFA',
    borderRadius: 16,
    flex: 1,
    minHeight: 76,
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  modeDetailStepNumber: {
    color: '#7768D2',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
  modeDetailStepText: {
    color: '#665D91',
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 15,
    marginTop: 5,
    textAlign: 'center',
  },
  modeDetailConfirmButton: {
    marginTop: 18,
  },
  modeDetailConfirmText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  celebrationOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(55, 44, 108, 0.22)',
    flex: 1,
    justifyContent: 'center',
  },
  celebrationContent: {
    alignItems: 'center',
    backgroundColor: '#F9F7FE',
    borderRadius: 34,
    minHeight: 260,
    justifyContent: 'center',
    paddingHorizontal: 28,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    width: 300,
  },
  celebrationStar: {
    height: 148,
    width: 148,
  },
  celebrationSparkle: {
    height: 36,
    position: 'absolute',
    top: 64,
    width: 36,
  },
  celebrationSparkleLeft: {
    left: 38,
    transform: [{ rotate: '-14deg' }],
  },
  celebrationSparkleRight: {
    right: 42,
    transform: [{ rotate: '13deg' }],
  },
  celebrationTitle: {
    color: '#5D51C2',
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.45,
    lineHeight: 30,
    marginTop: 4,
  },
  celebrationBody: {
    color: '#8077A9',
    fontFamily: 'Pretendard',
    fontWeight: '400',
    letterSpacing: 0.22,
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
