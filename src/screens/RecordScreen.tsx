import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveDream, getSavedDreams } from '../utils/dreamStorage';
import { RecordKeywordSelector } from '../components/RecordKeywordSelector';
import { RecordModeSelector } from '../components/RecordModeSelector';
import { RecordMoodSelector } from '../components/RecordMoodSelector';
import { theme } from '../theme';
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
import type {
  DreamKeyword,
  DreamMood,
  DreamMoodId,
  RecordActionPayload,
  RecordModeId,
} from '../types/record';
import { HomeTabId } from '../types/home';

type RecordScreenProps = {
  active?: boolean;
  targetDate?: string;
  onBack?: () => void;
  onSaveDraft?: (payload: RecordActionPayload) => void;
  onSubmit?: (payload: RecordActionPayload) => void;
  onTabPress?: (tabId: HomeTabId) => void;
};

const backIcon = require('../../assets/record/back-icon.png');
const headerCloud = require('../../assets/record/header-cloud.png');
const heroSun = require('../../assets/record/hero-sun.png');
const heroPlanet = require('../../assets/record/hero-planet.png');
const heroCloud = require('../../assets/record/hero-cloud.png');
const yellowStarIcon = require('../../assets/record/hero-planet-or-cloud.png');

const noop = () => {};

export function RecordScreen({
  active,
  targetDate,
  onBack = noop,
  onSaveDraft,
  onSubmit,
}: RecordScreenProps) {
  const { width } = useWindowDimensions();
  const screenWidth = Math.min(width, RECORD_DESIGN_WIDTH);
  const contentScale = Math.min(1, Math.max(0.84, screenWidth / RECORD_DESIGN_WIDTH));
  const contentWidth = RECORD_DESIGN_WIDTH;
  const entrance = useRef(new Animated.Value(0)).current;

  const subtitleText = useMemo(() => {
    if (!targetDate || typeof targetDate !== 'string') return '오늘의 꿈을 기록해요';
    const parts = targetDate.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return `${month}월 ${day}일의 꿈을 기록해요`;
    }
    return '오늘의 꿈을 기록해요';
  }, [targetDate]);

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

  const [mode, setMode] = useState<RecordModeId>('planet');
  const [title, setTitle] = useState('');
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>(
    RECORD_INITIAL_SELECTED_KEYWORDS,
  );
  const [showMoreKeywords, setShowMoreKeywords] = useState(false);
  const [selectedMoodIds, setSelectedMoodIds] = useState<DreamMoodId[]>([]);
  const [memo, setMemo] = useState('');

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
          setAllMoods(JSON.parse(storedMoods));
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
    setTitle('');
    setSelectedKeywordIds(RECORD_INITIAL_SELECTED_KEYWORDS);
    setShowMoreKeywords(false);
    setSelectedMoodIds([]);
    setMemo('');
    setMode('planet');
  }, []);

  // targetDate가 설정된 경우 해당 날짜의 기존 꿈 기록을 로드하여 폼 채우기 (수정 모드)
  useEffect(() => {
    if (active && targetDate) {
      const loadExistingDream = async () => {
        try {
          const dreamsList = await getSavedDreams();
          const existing = dreamsList.find((d) => d.date === targetDate);
          if (existing) {
            setTitle(existing.title || '');
            setSelectedKeywordIds(existing.selectedKeywordIds || []);
            setSelectedMoodIds(existing.selectedMoodIds || []);
            setMemo(existing.memo || '');
            setMode(existing.mode || 'planet');
          } else {
            resetForm();
          }
        } catch (e) {
          console.error('Failed to load existing dream for targetDate:', e);
        }
      };
      loadExistingDream();
    } else if (active) {
      resetForm();
    }
  }, [active, targetDate, resetForm]);

  // Entrance animation
  useEffect(() => {
    if (active !== false) {
      entrance.setValue(0);
      Animated.timing(entrance, {
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [active, entrance]);

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

  const handleSubmitPress = async () => {
    try {
      await saveDream(payload(), undefined, targetDate);
    } catch (e) {
      console.error('Failed to save dream:', e);
    }
    onSubmit?.(payload());
    resetForm();
  };

  const animatedContentStyle = {
    opacity: entrance,
    transform: [
      { scale: contentScale },
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <ScrollView
          ref={scrollViewRef}
          automaticallyAdjustKeyboardInsets={true}
          bounces
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          testID="record-screen-scroll"
        >
          <Animated.View
            style={[
              styles.designCanvas,
              { width: contentWidth },
              animatedContentStyle,
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

              <Text style={styles.headerTitle}>꿈 기록하기</Text>
              <View style={styles.subtitleRow}>
                <View style={styles.spacer} />
                <Text style={styles.headerSubtitle}>{subtitleText}</Text>
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
                  options={RECORD_MODE_OPTIONS}
                />
              </View>
            </View>

            {/* Title Input Card (Modified to fix vertically center align issue) */}
            <Card style={styles.titleInputCard} padding={0} shadow={true}>
              <Input
                accessibilityLabel="꿈 제목"
                maxLength={RECORD_LIMITS.title}
                onChangeText={setTitle}
                placeholder="꿈 제목을 입력해 주세요."
                placeholderTextColor={theme.colors.inputPlaceholder}
                value={title}
                rightLabel={`${title.length}/${RECORD_LIMITS.title}`}
                inputStyle={styles.titleInputStyle}
                style={styles.titleInputContainer}
              />
            </Card>

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
              />
            </View>

            <View style={styles.moodSection}>
              <RecordMoodSelector
                moods={allMoods}
                onSelectMood={handleSelectMood}
                selectedMoodIds={selectedMoodIds}
                onAddMood={handleAddMood}
                onDeleteMood={handleDeleteMood}
              />
            </View>

            <Card style={styles.memoCard} padding={16} shadow={true}>
              <View style={styles.memoHeader}>
                <Text style={styles.memoTitle}>4. 간단한 메모</Text>
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
                border={true}
                minHeight={24}
                style={styles.memoInputContainer}
              />
            </Card>

            {/* Reverted back to the original standard action buttons and animation style */}
            <View style={styles.actionRow}>
              <Button
                variant="secondary"
                label="임시저장"
                onPress={handleSaveDraft}
                icon={
                  <View style={styles.saveIcon}>
                    <View style={styles.saveIconLine} />
                    <View style={[styles.saveIconLine, styles.saveIconSecondLine]} />
                  </View>
                }
                style={styles.actionBtn}
                testID="record-save-draft-button"
              />

              <Button
                variant="primary"
                label="기록 완료"
                onPress={handleSubmitPress}
                style={styles.actionBtn}
                testID="record-submit-button"
              />
            </View>
          </Animated.View>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.bgWhite,
    flex: 1,
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
    height: 214,
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
  titleInputCard: {
    alignSelf: 'center',
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, // 15
    borderWidth: 1,
    height: 48,
    marginTop: 0,
    width: 345,
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
    marginTop: 11,
  },
  moodSection: {
    marginTop: theme.spacing.layoutSm, // 24
  },
  memoCard: {
    alignSelf: 'center',
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.lg, // 15
    borderWidth: 1,
    minHeight: 76,
    paddingBottom: theme.spacing.lg, // 10
    paddingHorizontal: theme.spacing.xxl, // 16
    paddingTop: theme.spacing.md, // 8
    width: 345,
    marginTop: 42,
  },
  memoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: theme.spacing.sm, // 7 (using sm=6 or approx 7)
  },
  memoTitle: {
    color: theme.colors.memoTitle, // #25218a
    fontSize: theme.typography.sizes.bodySmall, // 13
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.bold, // '800'
    includeFontPadding: false,
    lineHeight: 21,
  },
  memoOptional: {
    color: theme.colors.textMuted, // #8a82ad
    fontSize: theme.typography.sizes.labelSmall, // 11
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.weights.regular, // '400'
    includeFontPadding: false,
    lineHeight: 21,
    marginLeft: theme.spacing.sm, // 6
  },
  memoInputContainer: {
    minHeight: 31,
  },
  actionRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 39,
    marginTop: 42,
    width: 339,
  },
  actionBtn: {
    width: 150,
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
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
