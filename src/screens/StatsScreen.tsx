import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../theme';
import type { HomeTabId } from '../types/home';
import type { SavedDream } from '../types/record';
import { getSavedDreams, deleteDream } from '../utils/dreamStorage';
import {
  RECORD_MOODS,
  RECORD_PRIMARY_KEYWORDS,
  RECORD_EXTRA_KEYWORDS,
} from '../data/record';

type StatsScreenProps = {
  active?: boolean;
  onTabPress?: (tabId: HomeTabId) => void;
  onRecordPress?: (preselectedDate?: string) => void;
};

// 로컬 이미지 에셋
const backIcon = require('../../assets/record/back-icon.png');
const avatarImage = require('../../assets/home/parts/home-avatar.png');
const starIcon = require('../../assets/record/mode-star-icon.png');
const planetIcon = require('../../assets/record/mode-grid-icon.png');
const heroPlanetOrCloud = require('../../assets/record/hero-planet-or-cloud.png');
const recordCloud = require('../../assets/home/parts/home-record-cloud.png');

const TREND_DATA = [
  {
    name: '학교',
    color: '#7558f7',
    values: [11, 13, 14, 16, 18],
  },
  {
    name: '하늘',
    color: '#3498db',
    values: [9, 10, 12, 13, 16],
  },
  {
    name: '친구',
    color: '#e84393',
    values: [6, 7, 8, 10, 12],
  },
  {
    name: '시험',
    color: '#fdcb6e',
    values: [4, 5, 6, 7, 9],
  },
  {
    name: '집',
    color: '#2ecc71',
    values: [3, 3.5, 4.5, 5.5, 8],
  },
];

const getMoodEmoji = (moodId: string) => {
  switch (moodId) {
    case 'happy': return '😊';
    case 'calm': return '😌';
    case 'curious': return '🤔';
    case 'fear': return '😰';
    case 'sad': return '😢';
    default: return '✨';
  }
};

const getMoodColor = (moodId: string) => {
  switch (moodId) {
    case 'happy': return '#ffd66b';
    case 'calm': return '#94ddd0';
    case 'curious': return '#ffd56e';
    case 'fear': return '#ff8588';
    case 'sad': return '#9ec4f7';
    default: return '#f2f0ff';
  }
};

const getMoodLabel = (moodId: string) => {
  const found = RECORD_MOODS.find(m => m.id === moodId);
  return found ? found.label : moodId;
};

const getKeywordLabel = (id: string) => {
  const allKeywords = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
  const found = allKeywords.find(k => k.id === id);
  return found ? found.label : id;
};

