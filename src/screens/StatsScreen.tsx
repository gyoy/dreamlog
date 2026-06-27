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
import { useTheme } from '../context/ThemeContext';
import { getSavedDreams, deleteDream, calculateStreak, formatDateString } from '../utils/dreamStorage';
import { MoodFace } from '../components/MoodFace';
import {
  RECORD_MOODS,
  RECORD_PRIMARY_KEYWORDS,
  RECORD_EXTRA_KEYWORDS,
} from '../data/record';

type StatsScreenProps = {
  active?: boolean;
  refreshTrigger?: number;
  userName?: string;
  onProfilePress?: () => void;
  onTabPress?: (tabId: HomeTabId) => void;
  onRecordPress?: (preselectedDate?: string, dreamId?: string) => void;
};

// 로컬 이미지 에셋
const backIcon = require('../../assets/record/back-icon.png');
const avatarImage = require('../../assets/home/rebuilt/avatar-image.png');
const starIcon = require('../../assets/record/mode-star-icon.png');
const planetIcon = require('../../assets/record/mode-grid-icon.png');
const moodCloudImage = require('../../assets/settings/badge-cloud.png');
const streakPlanetImage = require('../../assets/settings/mode-cloud-box.png');
const insightSchoolImage = require('../../assets/stats/analyze-insight-school.png');
const insightRabbitImage = require('../../assets/stats/analyze-insight-rabbit.png');
const insightMoonImage = require('../../assets/stats/analyze-insight-moon.png');

// 고해상도 고수준 디자인 보완용 데코 이미지 에셋
const decorMain = require('../../assets/stats/analyze-decor-main.png');
const decorCalendar = require('../../assets/stats/analyze-decor-calendar.png');
const decorStreak = require('../../assets/stats/analyze-decor-streak.png');
const decorInsight = require('../../assets/stats/analyze-decor-insight.png');
const decorMoon = require('../../assets/stats/analyze-decor-moon.png');

const STATS_PALETTE = {
  lavender: '#7C67E8',
  lavenderSoft: '#F3F0FF',
  lavenderBorder: '#E3DCFF',
  peach: '#E18B78',
  peachSoft: '#FFF1EC',
  peachBorder: '#F7D9CF',
  mint: '#55BFA5',
  mintSoft: '#EAF9F4',
  mintBorder: '#CDEEE5',
  sky: '#65A9DF',
  skySoft: '#EDF7FF',
  skyBorder: '#D4EAF9',
  butter: '#D4A53B',
  butterSoft: '#FFF8E3',
  butterBorder: '#F3E2AA',
  ink: '#241B4B',
  body: '#625D72',
  muted: '#898398',
  canvas: '#F8F7FC',
  card: '#F9F7FE',
} as const;

const DREAM_CARD_SURFACE = {
  backgroundColor: '#F9F7FE',
  borderWidth: 0,
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
} as const;

const CHART_COLORS = [
  STATS_PALETTE.lavender,
  STATS_PALETTE.sky,
  STATS_PALETTE.peach,
  STATS_PALETTE.butter,
  STATS_PALETTE.mint,
];

const getMoodLabel = (moodId: string) => {
  const found = RECORD_MOODS.find(m => m.id === moodId);
  return found ? found.label : moodId;
};

const getKeywordLabel = (id: string) => {
  const allKeywords = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
  const found = allKeywords.find(k => k.id === id);
  return found ? found.label : id;
};