export function StatsScreen({ active, onTabPress, onRecordPress }: StatsScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 달력 연/월 선택 상태
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  // 데이터 & 필터 상태
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all'); // all, favorite, planet, constellation, moodId
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [selectedDream, setSelectedDream] = useState<SavedDream | null>(null);

  // 꿈 기록 로드 함수
  const loadDreams = useCallback(async () => {
    const data = await getSavedDreams();
    const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
    setDreams(sorted);
  }, []);

  useEffect(() => {
    if (active) {
      loadDreams();
      setSelectedDream(null);
      
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        duration: 300,
        easing: Easing.out(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [active, fadeAnim, loadDreams]);

  // 애니메이션 스타일
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

  // 즐겨찾기 토글 처리 함수
  const handleToggleFavorite = async (dreamId: string) => {
    const updatedDreams = dreams.map((d) => {
      if (d.id === dreamId) {
        return { ...d, isFavorite: !d.isFavorite };
      }
      return d;
    });
    setDreams(updatedDreams);

    try {
      const allDreams = await getSavedDreams();
      const idx = allDreams.findIndex((d) => d.id === dreamId);
      if (idx !== -1) {
        allDreams[idx].isFavorite = !allDreams[idx].isFavorite;
        await AsyncStorage.setItem('@dreamlog_saved_dreams', JSON.stringify(allDreams));
      }
    } catch (e) {
      console.error('Failed to update favorite status:', e);
    }
  };

  // 꿈 기록 삭제 처리 함수
  const handleDeleteDream = (dreamId: string) => {
    Alert.alert(
      '꿈 기록 삭제',
      '정말로 이 꿈 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteDream(dreamId);
            setSelectedDream(null);
            loadDreams();
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 검색, 필터, 태그, 날짜 다중 필터링 로직
  const filteredDreams = useMemo(() => {
    return dreams.filter((dream) => {
      // 1. 검색어 필터링
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = dream.title?.toLowerCase().includes(query);
        const matchesMemo = dream.memo?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMemo) return false;
      }

      // 2. 드롭다운 대분류 필터링
      if (activeFilter === 'favorite') {
        if (!dream.isFavorite) return false;
      } else if (activeFilter === 'planet') {
        if (dream.mode !== 'planet') return false;
      } else if (activeFilter === 'constellation') {
        if (dream.mode !== 'constellation') return false;
      } else if (['happy', 'calm', 'curious', 'fear', 'sad'].includes(activeFilter)) {
        if (!dream.selectedMoodIds?.includes(activeFilter)) return false;
      }

      // 3. 태그 필터링 (다중 선택 시 교집합)
      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((tagId) =>
          dream.selectedKeywordIds?.includes(tagId)
        );
        if (!hasAllTags) return false;
      }

      // 4. 달력 선택 날짜 필터링
      if (selectedDateFilter) {
        if (dream.date !== selectedDateFilter) return false;
      }

      return true;
    });
  }, [dreams, searchQuery, activeFilter, selectedTags, selectedDateFilter]);

  // 실제로 작성된 꿈 기록들에 사용된 키워드 태그만 필터링하여 노출 (동적 태그 구성)
  const dreamKeywords = useMemo(() => {
    const keywordIds = new Set<string>();
    dreams.forEach((dream) => {
      dream.selectedKeywordIds?.forEach((id) => keywordIds.add(id));
    });

    const allPredefined = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
    if (keywordIds.size === 0) {
      return RECORD_PRIMARY_KEYWORDS.slice(0, 6);
    }
    return allPredefined.filter((k) => keywordIds.has(k.id));
  }, [dreams]);

  // 달력에 꿈 표시 매핑용
  const dreamsByDate = useMemo(() => {
    const map: Record<string, SavedDream[]> = {};
    dreams.forEach((dream) => {
      if (!map[dream.date]) {
        map[dream.date] = [];
      }
      map[dream.date].push(dream);
    });
    return map;
  }, [dreams]);

  // 달력 일 수 계산
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // 달력 시작 요일 계산 (0: 일요일, 6: 토요일)
  const startDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1).getDay();
  }, [currentYear, currentMonth]);

  // 달력 셀 그리드 데이터 생성
  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayNum: number | null }[] = [];

    // 앞쪽 빈 셀 채우기
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ dateStr: '', dayNum: null });
    }

    // 일자 채우기
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      cells.push({ dateStr, dayNum: day });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, startDayOfWeek]);

  // 달력 월 변경 핸들러
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDateFilter(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDateFilter(null);
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDateFilter(null);
  };

  // 날짜 셀 클릭 시 목록 필터링 핸들러
  const handleCellPress = (dateStr: string, dayNum: number | null) => {
    if (!dayNum) return;
    if (selectedDateFilter === dateStr) {
      setSelectedDateFilter(null);
    } else {
      setSelectedDateFilter(dateStr);
    }
  };

  // 키워드 태그 선택 처리 핸들러
  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      return [...prev, tagId];
    });
  };

  // 모든 필터 초기화
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setActiveFilter('all');
    setSelectedDateFilter(null);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedTags.length > 0 || activeFilter !== 'all' || selectedDateFilter
  );

  const filterOptions = [
    { id: 'all', label: '모든 꿈 기록', icon: '📁' },
    { id: 'favorite', label: '즐겨찾기만', icon: '⭐' },
    { id: 'planet', label: '행성계 모드', icon: '🪐' },
    { id: 'constellation', label: '별자리 모드', icon: '👑' },
    { id: 'happy', label: '행복한 꿈', icon: '😊' },
    { id: 'calm', label: '평온한 꿈', icon: '😌' },
    { id: 'curious', label: '신기한 꿈', icon: '🤔' },
    { id: 'fear', label: '두려운 꿈', icon: '😰' },
    { id: 'sad', label: '슬픈 꿈', icon: '😢' },
  ];

  const currentFilterLabel = filterOptions.find(o => o.id === activeFilter)?.label || '필터';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => onTabPress?.('home')}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Image source={backIcon} style={styles.backIconImage} resizeMode="contain" />
        </Pressable>
        <View style={styles.avatarContainer}>
          <Image source={avatarImage} style={styles.avatarImage} />
        </View>
      </View>

      <ScrollView
        bounces
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          
          {/* 달력 카드 섹션 */}
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={handlePrevMonth} style={({ pressed }) => [styles.navArrow, pressed && styles.pressed]}>
                <Ionicons name="chevron-back" size={16} color="#7558f7" />
              </Pressable>
              <Text style={styles.calendarTitle}>
                {currentYear}년 {currentMonth}월
              </Text>
              <Pressable onPress={handleNextMonth} style={({ pressed }) => [styles.navArrow, pressed && styles.pressed]}>
                <Ionicons name="chevron-forward" size={16} color="#7558f7" />
              </Pressable>
            </View>

            {/* 요일 헤더 */}
            <View style={styles.weekdaysRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <Text key={i} style={[styles.weekdayText, i === 0 && styles.sundayText, i === 6 && styles.saturdayText]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* 일자 그리드 */}
            <View style={styles.daysGrid}>
              {calendarCells.map((cell, index) => {
                const isSelected = selectedDateFilter === cell.dateStr;
                const dateDreams = cell.dayNum ? dreamsByDate[cell.dateStr] : null;
                const hasDream = dateDreams && dateDreams.length > 0;
                
                const isToday = Boolean(
                  cell.dayNum &&
                  today.getFullYear() === currentYear &&
                  today.getMonth() + 1 === currentMonth &&
                  today.getDate() === cell.dayNum
                );

                const showDot = hasDream && (cell.dayNum === 15 || cell.dayNum === 16);
                const showIcon = hasDream && !showDot;
                const firstDream = dateDreams ? dateDreams[0] : null;

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleCellPress(cell.dateStr, cell.dayNum)}
                    disabled={!cell.dayNum}
                    style={styles.cell}
                  >
                    {cell.dayNum && (
                      <View style={styles.cellContent}>
                        <View style={styles.dateRow}>
                          <View
                            style={[
                              styles.dateTextWrapper,
                              (isSelected || isToday) ? styles.selectedWrapper : null
                            ]}
                          >
                            <Text
                              style={[
                                styles.dateText,
                                (isSelected || isToday) ? styles.selectedDateText : null
                              ]}
                            >
                              {cell.dayNum}
                            </Text>
                          </View>
                          {showDot && (
                            <View style={styles.dotIndicator} />
                          )}
                        </View>
                        <View style={styles.markerContainer}>
                          {showIcon && firstDream && (
                            <Image
                              source={firstDream.mode === 'planet' ? planetIcon : starIcon}
                              style={styles.dreamMarker}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 통계 대시보드 (날짜 필터 미적용 시에만 노출) */}
          {!selectedDateFilter && (
            <View style={styles.dashboardContainer}>
              {/* Row 1: 감정 분포 & 연속 기록 */}
              <View style={styles.dashboardRow}>
                {/* 감정 분포 카드 */}
                <View style={[styles.dashboardCard, styles.halfCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardEmojiTitle}>
                      <Ionicons name="sad-outline" size={16} color="#7558f7" /> 감정 분포
                    </Text>
                  </View>
                  <View style={styles.donutContainer}>
                    <View style={styles.donutCircle}>
                      <Image source={recordCloud} style={styles.donutCloud} resizeMode="contain" />
                    </View>
                  </View>
                  <View style={styles.moodLegendsGrid}>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#ffd66b' }]} />
                      <Text style={styles.legendText}>행복 32%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#94ddd0' }]} />
                      <Text style={styles.legendText}>평온함 24%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#ff8588' }]} />
                      <Text style={styles.legendText}>불안 18%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#ffd56e' }]} />
                      <Text style={styles.legendText}>신기함 14%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#9ec4f7' }]} />
                      <Text style={styles.legendText}>슬픔 8%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#c2bbdf' }]} />
                      <Text style={styles.legendText}>기타 4%</Text>
                    </View>
                  </View>
                  <View style={styles.moodInsightBox}>
                    <Text style={styles.moodInsightText}>
                      행복과 평온함이 전체 감정의 <Text style={styles.boldInsight}>56%</Text>를 차지해요. 마음이 안정되고 긍정적인 시간이 많았어요.
                    </Text>
                  </View>
                </View>

                {/* 연속 기록 카드 */}
                <View style={[styles.dashboardCard, styles.halfCard, styles.streakCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardEmojiTitle}>
                      <Ionicons name="calendar-outline" size={16} color="#7558f7" /> 연속 기록
                    </Text>
                  </View>
                  
                  <View style={styles.streakValueRow}>
                    <View>
                      <Text style={styles.streakNumberText}>7일</Text>
                    </View>
                    <Image source={heroPlanetOrCloud} style={styles.streakPlanetImage} resizeMode="contain" />
                  </View>

                  <View style={styles.checkCirclesRow}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <View key={day} style={styles.checkCircleItem}>
                        <View style={styles.checkCircleActive}>
                          <Ionicons name="checkmark" size={10} color="#ffffff" />
                        </View>
                        <Text style={styles.checkCircleLabel}>{day}일</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.streakTipText}>
                    매일의 기록이 당신의 꿈을 더 가까이 데려다줄 거예요.
                  </Text>
                </View>
              </View>

              {/* Row 2: 키워드 트렌드 (Full Width) */}
              <View style={[styles.dashboardCard, styles.fullWidthCard]}>
                <View style={styles.cardHeaderRowSpace}>
                  <Text style={styles.cardEmojiTitle}>
                    <Ionicons name="trending-up-outline" size={16} color="#7558f7" /> 키워드 트렌드
                  </Text>
                  <View style={styles.periodDropdown}>
                    <Text style={styles.periodDropdownText}>최근 4주 ▾</Text>
                  </View>
                </View>

                <View style={styles.trendLegendsRow}>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.colorDotSmall, { backgroundColor: '#7558f7' }]} />
                    <Text style={styles.legendText}>학교</Text>
                  </View>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.colorDotSmall, { backgroundColor: '#3498db' }]} />
                    <Text style={styles.legendText}>하늘</Text>
                  </View>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.colorDotSmall, { backgroundColor: '#e84393' }]} />
                    <Text style={styles.legendText}>친구</Text>
                  </View>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.colorDotSmall, { backgroundColor: '#fdcb6e' }]} />
                    <Text style={styles.legendText}>시험</Text>
                  </View>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.colorDotSmall, { backgroundColor: '#2ecc71' }]} />
                    <Text style={styles.legendText}>집</Text>
                  </View>
                </View>

                {/* 라인 차트 시뮬레이션 */}
                <View style={styles.chartContainer}>
                  {/* Grid Lines */}
                  {[20, 15, 10, 5, 0].map((val, idx) => (
                    <View key={idx} style={styles.chartGridLine}>
                      <Text style={styles.chartYLabel}>{val}</Text>
                      <View style={styles.dashedGridLine} />
                    </View>
                  ))}
                  
                  {/* Simulated Line Plots using absolute positioned layers */}
                  <View style={styles.chartLinesLayer}>
                    {/* 학교 (purple) */}
                    <View style={[styles.chartLineDot, { left: 40, bottom: 45, backgroundColor: '#7558f7' }]} />
                    <View style={[styles.chartLineDot, { left: 100, bottom: 55, backgroundColor: '#7558f7' }]} />
                    <View style={[styles.chartLineDot, { left: 160, bottom: 65, backgroundColor: '#7558f7' }]} />
                    <View style={[styles.chartLineDot, { left: 220, bottom: 78, backgroundColor: '#7558f7' }]} />
                    <View style={[styles.chartLineDot, { left: 280, bottom: 92, backgroundColor: '#7558f7' }]} />

                    {/* 하늘 (blue) */}
                    <View style={[styles.chartLineDot, { left: 40, bottom: 32, backgroundColor: '#3498db' }]} />
                    <View style={[styles.chartLineDot, { left: 100, bottom: 40, backgroundColor: '#3498db' }]} />
                    <View style={[styles.chartLineDot, { left: 160, bottom: 52, backgroundColor: '#3498db' }]} />
                    <View style={[styles.chartLineDot, { left: 220, bottom: 58, backgroundColor: '#3498db' }]} />
                    <View style={[styles.chartLineDot, { left: 280, bottom: 78, backgroundColor: '#3498db' }]} />

                    {/* 친구 (pink) */}
                    <View style={[styles.chartLineDot, { left: 40, bottom: 18, backgroundColor: '#e84393' }]} />
                    <View style={[styles.chartLineDot, { left: 100, bottom: 22, backgroundColor: '#e84393' }]} />
                    <View style={[styles.chartLineDot, { left: 160, bottom: 20, backgroundColor: '#e84393' }]} />
                    <View style={[styles.chartLineDot, { left: 220, bottom: 38, backgroundColor: '#e84393' }]} />
                    <View style={[styles.chartLineDot, { left: 280, bottom: 54, backgroundColor: '#e84393' }]} />

                    {/* 시험 (orange) */}
                    <View style={[styles.chartLineDot, { left: 40, bottom: 8, backgroundColor: '#fdcb6e' }]} />
                    <View style={[styles.chartLineDot, { left: 100, bottom: 12, backgroundColor: '#fdcb6e' }]} />
                    <View style={[styles.chartLineDot, { left: 160, bottom: 18, backgroundColor: '#fdcb6e' }]} />
                    <View style={[styles.chartLineDot, { left: 220, bottom: 22, backgroundColor: '#fdcb6e' }]} />
                    <View style={[styles.chartLineDot, { left: 280, bottom: 32, backgroundColor: '#fdcb6e' }]} />

                    {/* 집 (green) */}
                    <View style={[styles.chartLineDot, { left: 40, bottom: 5, backgroundColor: '#2ecc71' }]} />
                    <View style={[styles.chartLineDot, { left: 100, bottom: 8, backgroundColor: '#2ecc71' }]} />
                    <View style={[styles.chartLineDot, { left: 160, bottom: 12, backgroundColor: '#2ecc71' }]} />
                    <View style={[styles.chartLineDot, { left: 220, bottom: 18, backgroundColor: '#2ecc71' }]} />
                    <View style={[styles.chartLineDot, { left: 280, bottom: 25, backgroundColor: '#2ecc71' }]} />
                  </View>
                </View>

                {/* X Axis Labels */}
                <View style={styles.chartXLabelsRow}>
                  <Text style={styles.chartXLabel}>4주 전</Text>
                  <Text style={styles.chartXLabel}>3주 전</Text>
                  <Text style={styles.chartXLabel}>2주 전</Text>
                  <Text style={styles.chartXLabel}>1주 전</Text>
                  <Text style={styles.chartXLabel}>이번 주</Text>
                </View>

                {/* 순위별 가로 프로그레스 바 목록 */}
                <View style={styles.rankList}>
                  {/* Rank 1: 학교 */}
                  <View style={styles.rankItem}>
                    <View style={[styles.rankNumberBadge, { backgroundColor: '#f0ecff' }]}>
                      <Text style={[styles.rankNumberText, { color: '#7558f7' }]}>1</Text>
                    </View>
                    <Text style={styles.rankEmoji}>🏫</Text>
                    <Text style={styles.rankKeyword}>학교</Text>
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFilled, { width: '85%', backgroundColor: '#7558f7' }]} />
                    </View>
                    <Text style={styles.rankCount}>18</Text>
                  </View>

                  {/* Rank 2: 하늘 */}
                  <View style={styles.rankItem}>
                    <View style={[styles.rankNumberBadge, { backgroundColor: '#e8f4fd' }]}>
                      <Text style={[styles.rankNumberText, { color: '#3498db' }]}>2</Text>
                    </View>
                    <Text style={styles.rankEmoji}>☁️</Text>
                    <Text style={styles.rankKeyword}>하늘</Text>
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFilled, { width: '75%', backgroundColor: '#3498db' }]} />
                    </View>
                    <Text style={styles.rankCount}>16</Text>
                  </View>

                  {/* Rank 3: 친구 */}
                  <View style={styles.rankItem}>
                    <View style={[styles.rankNumberBadge, { backgroundColor: '#fdf0f5' }]}>
                      <Text style={[styles.rankNumberText, { color: '#e84393' }]}>3</Text>
                    </View>
                    <Text style={styles.rankEmoji}>👥</Text>
                    <Text style={styles.rankKeyword}>친구</Text>
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFilled, { width: '55%', backgroundColor: '#e84393' }]} />
                    </View>
                    <Text style={styles.rankCount}>12</Text>
                  </View>

                  {/* Rank 4: 시험 */}
                  <View style={styles.rankItem}>
                    <View style={[styles.rankNumberBadge, { backgroundColor: '#fef7eb' }]}>
                      <Text style={[styles.rankNumberText, { color: '#fdcb6e' }]}>4</Text>
                    </View>
                    <Text style={styles.rankEmoji}>📝</Text>
                    <Text style={styles.rankKeyword}>시험</Text>
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFilled, { width: '40%', backgroundColor: '#fdcb6e' }]} />
                    </View>
                    <Text style={styles.rankCount}>9</Text>
                  </View>

                  {/* Rank 5: 집 */}
                  <View style={styles.rankItem}>
                    <View style={[styles.rankNumberBadge, { backgroundColor: '#ebf9f0' }]}>
                      <Text style={[styles.rankNumberText, { color: '#2ecc71' }]}>5</Text>
                    </View>
                    <Text style={styles.rankEmoji}>🏠</Text>
                    <Text style={styles.rankKeyword}>집</Text>
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFilled, { width: '35%', backgroundColor: '#2ecc71' }]} />
                    </View>
                    <Text style={styles.rankCount}>8</Text>
                  </View>
                </View>
              </View>

              {/* Row 3: 인사이트 & 시간대별 기록 분포 */}
              <View style={styles.dashboardRow}>
                {/* 인사이트 카드 */}
                <View style={[styles.dashboardCard, styles.halfCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardEmojiTitle}>
                      <Ionicons name="bulb-outline" size={16} color="#7558f7" /> 인사이트
                    </Text>
                  </View>

                  <View style={styles.insightsList}>
                    {/* Insight 1 */}
                    <View style={styles.insightItemCard}>
                      <View style={styles.insightIconWrapper}>
                        <Ionicons name="school" size={14} color="#7558f7" />
                      </View>
                      <View style={styles.insightContent}>
                        <Text style={styles.insightTitleText} numberOfLines={1}>학교 키워드가 자주 나와요</Text>
                        <Text style={styles.insightDescText} numberOfLines={1}>학교에 대한 생각이 꿈에 자주 나타나요.</Text>
                      </View>
                    </View>

                    {/* Insight 2 */}
                    <View style={styles.insightItemCard}>
                      <View style={[styles.insightIconWrapper, { backgroundColor: '#eef8ff' }]}>
                        <Ionicons name="checkmark-circle" size={14} color="#3498db" />
                      </View>
                      <View style={styles.insightContent}>
                        <Text style={styles.insightTitleText} numberOfLines={1}>주 3회 이상 꿈일기 기록 중</Text>
                        <Text style={styles.insightDescText} numberOfLines={1}>꾸준한 기록이 좋은 습관으로 이어져요.</Text>
                      </View>
                    </View>

                    {/* Insight 3 */}
                    <View style={styles.insightItemCard}>
                      <View style={[styles.insightIconWrapper, { backgroundColor: '#fff9e6' }]}>
                        <Ionicons name="moon" size={14} color="#f1c40f" />
                      </View>
                      <View style={styles.insightContent}>
                        <Text style={styles.insightTitleText} numberOfLines={1}>밤 11시~1시에 주로 기록</Text>
                        <Text style={styles.insightDescText} numberOfLines={1}>하루를 마무리하며 기록하는 시간이에요.</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 시간대별 기록 분포 카드 (Heatmap) */}
                <View style={[styles.dashboardCard, styles.halfCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardEmojiTitle}>
                      <Ionicons name="time-outline" size={16} color="#7558f7" /> 시간대별 기록
                    </Text>
                  </View>

                  <View style={styles.heatmapTable}>
                    {/* Day Headers */}
                    <View style={styles.heatmapWeekdaysRow}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                        <Text key={i} style={styles.heatmapWeekdayText}>{d}</Text>
                      ))}
                    </View>

                    {/* Heatmap Grid Rows */}
                    {[
                      { label: '00-03', pattern: [3, 1, 0, 3, 1, 2, 4] },
                      { label: '03-06', pattern: [1, 2, 2, 3, 2, 3, 3] },
                      { label: '06-09', pattern: [0, 1, 0, 1, 1, 0, 1] },
                      { label: '09-12', pattern: [1, 0, 1, 0, 1, 1, 0] },
                      { label: '12-15', pattern: [1, 1, 0, 1, 0, 0, 0] },
                      { label: '15-18', pattern: [0, 0, 1, 0, 1, 1, 0] },
                      { label: '18-21', pattern: [1, 1, 2, 1, 2, 1, 2] },
                      { label: '21-24', pattern: [2, 2, 3, 2, 3, 2, 3] },
                    ].map((row, rowIdx) => (
                      <View key={rowIdx} style={styles.heatmapRow}>
                        <Text style={styles.heatmapLabel}>{row.label}</Text>
                        <View style={styles.heatmapCells}>
                          {row.pattern.map((val, cellIdx) => {
                            let cellBg = '#f2effa';
                            if (val === 1) cellBg = '#ded7ff';
                            else if (val === 2) cellBg = '#b8a6ff';
                            else if (val === 3) cellBg = '#8b6eff';
                            else if (val === 4) cellBg = '#6236ff';
                            return (
                              <View
                                key={cellIdx}
                                style={[styles.heatmapCell, { backgroundColor: cellBg }]}
                              />
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Heatmap Legend */}
                  <View style={styles.heatmapLegendRow}>
                    <View style={styles.heatmapLegendItem}>
                      <View style={[styles.legendBox, { backgroundColor: '#f2effa' }]} />
                      <Text style={styles.legendLabel}>없음</Text>
                    </View>
                    <View style={styles.heatmapLegendItem}>
                      <View style={[styles.legendBox, { backgroundColor: '#ded7ff' }]} />
                      <Text style={styles.legendLabel}>적음</Text>
                    </View>
                    <View style={styles.heatmapLegendItem}>
                      <View style={[styles.legendBox, { backgroundColor: '#8b6eff' }]} />
                      <Text style={styles.legendLabel}>많음</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 검색 및 필터 바 */}
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setSelectedDateFilter(null);
                }}
                placeholder="꿈 제목 또는 내용 검색"
                placeholderTextColor={theme.colors.placeholder}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchText}>×</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => setShowFilterMenu(!showFilterMenu)}
              style={({ pressed }) => [
                styles.filterBtn,
                activeFilter !== 'all' && styles.filterBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterBtnText, activeFilter !== 'all' && styles.filterBtnTextActive]}>
                {activeFilter !== 'all' ? currentFilterLabel : '🔻 필터'}
              </Text>
            </Pressable>
          </View>

          {/* 필터 드롭다운 목록 */}
          {showFilterMenu && (
            <View style={styles.filterDropdown}>
              <Text style={styles.dropdownTitle}>기록 필터 설정</Text>
              <View style={styles.dropdownGrid}>
                {filterOptions.map((opt) => {
                  const isSelected = activeFilter === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        setActiveFilter(opt.id);
                        setShowFilterMenu(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemActive,
                      ]}
                    >
                      <Text style={styles.dropdownItemIcon}>{opt.icon}</Text>
                      <Text style={[styles.dropdownItemLabel, isSelected && styles.dropdownItemLabelActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 가로 스크롤 키워드 칩 */}
          <View style={styles.tagsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
              {dreamKeywords.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => handleTagToggle(tag.id)}
                    style={({ pressed }) => [
                      styles.tagChip,
                      isSelected && styles.tagChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                      #{tag.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 필터 리셋 안내 배너 */}
          {hasActiveFilters && (
            <View style={styles.filterBanner}>
              <Text style={styles.filterBannerText}>
                필터 적용 중 ({filteredDreams.length}개 발견)
              </Text>
              <Pressable onPress={handleClearAllFilters} style={styles.clearAllBtn}>
                <Text style={styles.clearAllBtnText}>초기화 ×</Text>
              </Pressable>
            </View>
          )}

          {/* 꿈 기록 목록 타이틀 */}
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              {selectedDateFilter
                ? `${selectedDateFilter.split('-')[1]}월 ${selectedDateFilter.split('-')[2]}일 꿈 기록`
                : '꿈 기록 목록'}
            </Text>
            <Text style={styles.listHeaderCount}>총 {filteredDreams.length}개</Text>
          </View>

          {/* 꿈 카드 리스트 */}
          {filteredDreams.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🌌</Text>
              <Text style={styles.emptyTitle}>일치하는 꿈 기록이 없어요</Text>
              <Text style={styles.emptyDesc}>
                필터 조건을 조정하거나 새로운 꿈을 기록해 보세요.
              </Text>
            </View>
          ) : (
            <View style={styles.dreamList}>
              {filteredDreams.map((dream) => {
                const firstMood = dream.selectedMoodIds?.[0] || 'happy';
                return (
                  <Pressable
                    key={dream.id}
                    onPress={() => setSelectedDream(dream)}
                    style={({ pressed }) => [
                      styles.dreamCard,
                      pressed && styles.dreamCardPressed,
                    ]}
                  >
                    {/* 감정 뱃지 */}
                    <View style={[styles.moodBadge, { backgroundColor: getMoodColor(firstMood) }]}>
                      <Text style={styles.moodBadgeEmoji}>{getMoodEmoji(firstMood)}</Text>
                    </View>

                    {/* 꿈 텍스트 내용 */}
                    <View style={styles.dreamCardContent}>
                      <View style={styles.dreamCardHeader}>
                        <Text style={styles.dreamCardTitle} numberOfLines={1}>
                          {dream.title}
                        </Text>
                      </View>
                      
                      <Text style={styles.dreamCardSub}>
                        {dream.date} · {dream.mode === 'planet' ? '🪐 행성계' : '👑 별자리'}
                      </Text>

                      {/* 키워드 나열 */}
                      {dream.selectedKeywordIds && dream.selectedKeywordIds.length > 0 && (
                        <View style={styles.dreamCardKeywords}>
                          {dream.selectedKeywordIds.slice(0, 3).map((kwId) => (
                            <View key={kwId} style={styles.keywordPill}>
                              <Text style={styles.keywordPillText}>
                                #{getKeywordLabel(kwId)}
                              </Text>
                            </View>
                          ))}
                          {dream.selectedKeywordIds.length > 3 && (
                            <Text style={styles.moreKeywordsIndicator}>
                              +{dream.selectedKeywordIds.length - 3}
                            </Text>
                          )}
                        </View>
                      )}

                      <Text style={styles.dreamCardMemo} numberOfLines={2}>
                        {dream.memo}
                      </Text>
                    </View>

                    {/* 즐겨찾기 별 */}
                    <View style={styles.dreamCardActions}>
                      <Pressable
                        onPress={() => handleToggleFavorite(dream.id)}
                        style={styles.favoriteCardBtn}
                      >
                        <Text style={styles.favoriteStar}>
                          {dream.isFavorite ? '★' : '☆'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* 꿈 상세 정보 보기 팝업 모달 */}
      {selectedDream && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={Boolean(selectedDream)}
          onRequestClose={() => setSelectedDream(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              
              {/* 모달 상단 헤더 */}
              <View style={styles.modalHeader}>
                <View style={styles.modalModeCapsule}>
                  <Text style={styles.modalModeText}>
                    {selectedDream.mode === 'planet' ? '🪐 행성계 모드' : '👑 별자리 모드'}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDream(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseBtnText}>×</Text>
                </Pressable>
              </View>

              {/* 제목 & 날짜 */}
              <Text style={styles.modalTitle}>{selectedDream.title}</Text>
              <Text style={styles.modalDate}>{selectedDream.date} 기록됨</Text>

              <View style={styles.modalDivider} />

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
                {/* 감정 표기 */}
                {selectedDream.selectedMoodIds && selectedDream.selectedMoodIds.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>오늘의 기분</Text>
                    <View style={styles.modalMoodRow}>
                      {selectedDream.selectedMoodIds.map((moodId) => (
                        <View key={moodId} style={[styles.modalMoodBadge, { backgroundColor: getMoodColor(moodId) }]}>
                          <Text style={styles.modalMoodEmoji}>{getMoodEmoji(moodId)}</Text>
                          <Text style={styles.modalMoodTextLabel}>{getMoodLabel(moodId)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 키워드 표기 */}
                {selectedDream.selectedKeywordIds && selectedDream.selectedKeywordIds.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>꿈 키워드</Text>
                    <View style={styles.modalKeywordsRow}>
                      {selectedDream.selectedKeywordIds.map((kwId) => (
                        <View key={kwId} style={styles.modalKeywordPill}>
                          <Text style={styles.modalKeywordText}>#{getKeywordLabel(kwId)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 메모 표기 */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>꿈의 기억</Text>
                  <Text style={styles.modalMemoText}>{selectedDream.memo}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalDivider} />

              {/* 모달 하단 버튼 액션 */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => handleDeleteDream(selectedDream.id)}
                  style={[styles.modalActionBtn, styles.deleteBtn]}
                >
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setSelectedDream(null);
                    onRecordPress?.(selectedDream.date);
                  }}
                  style={[styles.modalActionBtn, styles.editBtn]}
                >
                  <Text style={styles.editBtnText}>수정</Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedDream(null)}
                  style={[styles.modalActionBtn, styles.closeBtn]}
                >
                  <Text style={styles.closeBtnText}>닫기</Text>
                </Pressable>
              </View>

            </View>
          </View>
        </Modal>
      )}

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
    paddingBottom: 140,
  },
  container: {
    alignSelf: 'center',
    paddingTop: 8,
    width: 393,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'android' ? 16 : 8,
    marginBottom: 8,
    height: 54,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backIconImage: {
    width: 14,
    height: 14,
    tintColor: '#2d237a',
  },
  headerTitle: {
    color: '#2d237a',
    fontSize: 18,
    fontFamily: 'Pretendard',
    fontWeight: '800',
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e2daff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarTitle: {
    color: '#2d237a',
    fontSize: 18,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    minWidth: 95,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(117, 88, 247, 0.08)',
    paddingBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#8a82ad',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '600',
  },
  sundayText: {
    color: '#c05282',
  },
  saturdayText: {
    color: '#7558f7',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCell: {
    backgroundColor: 'rgba(117, 88, 247, 0.06)',
    borderRadius: 8,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  dateTextWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayWrapper: {
    backgroundColor: '#7558f7',
    shadowColor: '#7558f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedWrapper: {
    backgroundColor: '#7558f7',
    shadowColor: '#7558f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dotIndicator: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#7558f7',
    position: 'absolute',
    right: -7,
    top: 10,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    color: '#2d237a',
  },
  todayText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  selectedDateText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  markerContainer: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dreamMarker: {
    width: 20,
    height: 20,
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: '#2d237a',
    paddingVertical: 4,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#8a82ad',
    fontWeight: 'bold',
  },
  filterBtn: {
    height: 44,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    borderRadius: 22,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: '#7558f7',
    borderColor: '#7558f7',
  },
  filterBtnText: {
    color: '#2d237a',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  filterDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2daff',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
  },
  dropdownTitle: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    color: '#2d237a',
    marginBottom: 12,
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f2ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(117, 88, 247, 0.12)',
    borderColor: '#7558f7',
  },
  dropdownItemIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  dropdownItemLabel: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    color: '#6f6a78',
  },
  dropdownItemLabelActive: {
    color: '#7558f7',
    fontWeight: '700',
  },
  tagsContainer: {
    width: '100%',
    marginBottom: 12,
  },
  tagsScroll: {
    paddingHorizontal: 2,
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e5f8',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagChipActive: {
    backgroundColor: '#7558f7',
    borderColor: '#7558f7',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#7558f7',
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0ecff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(117, 88, 247, 0.25)',
  },
  filterBannerText: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#7558f7',
    fontWeight: '600',
  },
  clearAllBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearAllBtnText: {
    fontSize: 10,
    fontFamily: 'Pretendard',
    color: '#7558f7',
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    color: '#2d237a',
  },
  listHeaderCount: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    color: '#8a82ad',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    width: '100%',
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    color: '#2d237a',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#8a82ad',
  },
  dreamList: {
    width: '100%',
    gap: 10,
  },
  dreamCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  dreamCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  moodBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  moodBadgeEmoji: {
    fontSize: 22,
    lineHeight: 24,
  },
  dreamCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  dreamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dreamCardTitle: {
    fontSize: 14,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    color: '#2d237a',
    marginBottom: 2,
  },
  dreamCardSub: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#8a82ad',
    marginBottom: 6,
  },
  dreamCardKeywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  keywordPill: {
    backgroundColor: '#f2f0ff',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  keywordPillText: {
    fontSize: 10,
    fontFamily: 'Pretendard',
    color: '#7558f7',
    fontWeight: '600',
  },
  moreKeywordsIndicator: {
    fontSize: 9,
    fontFamily: 'Pretendard',
    color: '#8a82ad',
    fontWeight: '600',
  },
  dreamCardMemo: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#6f6a78',
    lineHeight: 16,
  },
  dreamCardActions: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  favoriteCardBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteStar: {
    fontSize: 22,
    color: '#ffd86a',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 335,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalModeCapsule: {
    backgroundColor: '#f0ecff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalModeText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#7558f7',
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f4fa',
  },
  modalCloseBtnText: {
    fontSize: 20,
    color: '#8a82ad',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    color: '#2d237a',
    marginTop: 6,
  },
  modalDate: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#8a82ad',
    marginTop: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e2daff',
    marginVertical: 14,
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    fontWeight: '800',
    color: '#8a82ad',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalMoodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalMoodEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  modalMoodTextLabel: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    fontWeight: '700',
    color: '#2d237a',
  },
  modalKeywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalKeywordPill: {
    backgroundColor: '#f2f0ff',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#ded7ff',
  },
  modalKeywordText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#7558f7',
    fontWeight: '600',
  },
  modalMemoText: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: '#2d237a',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  modalActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ff8588',
  },
  deleteBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#7558f7',
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#f5f4fa',
    borderWidth: 1,
    borderColor: '#e2daff',
  },
  closeBtnText: {
    color: '#6f6a78',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
});