export function StatsScreen({
  active,
  refreshTrigger,
  userName: propUserName,
  onProfilePress,
  onTabPress,
  onRecordPress,
}: StatsScreenProps) {
  const { isDark } = useTheme();
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
  const [userName, setUserName] = useState(propUserName || '꿈결님');

  // 꿈 기록 로드 함수
  const loadDreams = useCallback(async () => {
    const data = await getSavedDreams();
    const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
    setDreams(sorted);
  }, []);

  // 닉네임 로드 함수
  const loadUserName = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@dreamlog_user_name');
      if (stored !== null && stored.trim() !== '') {
        setUserName(stored.trim());
      } else {
        setUserName('꿈결님');
      }
    } catch (e) {
      console.error('Failed to load user name on StatsScreen:', e);
    }
  }, []);

  // 데이터 로드: refreshTrigger가 변경되거나 마운트될 때
  useEffect(() => {
    loadDreams();
    loadUserName();
  }, [refreshTrigger, loadDreams, loadUserName]);

  useEffect(() => {
    if (propUserName?.trim()) {
      setUserName(propUserName.trim());
    }
  }, [propUserName]);

  // 활성화 애니메이션
  useEffect(() => {
    if (active) {
      setSelectedDream(null);
      
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        duration: 300,
        easing: Easing.out(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [active, fadeAnim]);

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
      } else if (['happy', 'calm', 'angry', 'fear', 'sad'].includes(activeFilter)) {
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

  const currentStreak = useMemo(() => {
    return calculateStreak(dreams);
  }, [dreams]);

  const last7DaysRecordStatus = useMemo(() => {
    const statusList = [];
    const todayDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - i);
      const dateStr = formatDateString(d);
      const hasRecord = dreams.some((dream) => dream.date === dateStr);
      statusList.push({
        dayLabel: `${d.getDate()}일`,
        active: hasRecord,
      });
    }
    return statusList;
  }, [dreams]);

  const moodStats = useMemo(() => {
    if (dreams.length === 0) {
      return {
        happy: { percentage: 0, count: 0 },
        calm: { percentage: 0, count: 0 },
        angry: { percentage: 0, count: 0 },
        fear: { percentage: 0, count: 0 },
        sad: { percentage: 0, count: 0 },
        total: 0,
        insight: '꿈을 기록하면 감정 분포를 분석할 수 있습니다.',
      };
    }

    const counts = { happy: 0, calm: 0, angry: 0, fear: 0, sad: 0 };
    let total = 0;

    dreams.forEach((d) => {
      d.selectedMoodIds?.forEach((moodId) => {
        if (moodId in counts) {
          counts[moodId as keyof typeof counts] += 1;
          total += 1;
        }
      });
    });

    if (total === 0) {
      return {
        happy: { percentage: 0, count: 0 },
        calm: { percentage: 0, count: 0 },
        angry: { percentage: 0, count: 0 },
        fear: { percentage: 0, count: 0 },
        sad: { percentage: 0, count: 0 },
        total: 0,
        insight: '감정 정보가 입력된 꿈 기록이 없습니다.',
      };
    }

    const happyPct = Math.round((counts.happy / total) * 100);
    const calmPct = Math.round((counts.calm / total) * 100);
    const angryPct = Math.round((counts.angry / total) * 100);
    const fearPct = Math.round((counts.fear / total) * 100);
    const sadPct = Math.round((counts.sad / total) * 100);

    const positiveCount = counts.happy + counts.calm;
    const positivePct = Math.round((positiveCount / total) * 100);
    let insightText = '';
    if (positivePct >= 50) {
      insightText = `행복과 평온함이 전체 감정의 ${positivePct}%를 차지해요. 마음이 안정되고 긍정적인 시간이 많았어요.`;
    } else if (counts.angry + counts.fear + counts.sad > 0) {
      insightText = '최근 조금 불안정하거나 슬픈 감정이 꿈에 보였어요. 나만의 우주에서 편히 쉬어가세요.';
    } else {
      insightText = '꿈의 감정들이 조화롭게 나타나고 있습니다.';
    }

    return {
      happy: { percentage: happyPct, count: counts.happy },
      calm: { percentage: calmPct, count: counts.calm },
      angry: { percentage: angryPct, count: counts.angry },
      fear: { percentage: fearPct, count: counts.fear },
      sad: { percentage: sadPct, count: counts.sad },
      total,
      insight: insightText,
    };
  }, [dreams]);

  const keywordStats = useMemo(() => {
    const allKeywords = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
    if (dreams.length === 0) {
      return [
        { label: '하늘', count: 0, percentage: 0 },
        { label: '바다', count: 0, percentage: 0 },
        { label: '별', count: 0, percentage: 0 },
        { label: '달', count: 0, percentage: 0 },
        { label: '구름', count: 0, percentage: 0 },
      ];
    }

    const counts: Record<string, number> = {};
    dreams.forEach((d) => {
      d.selectedKeywordIds?.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    const sorted = Object.entries(counts)
      .map(([id, count]) => {
        const kw = allKeywords.find((k) => k.id === id);
        return {
          id,
          label: kw ? kw.label : id,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const top5 = sorted.slice(0, 5);
    const maxCount = top5.length > 0 ? top5[0].count : 1;

    const mapped = top5.map((item) => ({
      label: item.label,
      count: item.count,
      percentage: Math.round((item.count / maxCount) * 100),
    }));

    while (mapped.length < 5) {
      const unused = allKeywords.find((kw) => !mapped.some((m) => m.label === kw.label));
      if (!unused) break;
      mapped.push({
        label: unused.label,
        count: 0,
        percentage: 0,
      });
    }

    return mapped;
  }, [dreams]);

  const trendChartData = useMemo(() => {
    const todayDate = new Date();
    const weekStartDates: { start: Date; end: Date }[] = [];

    for (let i = 4; i >= 0; i--) {
      const start = new Date(todayDate);
      start.setDate(todayDate.getDate() - i * 7 - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(todayDate);
      end.setDate(todayDate.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      weekStartDates.push({ start, end });
    }

    return keywordStats.map((stat, idx) => {
      const values = weekStartDates.map((week) => {
        return dreams.filter((d) => {
          if (!d.date) return false;

          const allKeywords = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
          const hasKeyword = d.selectedKeywordIds?.some((id) => {
            const kwObj = allKeywords.find((k) => k.id === id);
            return kwObj ? kwObj.label === stat.label : id === stat.label;
          });
          if (!hasKeyword) return false;

          const parts = d.date.split('-');
          if (parts.length !== 3) return false;
          const dreamDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          return dreamDate >= week.start && dreamDate <= week.end;
        }).length;
      });

      return {
        name: stat.label,
        color: CHART_COLORS[idx] || STATS_PALETTE.lavender,
        values,
      };
    });
  }, [dreams, keywordStats]);

  const hourBlockStats = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    let hasTimeData = false;

    dreams.forEach((d) => {
      if (d.createdAt) {
        const hour = new Date(d.createdAt).getHours();
        hourCounts[hour] += 1;
        hasTimeData = true;
      }
    });

    if (!hasTimeData) {
      return { title: '시간대 분석 대기 중', desc: '꿈 분석이 진행되면 기록 시간대 분석이 시작됩니다.' };
    }

    let maxHour = 0;
    let maxVal = -1;
    hourCounts.forEach((val, hour) => {
      if (val > maxVal) {
        maxVal = val;
        maxHour = hour;
      }
    });

    if (maxHour >= 23 || maxHour <= 2) {
      return { title: '밤 11시~1시에 주로 기록', desc: '하루를 온전히 마무리하며 꿈을 정리하는 시간이에요.' };
    } else if (maxHour >= 6 && maxHour <= 9) {
      return { title: '아침 일찍 주로 기록', desc: '잠에서 깨자마자 생생한 기억을 붙잡아 두는 시간이에요.' };
    } else {
      return { title: '낮 또는 저녁 시간대에 주로 기록', desc: '여유로운 시간에 차분하게 꿈을 되돌아보았어요.' };
    }
  }, [dreams]);

  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 8 }, () => Array(7).fill(0));

    dreams.forEach((d) => {
      if (!d.createdAt) return;
      const dateObj = new Date(d.createdAt);
      const day = dateObj.getDay();
      const hour = dateObj.getHours();
      const rowIdx = Math.floor(hour / 3);
      if (rowIdx >= 0 && rowIdx < 8 && day >= 0 && day < 7) {
        grid[rowIdx][day] += 1;
      }
    });

    return grid;
  }, [dreams]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedTags.length > 0 || activeFilter !== 'all' || selectedDateFilter
  );

  const filterOptions = [
    { id: 'all', label: '모든 꿈 기록', icon: 'folder-outline' as const },
    { id: 'favorite', label: '즐겨찾기만', icon: 'star-outline' as const },
    { id: 'planet', label: '행성 수집', icon: 'planet-outline' as const },
    { id: 'constellation', label: '별자리 기록', icon: 'sparkles-outline' as const },
    { id: 'happy', label: '행복한 꿈', icon: 'happy-outline' as const },
    { id: 'calm', label: '평온한 꿈', icon: 'leaf-outline' as const },
    { id: 'angry', label: '화난 꿈', icon: 'flame-outline' as const },
    { id: 'fear', label: '두려운 꿈', icon: 'eye-outline' as const },
    { id: 'sad', label: '슬픈 꿈', icon: 'sad-outline' as const },
  ];

  const currentFilterLabel = filterOptions.find(o => o.id === activeFilter)?.label || '필터';

  return (
    <SafeAreaView style={[styles.root, isDark && styles.darkRoot]}>
      <StatusBar hidden />
      
      {/* Header */}
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <Pressable
          onPress={() => onTabPress?.('home')}
          style={({ pressed }) => [styles.backBtn, isDark && styles.darkBackBtn, pressed && styles.pressed]}
        >
          <Image source={backIcon} style={[styles.backIconImage, isDark && styles.darkBackIconImage]} resizeMode="contain" />
        </Pressable>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>꿈 분석 보고서</Text>
        <Pressable
          accessibilityLabel="프로필 열기"
          accessibilityRole="button"
          onPress={onProfilePress}
          style={styles.avatarContainer}
        >
          <Image source={avatarImage} style={styles.avatarImage} />
        </Pressable>
      </View>

      <ScrollView
        bounces
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.container, animatedStyle]}>

          {/* Main Visual Header Decoration Card */}
          <View style={[styles.decorMainCard, isDark && styles.darkDecorMainCard]}>
            <Image source={decorMain} style={styles.decorMainImage} resizeMode="cover" />
            <View style={styles.decorMainContent}>
              <Text style={styles.decorMainSubtitle}>Dreamlog Report</Text>
              <Text style={styles.decorMainTitle}>{userName.endsWith('님') ? userName : userName + '님'}의 꿈 은하수 분석</Text>
              <Text style={styles.decorMainDesc}>기록된 감정과 우주 상징들을 바탕으로 분석한 주간/월간 리포트입니다.</Text>
            </View>
          </View>
          
          {/* 달력 카드 섹션 */}
          <View style={[styles.calendarCard, isDark && styles.darkCard]}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={handlePrevMonth} style={({ pressed }) => [styles.navArrow, pressed && styles.pressed]}>
                <Ionicons name="chevron-back" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.lavender} />
              </Pressable>
              <View style={styles.calendarTitleWrapper}>
                <Image source={decorCalendar} style={styles.decorCalendarIcon} resizeMode="contain" />
                <Text style={[styles.calendarTitle, isDark && styles.darkText]}>
                  {currentYear}년 {currentMonth}월
                </Text>
              </View>
              <Pressable onPress={handleNextMonth} style={({ pressed }) => [styles.navArrow, pressed && styles.pressed]}>
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.lavender} />
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
              <View style={styles.dashboardCol}>
                {/* 감정 분포 카드 */}
                <View style={[styles.dashboardCard, styles.moodCard, styles.fullWidthCard, isDark && styles.darkCard]}>
                  <View style={styles.cardHeaderRowSpace}>
                    <Text style={[styles.cardEmojiTitle, isDark && styles.darkText]}>
                      <Ionicons name="pie-chart-outline" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.butter} /> 감정 분포
                    </Text>
                    <Image source={decorInsight} style={styles.decorHeaderIcon} resizeMode="contain" />
                  </View>
                  <View style={styles.donutContainer}>
                    <View style={[styles.donutCircle, isDark && styles.darkDonutCircle]}>
                      <Image source={moodCloudImage} style={styles.donutCloud} resizeMode="contain" />
                    </View>
                  </View>
                  <View style={styles.moodLegendsGrid}>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#ffd66b' }]} />
                      <Text style={[styles.legendText, isDark && styles.darkSubText]}>행복 {moodStats.happy.percentage}%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#94ddd0' }]} />
                      <Text style={[styles.legendText, isDark && styles.darkSubText]}>평온함 {moodStats.calm.percentage}%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#ff8588' }]} />
                      <Text style={[styles.legendText, isDark && styles.darkSubText]}>불안 {moodStats.fear.percentage}%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#ff7b7b' }]} />
                      <Text style={[styles.legendText, isDark && styles.darkSubText]}>화남 {moodStats.angry.percentage}%</Text>
                    </View>
                    <View style={styles.moodLegendItem}>
                      <View style={[styles.colorDot, { backgroundColor: '#9ec4f7' }]} />
                      <Text style={[styles.legendText, isDark && styles.darkSubText]}>슬픔 {moodStats.sad.percentage}%</Text>
                    </View>
                  </View>
                  <View style={[styles.moodInsightBox, isDark && styles.darkMoodInsightBox]}>
                    <Text style={[styles.moodInsightText, isDark && styles.darkText]}>
                      {moodStats.insight}
                    </Text>
                  </View>
                </View>

                {/* 연속 기록 카드 */}
                <View style={[styles.dashboardCard, styles.fullWidthCard, styles.streakCard, isDark && styles.darkCard, isDark && styles.darkStreakCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardEmojiTitle, isDark && styles.darkText]}>
                      <Ionicons name="calendar-outline" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.mint} /> 연속 기록
                    </Text>
                  </View>
                  
                  <View style={styles.streakValueRow}>
                    <View>
                      <Text style={[styles.streakNumberText, isDark && styles.darkText]}>{currentStreak}일</Text>
                    </View>
                    <Image source={decorStreak} style={styles.streakPlanetImage} resizeMode="contain" />
                  </View>

                  <View style={styles.checkCirclesRow}>
                    {last7DaysRecordStatus.map((item, idx) => (
                      <View key={idx} style={styles.checkCircleItem}>
                        <View style={[
                          styles.checkCircleActive,
                          isDark && styles.darkCheckCircleActive,
                          !item.active && styles.checkCircleInactive,
                          !item.active && isDark && styles.darkCheckCircleInactive
                        ]}>
                          {item.active && (
                            <Ionicons name="checkmark" size={10} color="#ffffff" />
                          )}
                        </View>
                        <Text style={[styles.checkCircleLabel, isDark && styles.darkSubText]}>{item.dayLabel}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.streakTipText, isDark && styles.darkSubText]}>
                    매일의 기록이 당신의 꿈을 더 가까이 데려다줄 거예요.
                  </Text>
                </View>
              </View>

              {/* Row 2: 키워드 트렌드 (Full Width) */}
              <View style={[styles.dashboardCard, styles.trendCard, styles.fullWidthCard, isDark && styles.darkCard]}>
                <View style={styles.cardHeaderRowSpace}>
                  <Text style={[styles.cardEmojiTitle, isDark && styles.darkText]}>
                    <Ionicons name="trending-up-outline" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.sky} /> 키워드 트렌드
                  </Text>
                  <View style={[styles.periodDropdown, isDark && styles.darkPeriodDropdown]}>
                    <Text style={[styles.periodDropdownText, isDark && styles.darkSubText]}>최근 4주 ▾</Text>
                  </View>
                </View>

                <View style={styles.trendLegendsRow}>
                  {keywordStats.map((stat, idx) => {
                    return (
                      <View key={idx} style={styles.trendLegendItem}>
                        <View style={[styles.colorDotSmall, { backgroundColor: CHART_COLORS[idx] }]} />
                        <Text style={[styles.legendText, isDark && styles.darkSubText]}>{stat.label}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* 라인 차트 시뮬레이션 */}
                <View style={styles.chartContainer}>
                  {/* Grid Lines */}
                  {[20, 15, 10, 5, 0].map((val, idx) => (
                    <View key={idx} style={styles.chartGridLine}>
                      <Text style={[styles.chartYLabel, isDark && styles.darkSubText]}>{val}</Text>
                      <View style={[styles.dashedGridLine, isDark && styles.darkDashedGridLine]} />
                    </View>
                  ))}
                  
                  {/* Simulated Line Plots using absolute positioned layers */}
                  <View style={styles.chartLinesLayer}>
                    {trendChartData.map((line, lineIdx) => {
                      const maxVal = 20;
                      const xCoords = [40, 100, 160, 220, 280];
                      return line.values.map((val, valIdx) => {
                        const bottomOffset = Math.min(140, Math.max(5, (val / maxVal) * 140));
                        const leftOffset = xCoords[valIdx] || 40;
                        return (
                          <View
                            key={`${lineIdx}-${valIdx}`}
                            style={[
                              styles.chartLineDot,
                              {
                                left: leftOffset,
                                bottom: bottomOffset,
                                backgroundColor: line.color,
                              },
                            ]}
                          />
                        );
                      });
                    })}
                  </View>
                </View>

                {/* X Axis Labels */}
                <View style={styles.chartXLabelsRow}>
                  <Text style={[styles.chartXLabel, isDark && styles.darkSubText]}>4주 전</Text>
                  <Text style={[styles.chartXLabel, isDark && styles.darkSubText]}>3주 전</Text>
                  <Text style={[styles.chartXLabel, isDark && styles.darkSubText]}>2주 전</Text>
                  <Text style={[styles.chartXLabel, isDark && styles.darkSubText]}>1주 전</Text>
                  <Text style={[styles.chartXLabel, isDark && styles.darkSubText]}>이번 주</Text>
                </View>

                {/* 순위별 가로 프로그레스 바 목록 */}
                <View style={styles.rankList}>
                  {keywordStats.map((stat, idx) => {
                    const rankColors = CHART_COLORS;
                    const badgeBgColors = isDark
                      ? ['#26194b', '#162b3d', '#351125', '#382a13', '#102d1d']
                      : [
                        STATS_PALETTE.lavenderSoft,
                        STATS_PALETTE.skySoft,
                        STATS_PALETTE.peachSoft,
                        STATS_PALETTE.butterSoft,
                        STATS_PALETTE.mintSoft,
                      ];
                    const color = rankColors[idx] || STATS_PALETTE.lavender;
                    const bgColor = badgeBgColors[idx] || STATS_PALETTE.lavenderSoft;

                    return (
                      <View key={idx} style={styles.rankItem}>
                        <View style={[styles.rankNumberBadge, { backgroundColor: bgColor }]}>
                          <Text style={[styles.rankNumberText, { color }]}>{idx + 1}</Text>
                        </View>
                        <Text style={[styles.rankKeyword, isDark && styles.darkText]}>{stat.label}</Text>
                        <View style={[styles.progressBarWrapper, isDark && styles.darkProgressBarWrapper]}>
                          <View style={[styles.progressBarFilled, { width: `${stat.percentage}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.rankCount, isDark && styles.darkSubText]}>{stat.count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Row 3: 인사이트 & 시간대별 기록 분포 */}
              <View style={styles.dashboardCol}>
                {/* 인사이트 카드 */}
                <View style={[styles.dashboardCard, styles.insightsCard, styles.fullWidthCard, isDark && styles.darkCard]}>
                  <View style={styles.cardHeaderRowSpace}>
                    <Text style={[styles.cardEmojiTitle, isDark && styles.darkText]}>
                      <Ionicons name="bulb-outline" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.peach} /> 인사이트
                    </Text>
                    <Image source={decorMoon} style={styles.decorHeaderIcon} resizeMode="contain" />
                  </View>

                  <View style={styles.insightsList}>
                    {/* Insight 1 */}
                    {keywordStats[0] && keywordStats[0].count > 0 ? (
                      <View style={[styles.insightItemCard, isDark && styles.darkInsightItemCard]}>
                        <View style={styles.insightDecorationWrapper}>
                          <Image source={insightSchoolImage} style={styles.insightDecorationImage} resizeMode="cover" />
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={[styles.insightTitleText, isDark && styles.darkText]} numberOfLines={1}>{keywordStats[0].label} 키워드가 자주 나와요</Text>
                          <Text style={[styles.insightDescText, isDark && styles.darkSubText]} numberOfLines={1}>최근 꿈에서 {keywordStats[0].label}에 대한 주제가 자주 나타났어요.</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.insightItemCard, isDark && styles.darkInsightItemCard]}>
                        <View style={styles.insightDecorationWrapper}>
                          <Image source={insightSchoolImage} style={styles.insightDecorationImage} resizeMode="cover" />
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={[styles.insightTitleText, isDark && styles.darkText]} numberOfLines={1}>꿈 기록을 계속해 보세요</Text>
                          <Text style={[styles.insightDescText, isDark && styles.darkSubText]} numberOfLines={1}>기록이 쌓이면 나만의 꿈 패턴이 나타납니다.</Text>
                        </View>
                      </View>
                    )}

                    {/* Insight 2 */}
                    {dreams.length > 0 ? (
                      <View style={[styles.insightItemCard, isDark && styles.darkInsightItemCard]}>
                        <View style={styles.insightDecorationWrapper}>
                          <Image source={insightRabbitImage} style={styles.insightDecorationImage} resizeMode="cover" />
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={[styles.insightTitleText, isDark && styles.darkText]} numberOfLines={1}>총 {dreams.length}개의 꿈 일기 기록</Text>
                          <Text style={[styles.insightDescText, isDark && styles.darkSubText]} numberOfLines={1}>꾸준한 일기 저장이 마음을 이해하는 첫 걸음이에요.</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.insightItemCard, isDark && styles.darkInsightItemCard]}>
                        <View style={styles.insightDecorationWrapper}>
                          <Image source={insightRabbitImage} style={styles.insightDecorationImage} resizeMode="cover" />
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={[styles.insightTitleText, isDark && styles.darkText]} numberOfLines={1}>기록 습관 형성 중</Text>
                          <Text style={[styles.insightDescText, isDark && styles.darkSubText]} numberOfLines={1}>매일 밤의 우주를 차분히 그려 보세요.</Text>
                        </View>
                      </View>
                    )}

                    {/* Insight 3 */}
                    <View style={[styles.insightItemCard, isDark && styles.darkInsightItemCard]}>
                      <View style={styles.insightDecorationWrapper}>
                        <Image source={insightMoonImage} style={styles.insightDecorationImage} resizeMode="cover" />
                      </View>
                      <View style={styles.insightContent}>
                        <Text style={[styles.insightTitleText, isDark && styles.darkText]} numberOfLines={1}>{hourBlockStats.title}</Text>
                        <Text style={[styles.insightDescText, isDark && styles.darkSubText]} numberOfLines={1}>{hourBlockStats.desc}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 시간대별 기록 분포 카드 (Heatmap) */}
                <View style={[styles.dashboardCard, styles.heatmapCard, styles.fullWidthCard, isDark && styles.darkCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardEmojiTitle, isDark && styles.darkText]}>
                      <Ionicons name="time-outline" size={16} color={isDark ? '#a09abb' : STATS_PALETTE.mint} /> 시간대별 기록
                    </Text>
                  </View>

                  <View style={styles.heatmapTable}>
                    {/* Day Headers */}
                    <View style={styles.heatmapWeekdaysRow}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                        <Text key={i} style={[styles.heatmapWeekdayText, isDark && styles.darkSubText]}>{d}</Text>
                      ))}
                    </View>

                    {/* Heatmap Grid Rows */}
                    {[
                      { label: '00-03', pattern: heatmapData[0] },
                      { label: '03-06', pattern: heatmapData[1] },
                      { label: '06-09', pattern: heatmapData[2] },
                      { label: '09-12', pattern: heatmapData[3] },
                      { label: '12-15', pattern: heatmapData[4] },
                      { label: '15-18', pattern: heatmapData[5] },
                      { label: '18-21', pattern: heatmapData[6] },
                      { label: '21-24', pattern: heatmapData[7] },
                    ].map((row, rowIdx) => (
                      <View key={rowIdx} style={styles.heatmapRow}>
                        <Text style={[styles.heatmapLabel, isDark && styles.darkSubText]}>{row.label}</Text>
                        <View style={styles.heatmapCells}>
                          {row.pattern.map((val, cellIdx) => {
                            let cellBg = isDark ? '#1a1436' : '#EDF5F2';
                            if (val === 1) cellBg = isDark ? '#24483f' : '#CBEADF';
                            else if (val === 2) cellBg = isDark ? '#2e6a5d' : '#98D7C8';
                            else if (val === 3) cellBg = isDark ? '#3f8d7b' : '#68BEAA';
                            else if (val >= 4) cellBg = isDark ? '#65bca8' : STATS_PALETTE.mint;
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
                      <View style={[styles.legendBox, { backgroundColor: '#EDF5F2' }]} />
                      <Text style={styles.legendLabel}>없음</Text>
                    </View>
                    <View style={styles.heatmapLegendItem}>
                      <View style={[styles.legendBox, { backgroundColor: '#CBEADF' }]} />
                      <Text style={styles.legendLabel}>적음</Text>
                    </View>
                    <View style={styles.heatmapLegendItem}>
                      <View style={[styles.legendBox, { backgroundColor: STATS_PALETTE.mint }]} />
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
              <Ionicons name="search-outline" size={16} color={STATS_PALETTE.butter} style={{ marginRight: 6 }} />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name="funnel-outline"
                  size={13}
                  color={activeFilter !== 'all' ? '#ffffff' : STATS_PALETTE.lavender}
                />
                <Text style={[styles.filterBtnText, activeFilter !== 'all' && styles.filterBtnTextActive]}>
                  {activeFilter !== 'all' ? currentFilterLabel : '필터'}
                </Text>
              </View>
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
                      <Ionicons
                        name={opt.icon}
                        size={14}
                        color={isSelected ? '#ffffff' : STATS_PALETTE.sky}
                        style={{ marginRight: 6 }}
                      />
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
              <Image source={insightMoonImage} style={styles.emptyDecorImage} resizeMode="cover" />
              <Text style={styles.emptyTitle}>일치하는 꿈 기록이 없어요</Text>
              <Text style={styles.emptyDesc}>
                필터 조건을 조정하거나 새로운 꿈을 기록해 보세요.
              </Text>
            </View>
          ) : (
            <View style={styles.dreamList}>
              {filteredDreams.map((dream) => {
                const firstMood = dream.selectedMoodIds?.[0] || 'happy';
                const moodObj = RECORD_MOODS.find(m => m.id === firstMood) || RECORD_MOODS[0];
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
                    <View style={styles.moodBadge}>
                      <MoodFace mood={moodObj} size={30} />
                    </View>

                    {/* 꿈 텍스트 내용 */}
                    <View style={styles.dreamCardContent}>
                      <View style={styles.dreamCardHeader}>
                        <Text style={styles.dreamCardTitle} numberOfLines={1}>
                          {dream.title}
                        </Text>
                      </View>
                      
                      <Text style={styles.dreamCardSub}>
                        {dream.date} · {dream.mode === 'planet' ? '행성 수집' : '별자리 기록'}
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
                        style={({ pressed }) => [styles.favoriteCardBtn, pressed && styles.pressed]}
                      >
                        <Ionicons
                          name={dream.isFavorite ? "star" : "star-outline"}
                          size={20}
                          color="#ffd86a"
                        />
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
                    {selectedDream.mode === 'planet' ? '행성 수집' : '별자리 기록'}
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
                      {selectedDream.selectedMoodIds.map((moodId) => {
                        const moodObj = RECORD_MOODS.find(m => m.id === moodId) || RECORD_MOODS[0];
                        return (
                          <View key={moodId} style={[styles.modalMoodBadge, { backgroundColor: moodObj.faceColor }]}>
                            <View style={{ marginRight: 6 }}>
                              <MoodFace mood={moodObj} size={18} />
                            </View>
                            <Text style={styles.modalMoodTextLabel}>{getMoodLabel(moodId)}</Text>
                          </View>
                        );
                      })}
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
                    onRecordPress?.(selectedDream.date, selectedDream.id);
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
    backgroundColor: STATS_PALETTE.canvas,
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
    height: 58,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: STATS_PALETTE.lavenderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: STATS_PALETTE.lavender,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backIconImage: {
    width: 14,
    height: 14,
    tintColor: STATS_PALETTE.ink,
  },
  headerTitle: {
    color: STATS_PALETTE.ink,
    fontSize: 18,
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
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
    ...DREAM_CARD_SURFACE,
    borderRadius: 20,
    padding: 16,
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
    backgroundColor: STATS_PALETTE.lavenderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: STATS_PALETTE.lavender,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarTitle: {
    color: STATS_PALETTE.ink,
    fontSize: 18,
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
    minWidth: 95,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: STATS_PALETTE.lavenderBorder,
    paddingBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: STATS_PALETTE.muted,
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '600',
  },
  sundayText: {
    color: '#c05282',
  },
  saturdayText: {
    color: STATS_PALETTE.sky,
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
    backgroundColor: STATS_PALETTE.lavenderSoft,
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
    backgroundColor: STATS_PALETTE.lavender,
    shadowColor: STATS_PALETTE.lavender,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedWrapper: {
    backgroundColor: STATS_PALETTE.lavender,
    shadowColor: STATS_PALETTE.lavender,
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
    backgroundColor: STATS_PALETTE.peach,
    position: 'absolute',
    right: -7,
    top: 10,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    color: STATS_PALETTE.ink,
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
    backgroundColor: STATS_PALETTE.butterSoft,
    borderWidth: 1,
    borderColor: STATS_PALETTE.butterBorder,
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: STATS_PALETTE.butter,
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
    color: STATS_PALETTE.ink,
    paddingVertical: 4,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: STATS_PALETTE.muted,
    fontWeight: '700',
  },
  filterBtn: {
    height: 44,
    backgroundColor: STATS_PALETTE.lavenderSoft,
    borderWidth: 1,
    borderColor: STATS_PALETTE.lavenderBorder,
    borderRadius: 22,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: STATS_PALETTE.lavender,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: STATS_PALETTE.lavender,
  },
  filterBtnText: {
    color: STATS_PALETTE.lavender,
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  filterDropdown: {
    backgroundColor: STATS_PALETTE.card,
    borderWidth: 1,
    borderColor: STATS_PALETTE.peachBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: STATS_PALETTE.peach,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
  },
  dropdownTitle: {
    fontSize: 13,
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
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
    backgroundColor: STATS_PALETTE.skySoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItemActive: {
    backgroundColor: STATS_PALETTE.sky,
  },
  dropdownItemIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  dropdownItemLabel: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    color: STATS_PALETTE.body,
  },
  dropdownItemLabelActive: {
    color: '#ffffff',
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
    backgroundColor: STATS_PALETTE.mintSoft,
    borderWidth: 1,
    borderColor: STATS_PALETTE.mintBorder,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagChipActive: {
    backgroundColor: STATS_PALETTE.mint,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#327F70',
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
    backgroundColor: STATS_PALETTE.peachSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: STATS_PALETTE.peachBorder,
  },
  filterBannerText: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: '#A6544A',
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
    color: '#A6544A',
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
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
  },
  listHeaderCount: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '600',
    color: STATS_PALETTE.muted,
  },
  emptyCard: {
    ...DREAM_CARD_SURFACE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  emptyDecorImage: {
    width: 62,
    height: 48,
    borderRadius: 14,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: STATS_PALETTE.muted,
  },
  dreamList: {
    width: '100%',
    gap: 10,
  },
  dreamCard: {
    ...DREAM_CARD_SURFACE,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
    marginBottom: 2,
  },
  dreamCardSub: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: STATS_PALETTE.muted,
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
    backgroundColor: STATS_PALETTE.lavenderSoft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  keywordPillText: {
    fontSize: 10,
    fontFamily: 'Pretendard',
    color: '#6652B6',
    fontWeight: '600',
  },
  moreKeywordsIndicator: {
    fontSize: 9,
    fontFamily: 'Pretendard',
    color: STATS_PALETTE.muted,
    fontWeight: '600',
  },
  dreamCardMemo: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: STATS_PALETTE.body,
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
    backgroundColor: STATS_PALETTE.card,
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
    backgroundColor: STATS_PALETTE.skySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalModeText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#3F7FAE',
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: STATS_PALETTE.peachSoft,
  },
  modalCloseBtnText: {
    fontSize: 20,
    color: STATS_PALETTE.muted,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.typography.displayFontFamily,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
    marginTop: 6,
  },
  modalDate: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: STATS_PALETTE.muted,
    marginTop: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: STATS_PALETTE.lavenderBorder,
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
    color: STATS_PALETTE.muted,
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
  modalMoodTextLabel: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    fontWeight: '700',
    color: STATS_PALETTE.ink,
  },
  modalKeywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalKeywordPill: {
    backgroundColor: STATS_PALETTE.mintSoft,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  modalKeywordText: {
    fontSize: 11,
    fontFamily: 'Pretendard',
    color: '#327F70',
    fontWeight: '600',
  },
  modalMemoText: {
    fontSize: 13,
    fontFamily: 'Pretendard',
    color: STATS_PALETTE.ink,
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
    backgroundColor: STATS_PALETTE.peach,
  },
  deleteBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: STATS_PALETTE.lavender,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: STATS_PALETTE.mintSoft,
  },
  closeBtnText: {
    color: '#327F70',
    fontSize: 12,
    fontFamily: 'Pretendard',
    fontWeight: '700',
  },
  insightDescText: {
    fontSize: 11,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
  },
  dashboardCard: {
    ...DREAM_CARD_SURFACE,
    borderRadius: 16,
    padding: 16,
  },
  moodCard: {
    backgroundColor: STATS_PALETTE.card,
  },
  trendCard: {
    backgroundColor: STATS_PALETTE.card,
  },
  insightsCard: {
    backgroundColor: STATS_PALETTE.card,
  },
  heatmapCard: {
    backgroundColor: STATS_PALETTE.card,
  },
  halfCard: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEmojiTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
    fontFamily: theme.typography.displayFontFamily,
  },
  heatmapTable: {
    marginTop: 8,
    alignSelf: 'center',
  },
  heatmapWeekdaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'space-between',
    paddingLeft: 36,
  },
  heatmapWeekdayText: {
    width: 22,
    textAlign: 'center',
    fontSize: 10,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapLabel: {
    width: 32,
    fontSize: 10,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
  },
  heatmapCells: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 4,
  },
  heatmapCell: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
    justifyContent: 'flex-end',
  },
  heatmapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
  },
  dashboardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 16,
  },
  donutCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 14,
    borderColor: '#F1D98E',
    backgroundColor: '#FFFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCloud: {
    position: 'absolute',
    width: 50,
    height: 50,
  },
  moodLegendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  chartLineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STATS_PALETTE.lavender,
    position: 'absolute',
  },
  chartXLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  chartXLabel: {
    fontSize: 10,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
    textAlign: 'center',
    width: 32,
  },
  rankList: {
    flexDirection: 'column',
    gap: 8,
  },
  periodDropdownText: {
    fontSize: 12,
    color: '#3F7FAE',
    fontWeight: '700',
    fontFamily: 'Pretendard',
  },
  trendLegendsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  trendLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: STATS_PALETTE.body,
    fontFamily: 'Pretendard',
  },
  chartContainer: {
    height: 160,
    position: 'relative',
    marginTop: 16,
    width: '100%',
  },
  chartGridLine: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  chartYLabel: {
    width: 24,
    fontSize: 9,
    color: '#8BA6B8',
    fontFamily: 'Pretendard',
    textAlign: 'right',
  },
  dashedGridLine: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: STATS_PALETTE.skyBorder,
    borderStyle: 'dashed',
    marginLeft: 8,
  },
  chartLinesLayer: {
    position: 'absolute',
    left: 32,
    right: 8,
    top: 0,
    bottom: 0,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moodLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodInsightBox: {
    backgroundColor: '#FFFDF7',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    shadowColor: STATS_PALETTE.butter,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  moodInsightText: {
    fontSize: 12,
    color: STATS_PALETTE.body,
    lineHeight: 18,
    fontFamily: 'Pretendard',
  },
  boldInsight: {
    fontWeight: '700',
    color: '#8C681D',
  },
  streakCard: {
    backgroundColor: STATS_PALETTE.card,
    borderRadius: 16,
    padding: 16,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 12,
  },
  streakNumberText: {
    fontSize: 32,
    color: '#327F70',
    fontWeight: '900',
    fontFamily: 'Pretendard',
  },
  streakPlanetImage: {
    width: 60,
    height: 60,
  },
  checkCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  checkCircleItem: {
    alignItems: 'center',
    gap: 4,
  },
  checkCircleActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: STATS_PALETTE.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleInactive: {
    backgroundColor: '#DCEFE9',
  },
  checkCircleLabel: {
    fontSize: 10,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
  },
  streakTipText: {
    fontSize: 11,
    color: STATS_PALETTE.muted,
    fontFamily: 'Pretendard',
    lineHeight: 16,
    marginTop: 8,
  },
  fullWidthCard: {
    width: '100%',
  },
  cardHeaderRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5FBFF',
    borderWidth: 1,
    borderColor: STATS_PALETTE.skyBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: STATS_PALETTE.lavenderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankNumberText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Pretendard',
  },
  rankKeyword: {
    fontSize: 13,
    color: STATS_PALETTE.ink,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    width: 60,
  },
  progressBarWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressBarFilled: {
    height: '100%',
    backgroundColor: STATS_PALETTE.lavender,
    borderRadius: 4,
  },
  rankCount: {
    fontSize: 12,
    color: STATS_PALETTE.muted,
    fontWeight: '700',
    fontFamily: 'Pretendard',
    width: 32,
    textAlign: 'right',
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dashboardCol: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
    width: '100%',
  },
  insightsList: {
    flexDirection: 'column',
    gap: 10,
  },
  insightItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 12,
    padding: 10,
    shadowColor: STATS_PALETTE.peach,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  insightDecorationWrapper: {
    width: 48,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
  },
  insightDecorationImage: {
    width: '100%',
    height: '100%',
  },
  insightContent: {
    flex: 1,
  },
  insightTitleText: {
    fontSize: 13,
    color: STATS_PALETTE.ink,
    fontWeight: '700',
    fontFamily: 'Pretendard',
  },

  // 고수준 디자인 보완 데코레이션 스타일
  decorMainCard: {
    ...DREAM_CARD_SURFACE,
    borderRadius: 20,
    width: '100%',
    height: 120,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  decorMainImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0.95,
  },
  decorMainContent: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: '65%',
  },
  decorMainSubtitle: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '700',
    color: '#6652B6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  decorMainTitle: {
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 18,
    fontWeight: '800',
    color: STATS_PALETTE.ink,
    marginBottom: 6,
  },
  decorMainDesc: {
    fontFamily: 'Pretendard',
    fontSize: 11,
    color: STATS_PALETTE.body,
    lineHeight: 15,
  },
  decorHeaderIcon: {
    width: 24,
    height: 24,
  },
  decorCalendarIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  calendarTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 다크 모드 스타일 강제/보정 오버라이드
  darkRoot: {
    backgroundColor: '#0a051d',
  },
  darkHeader: {
    borderBottomWidth: 0,
  },
  darkBackBtn: {
    backgroundColor: '#1b143a',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  darkBackIconImage: {
    tintColor: '#a09abb',
  },
  darkText: {
    color: '#ffffff',
  },
  darkSubText: {
    color: '#a09abb',
  },
  darkCard: {
    backgroundColor: '#150f30',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
  },
  darkDecorMainCard: {
    backgroundColor: '#100b26',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
  },
  darkDonutCircle: {
    backgroundColor: '#100b26',
  },
  darkMoodInsightBox: {
    backgroundColor: '#100b26',
  },
  darkStreakCard: {
    backgroundColor: '#150f30',
  },
  darkCheckCircleActive: {
    backgroundColor: '#55B5A2',
  },
  darkCheckCircleInactive: {
    backgroundColor: '#1e183a',
  },
  darkPeriodDropdown: {
    backgroundColor: '#1b143a',
  },
  darkProgressBarWrapper: {
    backgroundColor: '#1b143a',
  },
  darkInsightItemCard: {
    backgroundColor: '#1b143a',
  },
  darkDashedGridLine: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
