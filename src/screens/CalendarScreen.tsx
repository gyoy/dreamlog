import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ScrollView,
  Modal,
  Easing,
  Share,
} from 'react-native';

import { HOME_DESIGN_HEIGHT, HOME_DESIGN_WIDTH } from '../data/home';
import { getSavedDreams, deleteDream } from '../utils/dreamStorage';
import type { SavedDream, DreamMood, RecordModeId } from '../types/record';
import type { HomeTabId } from '../types/home';
import { theme } from '../theme';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';
import { ArchiveListView } from './ArchiveListView';
import { MoodFace } from '../components/MoodFace';
import { RECORD_MOODS, RECORD_MODE_OPTIONS } from '../data/record';
import { RecordModeSelector } from '../components/RecordModeSelector';
import {
  CONSTELLATION_POINT_LAYOUTS,
  MONTHLY_CONSTELLATIONS,
  RESERVE_CONSTELLATIONS,
  getConstellationById,
} from '../data/constellations';
import { getDreamStarOption } from '../data/dreamStars';
import { DREAM_PLANET_OPTIONS, getDreamPlanetOption } from '../data/dreamPlanets';

const archiveSpaceBg = require('../../assets/record/archive-space-bg.png');
const ARCHIVE_VIEW_MODE_KEY = '@dreamlog_archive_view_mode';
const CONSTELLATION_CANVAS_WIDTH = 304;
const CONSTELLATION_CANVAS_HEIGHT = 380;
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
  require('../../assets/constellation-guides-premium/13-cassiopeia.png'),
  require('../../assets/constellation-guides-premium/14-cygnus.png'),
  require('../../assets/constellation-guides-premium/15-pegasus.png'),
  require('../../assets/constellation-guides-premium/16-andromeda.png'),
  require('../../assets/constellation-guides-premium/17-orion.png'),
  require('../../assets/constellation-guides-premium/18-lyra.png'),
] as const;

type CalendarScreenProps = {
  active?: boolean;
  highlightDreamId?: string;
  refreshTrigger?: number;
  onRecordPress?: (preselectedDate?: string, dreamId?: string) => void;
  onTabPress?: (tabId: HomeTabId) => void;
};

function ConstellationDreamStar({
  dream,
  isNew,
  isSelected,
  onPress,
  size,
  x,
  y,
}: {
  dream: SavedDream;
  isNew: boolean;
  isSelected: boolean;
  onPress: () => void;
  size: number;
  x: number;
  y: number;
}) {
  const pop = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isNew) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 115,
      useNativeDriver: true,
    }).start();
  }, [isNew, pop]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle]);

  return (
    <Animated.View
      style={[
        styles.constellationDreamStarWrap,
        isSelected && styles.constellationDreamStarWrapSelected,
        {
          left: x - size / 2,
          top: y - size / 2,
          height: size,
          width: size,
          opacity: pop,
          transform: [
            {
              scale: pop.interpolate({
                inputRange: [0, 0.72, 1],
                outputRange: [0.15, 1.28, 1],
              }),
            },
            {
              rotate: pop.interpolate({
                inputRange: [0, 1],
                outputRange: ['-18deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`${dream.title} 꿈별`}
        onPress={onPress}
        style={styles.constellationDreamStarButton}
      >
        <Animated.View
          style={{
            height: '100%',
            width: '100%',
            opacity: twinkle.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
            transform: [{
              scale: twinkle.interpolate({
                inputRange: [0, 1],
                outputRange: isSelected ? [1.04, 1.1] : [0.98, 1.045],
              }),
            }],
          }}
        >
          <Image source={getDreamStarOption(dream.selectedStarId).source} resizeMode="contain" style={styles.constellationDreamStarImage} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const getMoodObject = (moodId: string): DreamMood => {
  const found = RECORD_MOODS.find((m) => m.id === moodId);
  return found || { id: 'calm', label: '평온', faceColor: '#94ddd0', expression: 'line' };
};

// 3D Orbit line connecting elements in Planet Mode
type OrbitLineProps = {
  radius: number;
  centerX: number;
  centerY: number;
};

function OrbitLine({ radius, centerX, centerY }: OrbitLineProps) {
  return (
    <View
      style={[
        styles.orbitLine,
        {
          left: centerX - radius,
          top: centerY - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
        },
      ]}
      pointerEvents="none"
    />
  );
}

// 2D Line rendering between two stars in Constellation Mode
type ConstellationLineProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function ConstellationLine({ x1, y1, x2, y2 }: ConstellationLineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Position at the midpoint and rotate
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <View
      style={[
        styles.constellationLine,
        {
          left: midX - distance / 2,
          top: midY - 1,
          width: distance,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
      pointerEvents="none"
    />
  );
}

export function CalendarScreen({
  active,
  highlightDreamId,
  refreshTrigger,
  onRecordPress,
}: CalendarScreenProps) {
  const { height, width } = useWindowDimensions();
  const scale = Math.min(width / HOME_DESIGN_WIDTH, height / HOME_DESIGN_HEIGHT);
  const screenWidth = HOME_DESIGN_WIDTH * scale;
  
  // 아카이브 뷰 모드 상태: 'calendar' | 'list' | 'constellation' | 'planet'
  const [archiveViewMode, setArchiveViewMode] = useState<'calendar' | 'list' | 'constellation' | 'planet'>('constellation');

  // Calendar Date State (1-indexed month)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1 ~ 12

  // Saved dreams loaded from AsyncStorage
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [selectedDream, setSelectedDream] = useState<SavedDream | null>(null);
  const [detailModalDream, setDetailModalDream] = useState<SavedDream | null>(null);
  const [deleteConfirmDream, setDeleteConfirmDream] = useState<SavedDream | null>(null);
  const [constellationStage, setConstellationStage] = useState(0);
  const [recentHighlightId, setRecentHighlightId] = useState<string | null>(null);
  const archiveScrollRef = useRef<ScrollView>(null);

  // Floating animation value for planets
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Load saved dreams on mount or active
  const loadDreams = async () => {
    try {
      const data = await getSavedDreams();
      setDreams(data);
    } catch (_e) {
      // Silently handle load errors
    }
  };

  useLayoutEffect(() => {
    if (!active) return;
    archiveScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [active, archiveViewMode]);

  useEffect(() => {
    if (!active || !highlightDreamId) return;
    setRecentHighlightId(highlightDreamId);
    const clearTimer = setTimeout(() => {
      setRecentHighlightId((current) => (current === highlightDreamId ? null : current));
    }, 4500);
    return () => clearTimeout(clearTimer);
  }, [active, highlightDreamId, refreshTrigger]);

  useEffect(() => {
    // Always load fresh data when refreshTrigger changes (even before screen is active)
    // This ensures data is ready when navigating to archive after saving
    loadDreams();
    if (active) {
      setSelectedDream(null);
      AsyncStorage.getItem(ARCHIVE_VIEW_MODE_KEY)
        .then((storedMode: string | null) => {
          if (
            storedMode === 'calendar' ||
            storedMode === 'list' ||
            storedMode === 'constellation' ||
            storedMode === 'planet'
          ) {
            setArchiveViewMode(storedMode);
          }
        })
        .catch(() => {});
    }
  }, [active, refreshTrigger]);

  const activeHighlightId = recentHighlightId ?? highlightDreamId ?? null;

  useEffect(() => {
    if (!active || !activeHighlightId) return;
    const highlighted = dreams.find((dream) => dream.id === activeHighlightId);
    if (!highlighted) return;
    const [year, month] = highlighted.date.split('-').map(Number);
    if (Number.isFinite(year) && Number.isFinite(month)) {
      setCurrentYear(year);
      setCurrentMonth(month);
    }
    if (highlighted.mode === 'constellation') {
      setArchiveViewMode('constellation');
      setSelectedDream(highlighted);
    } else if (highlighted.mode === 'planet') {
      setArchiveViewMode('planet');
      setSelectedDream(highlighted);
    }
  }, [active, dreams, activeHighlightId]);

  // Orbit animation loop
  useEffect(() => {
    if (active) {
      floatAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [active, floatAnim]);

  // Map dreams by date for quick lookup
  const dreamsByDate = useMemo(() => {
    const map: Record<string, SavedDream> = {};
    dreams.forEach((dream) => {
      if (dream && dream.date) {
        map[dream.date] = dream;
      }
    });
    return map;
  }, [dreams]);

  // Range limit check
  const isPrevDisabled = useMemo(() => {
    const minDate = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    const targetDate = new Date(currentYear, currentMonth - 2, 1);
    return targetDate < minDate;
  }, [currentYear, currentMonth, today]);

  const isNextDisabled = useMemo(() => {
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 12, 1);
    const targetDate = new Date(currentYear, currentMonth, 1);
    return targetDate > maxDate;
  }, [currentYear, currentMonth, today]);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDream(null);
    setConstellationStage(0);
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDream(null);
    setConstellationStage(0);
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDream(null);
    setConstellationStage(0);
  };

  // Calendar cells calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const startDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1).getDay();
  }, [currentYear, currentMonth]);

  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayNum: number | null }[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ dateStr: '', dayNum: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      cells.push({ dateStr, dayNum: day });
    }
    return cells;
  }, [currentYear, currentMonth, daysInMonth, startDayOfWeek]);

  const handleCellPress = (dateStr: string, dayNum: number | null) => {
    if (!dayNum) return;
    const dream = dreamsByDate[dateStr];
    if (dream) {
      setSelectedDream(dream);
    } else {
      onRecordPress?.(dateStr);
    }
  };

  const handleDelete = async (dreamId: string) => {
    await deleteDream(dreamId);
    setRecentHighlightId((current) => (current === dreamId ? null : current));
    setSelectedDream(null);
    setDetailModalDream(null);
    setDeleteConfirmDream(null);
    loadDreams();
  };

  const handleDeleteRequest = (dream: SavedDream) => {
    setDetailModalDream(null);
    setDeleteConfirmDream(dream);
  };

  const handleModeChange = useCallback((newMode: RecordModeId) => {
    setArchiveViewMode(newMode);
    setSelectedDream(null);
    AsyncStorage.setItem(ARCHIVE_VIEW_MODE_KEY, newMode).catch(() => {});
  }, []);

  // ─── 별자리 / 행성 좌표 해시 생성 유틸 ───────────────────────────────
  // 일정한 좌표 분포를 형성하기 위해 꿈의 ID 해시를 기반으로 안정된 좌표(X, Y) 생성
  const spaceElements = useMemo(() => {
    const center = screenWidth / 2;
    const centerY = 300 * scale;

    const validDreams = dreams.filter((d) => d && d.id && d.date);
    return validDreams.map((d, index) => {
      // Simple hash function for placement
      let hash = 0;
      const dreamId = d.id || '';
      for (let i = 0; i < dreamId.length; i++) {
        hash = dreamId.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      // Constellation coordinates
      const cx = center + (Math.sin(hash) * (center - 50));
      const cy = centerY + (Math.cos(hash + index) * 150 * scale);

      // Planet orbits (concentric rings)
      const ringIndex = (index % 3) + 1; // 3 orbit paths
      const radius = ringIndex * 50 * scale + 40;
      const angle = (hash % 360) * (Math.PI / 180);
      const px = center + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;

      // Color coding based on mood
      let color = '#7558f7'; // default
      const firstMood = d.selectedMoodIds?.[0] || '';
      if (firstMood === 'happy' || firstMood === 'proud' || firstMood === 'excited') {
        color = '#ffd86a'; // Golden / Positive
      } else if (firstMood === 'scared' || firstMood === 'sad' || firstMood === 'angry') {
        color = '#f87b7b'; // Red / Negative
      } else if (firstMood === 'calm' || firstMood === 'mysterious') {
        color = '#8be5bb'; // Mint / Neutral-Positive
      }

      return {
        dream: d,
        color,
        constellation: { x: cx, y: cy },
        planet: { x: px, y: py, radius, orbitIndex: ringIndex },
        size: Math.max(14, Math.min(26, (d.memo?.length || 10) / 4)) * scale,
      };
    });
  }, [dreams, screenWidth, scale]);

  // 별자리 라인 연결 목록 (두 꿈이 키워드/태그를 공유할 시 연결선 연결)
  const constellationConnections = useMemo(() => {
    const lines: { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
    const elements = spaceElements;

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const el1 = elements[i];
        const el2 = elements[j];
        
        // Check if they share at least one keyword
        const tags1 = el1.dream.selectedKeywordIds || [];
        const tags2 = el2.dream.selectedKeywordIds || [];
        const sharesTag = tags1.some((tagId) => tags2.includes(tagId));

        if (sharesTag) {
          lines.push({
            id: `${el1.dream.id}-${el2.dream.id}`,
            from: el1.constellation,
            to: el2.constellation,
          });
        }
      }
    }
    return lines;
  }, [spaceElements]);

  const selectedMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const selectedMonthConstellationDreams = useMemo(
    () =>
      dreams
        .filter(
          (dream) =>
            dream.mode === 'constellation' &&
            dream.date.startsWith(selectedMonthKey),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [dreams, selectedMonthKey],
  );
  const constellationStages = useMemo(() => {
    const primary = MONTHLY_CONSTELLATIONS[currentMonth - 1];
    const ids = [primary.id, ...RESERVE_CONSTELLATIONS.map((item) => item.id)];
    const activeIds = ids.filter(
      (id, index) =>
        index === 0 ||
        selectedMonthConstellationDreams.some((dream) => dream.constellationId === id),
    );
    return activeIds.map((id) => ({
      guide: getConstellationById(id) ?? primary,
      dreams: selectedMonthConstellationDreams.filter((dream) => dream.constellationId === id),
    }));
  }, [currentMonth, selectedMonthConstellationDreams]);
  const visibleConstellationStage =
    constellationStages[Math.min(constellationStage, Math.max(0, constellationStages.length - 1))] ??
    {
      guide: MONTHLY_CONSTELLATIONS[currentMonth - 1],
      dreams: [],
    };
  const visibleConstellationPoints =
    CONSTELLATION_POINT_LAYOUTS[visibleConstellationStage.guide.id] ?? [];
  const visibleGuideIndex = [
    ...MONTHLY_CONSTELLATIONS,
    ...RESERVE_CONSTELLATIONS,
  ].findIndex((item) => item.id === visibleConstellationStage.guide.id);
  const isVisibleStageComplete =
    visibleConstellationStage.dreams.length >= visibleConstellationStage.guide.points;
  const planetDreams = useMemo(
    () => dreams.filter((dream) => dream.mode === 'planet'),
    [dreams],
  );
  const aquariumItems = useMemo(
    () =>
      Array.from({ length: Math.max(6, planetDreams.length) }, (_, index) => ({
        dream: planetDreams[index],
        option: planetDreams[index]
          ? getDreamPlanetOption(planetDreams[index].planetId)
          : DREAM_PLANET_OPTIONS[index % DREAM_PLANET_OPTIONS.length],
      })),
    [planetDreams],
  );

  const handleShareConstellation = async () => {
    const message = `${currentYear}년 ${currentMonth}월, 꿈로그에서 ${visibleConstellationStage.guide.name} 별자리를 완성했어요. ${visibleConstellationStage.dreams.length}개의 꿈별이 반짝이고 있어요.`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title: '꿈로그 별자리 완성', text: message });
      } else {
        await Share.share({ title: '꿈로그 별자리 완성', message });
      }
    } catch {
      // 사용자가 공유 창을 닫은 경우에는 별도 오류를 노출하지 않습니다.
    }
  };

  useEffect(() => {
    if (!active || !activeHighlightId || archiveViewMode !== 'constellation') return;
    const highlighted = dreams.find((dream) => dream.id === activeHighlightId);
    if (!highlighted) return;
    const guideStage = constellationStages.findIndex(
      (stage) => stage.guide.id === highlighted.constellationId,
    );
    if (guideStage >= 0) setConstellationStage(guideStage);
  }, [active, archiveViewMode, constellationStages, dreams, activeHighlightId]);

  const { isDark } = useTheme();
  const isDarkTheme = isDark;

  return (
    <View style={[styles.root, isDarkTheme && styles.darkRoot]}>
      <StatusBar hidden />
      <Image
        source={archiveSpaceBg}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      <ScrollView
        ref={archiveScrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header (No home-background image overlap anymore!) */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: '#ffffff' }]}>꿈 보관소</Text>
        </View>

        {/* View Mode Selector (별자리 / 행성계) */}
        <View style={styles.modeSelectorWrap}>
          <RecordModeSelector
            mode={archiveViewMode === 'planet' ? 'planet' : 'constellation'}
            onChange={handleModeChange}
            options={RECORD_MODE_OPTIONS}
          />
        </View>

        {/* ─────────────── 1. 달력 모드 (Calendar Mode View) ─────────────── */}
        {archiveViewMode === 'calendar' && (
          <View style={[styles.calendarContainer, isDarkTheme && styles.darkDetailContainer]}>
            {/* Calendar Navigator Header */}
            <View style={styles.navigator}>
              <Pressable
                onPress={handlePrevMonth}
                disabled={isPrevDisabled}
                style={[styles.navArrow, isPrevDisabled && styles.disabledArrow]}
              >
                <Text style={styles.arrowText}>&lt;</Text>
              </Pressable>
              
              <Pressable onPress={handleGoToToday} style={styles.todayBtn}>
                <Text style={styles.todayBtnText}>오늘</Text>
              </Pressable>

              <Text style={[styles.monthLabel, isDarkTheme && styles.darkText]}>
                {currentYear}년 {currentMonth}월
              </Text>

              <Pressable
                onPress={handleNextMonth}
                disabled={isNextDisabled}
                style={[styles.navArrow, isNextDisabled && styles.disabledArrow]}
              >
                <Text style={styles.arrowText}>&gt;</Text>
              </Pressable>
            </View>

            {/* Weekdays row */}
            <View style={styles.weekdaysRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <Text
                  key={day}
                  style={[
                    styles.weekdayText,
                    (idx === 0 || idx === 6) && styles.weekendText,
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>

            {/* Grid of days */}
            <View style={styles.grid}>
              {calendarCells.map((cell, idx) => {
                const hasDream = cell.dayNum ? Boolean(dreamsByDate[cell.dateStr]) : false;
                const isToday = cell.dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const dream = cell.dayNum ? dreamsByDate[cell.dateStr] : null;
                const firstMood = dream?.selectedMoodIds?.[0];

                return (
                  <Pressable
                    key={`${cell.dateStr}-${idx}`}
                    style={({ pressed }) => [
                      styles.cell,
                      cell.dayNum ? null : { opacity: 0 },
                      isToday && styles.todayCell,
                      pressed && styles.pressedCell,
                    ]}
                    disabled={!cell.dayNum}
                    onPress={() => handleCellPress(cell.dateStr, cell.dayNum)}
                  >
                    {cell.dayNum && (
                      <>
                        <Text style={[
                          styles.dateText,
                          isToday && styles.todayText,
                          isDarkTheme && styles.darkText,
                          (idx % 7 === 0 || idx % 7 === 6) && styles.weekendText
                        ]}>
                          {cell.dayNum}
                        </Text>
                        
                        {/* 미니 MoodFace 마커 (꿈이 있으면 감정 표현) */}
                        {hasDream && firstMood && (
                          <View style={styles.miniFaceMarker}>
                            <MoodFace mood={getMoodObject(firstMood)} size={13} />
                          </View>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ─────────────── 2. 목록 모드 (List Mode View) ─────────────── */}
        {archiveViewMode === 'list' && (
          <ArchiveListView
            dreams={dreams}
            onDreamPress={(d) => setSelectedDream(d)}
            isDark={isDarkTheme}
          />
        )}

        {/* ─────────────── 2. 별자리 모드 (Constellation Mode View) ─────────────── */}
        {archiveViewMode === 'constellation' && (
          <View style={styles.constellationModeCard}>
            <View style={styles.constellationModeHeader}>
              <Pressable
                accessibilityLabel="이전 달"
                disabled={isPrevDisabled}
                onPress={handlePrevMonth}
                style={[styles.constellationMonthButton, isPrevDisabled && styles.disabledArrow]}
              >
                <Text style={styles.constellationMonthArrow}>‹</Text>
              </Pressable>
              <View style={styles.constellationModeHeading}>
                <Text style={styles.constellationModeEyebrow}>{currentYear}년 {currentMonth}월의 꿈별</Text>
                <Text style={styles.constellationModeTitle}>{visibleConstellationStage.guide.name}</Text>
                <Text style={styles.constellationModeProgress}>
                  {visibleConstellationStage.dreams.length} / {visibleConstellationStage.guide.points}개 채움
                </Text>
                <View style={styles.constellationProgressTrack}>
                  <View
                    style={[
                      styles.constellationProgressFill,
                      {
                        width: `${Math.min(
                          100,
                          (visibleConstellationStage.dreams.length /
                            visibleConstellationStage.guide.points) *
                            100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Pressable
                accessibilityLabel="다음 달"
                disabled={isNextDisabled}
                onPress={handleNextMonth}
                style={[styles.constellationMonthButton, isNextDisabled && styles.disabledArrow]}
              >
                <Text style={styles.constellationMonthArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.constellationGuideCanvas}>
              <Image
                source={CONSTELLATION_GUIDES[Math.max(0, visibleGuideIndex)]}
                resizeMode="contain"
                style={styles.constellationGuideBackground}
              />
              {visibleConstellationPoints.map(([pointX, pointY], index) => {
                const dream = visibleConstellationStage.dreams.find(
                  (item) => item.constellationPointIndex === index,
                );
                const x = pointX * CONSTELLATION_CANVAS_WIDTH;
                const y = pointY * CONSTELLATION_CANVAS_HEIGHT;
                if (!dream) {
                  return null;
                }
                return (
                  <ConstellationDreamStar
                    dream={dream}
                    isNew={dream.id === activeHighlightId}
                    isSelected={selectedDream?.id === dream.id}
                    key={dream.id}
                    onPress={() => setSelectedDream(dream)}
                    size={index % 4 === 0 ? 42 : 36}
                    x={x}
                    y={y}
                  />
                );
              })}
            </View>

            {constellationStages.length > 1 ? (
              <View style={styles.constellationStageRow}>
                {constellationStages.map((stage, index) => (
                  <Pressable
                    key={stage.guide.id}
                    onPress={() => {
                      setConstellationStage(index);
                      setSelectedDream(null);
                    }}
                    style={[
                      styles.constellationStageChip,
                      index === constellationStage && styles.constellationStageChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.constellationStageChipText,
                        index === constellationStage && styles.constellationStageChipTextActive,
                      ]}
                    >
                      {index === 0 ? '대표' : `예비 ${index}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.constellationModeHint}>
              선명한 황금빛 가이드 위에 기록마다 고른 꿈별이 하나씩 놓여요.
            </Text>
            {isVisibleStageComplete ? (
              <View style={styles.constellationCompleteCard}>
                <Text style={styles.constellationCompleteTitle}>별자리를 완성했어요</Text>
                <Text style={styles.constellationCompleteBody}>
                  다음 꿈부터 예비 별자리가 자동으로 이어져요.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleShareConstellation()}
                  style={({ pressed }) => [
                    styles.constellationShareButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.constellationShareButtonText}>완성 별자리 공유하기</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        {/* ─────────────── 3. 행성 수집 우주 아쿠아리움 ─────────────── */}
        {archiveViewMode === 'planet' && (
          <View style={styles.planetAquariumCard}>
            <View style={styles.planetAquariumHeader}>
              <View>
                <Text style={styles.planetAquariumEyebrow}>나의 꿈 우주</Text>
                <Text style={styles.planetAquariumTitle}>행성 아쿠아리움</Text>
              </View>
              <Text style={styles.planetAquariumCount}>{planetDreams.length}개 수집</Text>
            </View>
            <View style={styles.planetAquariumCanvas}>
              <Image source={archiveSpaceBg} resizeMode="cover" style={styles.planetAquariumBackground} />
              {aquariumItems.map((item, index) => {
                const position = [
                  { left: 18, top: 32, size: 82 },
                  { left: 126, top: 18, size: 76 },
                  { left: 224, top: 62, size: 88 },
                  { left: 42, top: 170, size: 90 },
                  { left: 151, top: 145, size: 84 },
                  { left: 238, top: 205, size: 78 },
                ][index % 6];
                const cycle = Math.floor(index / 6);
                const active = Boolean(item.dream && selectedDream?.id === item.dream.id);
              const translateY = floatAnim.interpolate({
                inputRange: [0, 1],
                  outputRange: [index % 2 === 0 ? -7 : 5, index % 2 === 0 ? 7 : -5],
              });
              return (
                <Animated.View
                    key={item.dream?.id ?? `locked-planet-${index}`}
                  style={[
                      styles.planetAquariumItem,
                    {
                        height: position.size,
                        left: position.left + cycle * 5,
                        opacity: item.dream ? 1 : 0.24,
                        top: position.top + cycle * 8,
                        transform: [{ translateY }],
                        width: position.size,
                    },
                  ]}
                >
                  <Pressable
                      accessibilityLabel={item.dream ? `${item.dream.title} 행성` : `${item.option.label} 미수집`}
                      disabled={!item.dream}
                      onPress={() => item.dream && setSelectedDream(item.dream)}
                    style={[
                        styles.planetAquariumPressable,
                        active && styles.planetAquariumPressableActive,
                    ]}
                  >
                      <Image source={item.option.source} resizeMode="contain" style={styles.planetAquariumImage} />
                  </Pressable>
                </Animated.View>
              );
            })}
              {planetDreams.length === 0 ? (
                <View pointerEvents="none" style={styles.planetAquariumEmptyBadge}>
                  <Text style={styles.planetAquariumEmptyText}>꿈을 기록하면 첫 행성이 선명해져요</Text>
              </View>
              ) : null}
            </View>
            <Text style={styles.planetAquariumHint}>수집한 행성을 눌러 꿈 기록을 확인해보세요.</Text>
          </View>
        )}

        {/* 선택한 별/행성 바로 아래 동작 */}
        {selectedDream && (
          <View style={styles.selectedDreamActions}>
            <Text numberOfLines={1} style={styles.selectedDreamActionTitle}>{selectedDream.title}</Text>
            <View style={styles.selectedDreamActionButtons}>
              <Pressable accessibilityRole="button" onPress={() => setDetailModalDream(selectedDream)} style={styles.selectedDreamActionButton}>
                <Text style={styles.selectedDreamActionButtonText}>기록보기</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onRecordPress?.(selectedDream.date, selectedDream.id)} style={styles.selectedDreamActionButton}>
                <Text style={styles.selectedDreamActionButtonText}>수정</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => handleDeleteRequest(selectedDream)} style={[styles.selectedDreamActionButton, styles.selectedDreamDeleteButton]}>
                <Text style={[styles.selectedDreamActionButtonText, styles.selectedDreamDeleteText]}>삭제</Text>
              </Pressable>
            </View>
          </View>
        )}

      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={detailModalDream !== null}
        onRequestClose={() => setDetailModalDream(null)}
      >
        <View style={styles.dreamSummaryOverlay}>
          <Pressable onPress={() => setDetailModalDream(null)} style={StyleSheet.absoluteFillObject} />
          {detailModalDream ? (
            <View style={styles.dreamSummaryCard}>
              <Pressable accessibilityLabel="기록 요약 닫기" accessibilityRole="button" onPress={() => setDetailModalDream(null)} style={styles.dreamSummaryClose}>
                <Text style={styles.dreamSummaryCloseText}>×</Text>
              </Pressable>
              <View style={styles.dreamSummaryAssetWrap}>
                <Image
                  source={
                    detailModalDream.mode === 'planet'
                      ? getDreamPlanetOption(detailModalDream.planetId).source
                      : getDreamStarOption(detailModalDream.selectedStarId).source
                  }
                  resizeMode="contain"
                  style={styles.dreamSummaryAsset}
                />
              </View>
              <Text style={styles.dreamSummaryDate}>{detailModalDream.date}</Text>
              <Text style={styles.dreamSummaryTitle}>{detailModalDream.title}</Text>
              <Text numberOfLines={5} style={styles.dreamSummaryMemo}>
                {detailModalDream.memo || '작성된 메모가 없습니다.'}
              </Text>
              <View style={styles.dreamSummaryActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDetailModalDream(null);
                    onRecordPress?.(detailModalDream.date, detailModalDream.id);
                  }}
                  style={styles.dreamSummaryEditButton}
                >
                  <Text style={styles.dreamSummaryEditText}>기록 수정</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => handleDeleteRequest(detailModalDream)} style={styles.dreamSummaryDeleteButton}>
                  <Text style={styles.dreamSummaryDeleteText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={deleteConfirmDream !== null}
        onRequestClose={() => setDeleteConfirmDream(null)}
      >
        <View style={styles.deleteConfirmOverlay}>
          <Pressable onPress={() => setDeleteConfirmDream(null)} style={StyleSheet.absoluteFillObject} />
          {deleteConfirmDream ? (
            <View style={styles.deleteConfirmCard}>
              <Text style={styles.deleteConfirmTitle}>기록을 삭제할까요?</Text>
              <Text numberOfLines={2} style={styles.deleteConfirmDreamTitle}>{deleteConfirmDream.title}</Text>
              <Text style={styles.deleteConfirmBody}>삭제한 기록은 다시 복구할 수 없어요.</Text>
              <View style={styles.deleteConfirmActions}>
                <Pressable accessibilityRole="button" onPress={() => setDeleteConfirmDream(null)} style={styles.deleteConfirmCancel}>
                  <Text style={styles.deleteConfirmCancelText}>취소</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleDelete(deleteConfirmDream.id)}
                  style={styles.deleteConfirmDelete}
                >
                  <Text style={styles.deleteConfirmDeleteText}>삭제하기</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f5fc', // Clean light background matching settings
  },
  orbitLine: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(117, 88, 247, 0.08)',
    borderStyle: 'dashed',
  },
  constellationLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(180, 160, 255, 0.16)',
  },
  glowingStarStar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  starActiveBorder: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    position: 'absolute',
  },
  centerSunNode: {
    position: 'absolute',
    backgroundColor: '#ffe58f',
    shadowColor: '#ffd86a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSunEmoji: {
    fontSize: 18,
  },
  planetPressableContainer: {
    position: 'absolute',
  },
  planetPressableCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1.5,
  },
  planetEmoji: {
    color: '#100b2b',
    fontWeight: '800',
  },
  darkRoot: {
    backgroundColor: '#0a081a', // Immersive dark galaxy background
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 64 : 56,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#2d237a',
    fontSize: 22,
    fontWeight: '400',
    fontFamily: theme.typography.displayFontFamily,
  },
  darkText: {
    color: '#ffffff',
  },
  darkSubText: {
    color: '#cdcae2',
  },
  todayBtn: {
    backgroundColor: 'rgba(117, 88, 247, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  todayBtnText: {
    color: '#7558f7',
    fontSize: 12,
    fontWeight: '700',
  },
  modeSelectorWrap: {
    alignSelf: 'center',
    marginTop: 28,
    marginBottom: 32,
    height: 114,
    width: 339,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  navigator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  navArrow: {
    padding: 8,
  },
  disabledArrow: {
    opacity: 0.2,
  },
  arrowText: {
    color: '#7558f7',
    fontSize: 16,
    fontWeight: '700',
  },
  monthLabel: {
    color: '#2d237a',
    fontSize: 17,
    fontWeight: '800',
    minWidth: 110,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(117, 88, 247, 0.08)',
    paddingBottom: 6,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#8a82ad',
    fontSize: 12,
    fontWeight: '600',
  },
  weekendText: {
    color: '#c05282',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 52,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(117, 88, 247, 0.04)',
  },
  todayCell: {
    backgroundColor: 'rgba(117, 88, 247, 0.08)',
    borderRadius: 8,
  },
  pressedCell: {
    backgroundColor: 'rgba(117, 88, 247, 0.04)',
  },
  dateText: {
    color: '#2d237a',
    fontSize: 12,
    fontWeight: '600',
  },
  todayText: {
    color: '#7558f7',
    fontWeight: '800',
  },
  dreamMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  spaceCanvas: {
    width: '100%',
    backgroundColor: 'rgba(15, 12, 38, 0.45)',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(117, 88, 247, 0.2)',
  },
  spaceBgStar: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
  constellationModeCard: {
    backgroundColor: 'rgba(249, 247, 254, 0.96)',
    borderRadius: 32,
    paddingBottom: 20,
    paddingHorizontal: 15,
    paddingTop: 20,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
  },
  constellationModeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  constellationMonthButton: {
    alignItems: 'center',
    backgroundColor: '#EEE9FB',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  constellationMonthArrow: {
    color: '#5D51C2',
    fontFamily: 'Pretendard',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 29,
  },
  constellationModeHeading: {
    alignItems: 'center',
    minWidth: 170,
  },
  constellationModeEyebrow: {
    color: '#8A81B8',
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.25,
  },
  constellationModeTitle: {
    color: '#5D51C2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  constellationModeProgress: {
    color: '#766CA2',
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
  },
  constellationProgressTrack: {
    backgroundColor: '#E6DFF8',
    borderRadius: 4,
    height: 5,
    marginTop: 7,
    overflow: 'hidden',
    width: 118,
  },
  constellationProgressFill: {
    backgroundColor: '#F4C84F',
    borderRadius: 4,
    height: '100%',
    shadowColor: '#FFD963',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.58,
    shadowRadius: 6,
  },
  constellationGuideCanvas: {
    alignSelf: 'center',
    backgroundColor: '#2C2474',
    borderColor: 'rgba(255, 229, 126, 0.28)',
    borderRadius: 44,
    borderWidth: 1,
    height: CONSTELLATION_CANVAS_HEIGHT,
    marginTop: 15,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6E5FCE',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    width: CONSTELLATION_CANVAS_WIDTH,
  },
  constellationGuideBackground: {
    height: '100%',
    left: 0,
    opacity: 1,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  constellationEmptyPoint: {
    backgroundColor: '#F7D87C',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    position: 'absolute',
    shadowColor: '#F2C85B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    width: 8,
  },
  constellationDreamStarWrap: {
    position: 'absolute',
    zIndex: 4,
  },
  constellationDreamStarWrapSelected: {
    zIndex: 6,
  },
  constellationDreamStarButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  constellationDreamStarImage: {
    height: '100%',
    width: '100%',
  },
  constellationStageRow: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 9,
  },
  constellationStageChip: {
    backgroundColor: '#EEE9F8',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  constellationStageChipActive: {
    backgroundColor: '#DCD1FF',
  },
  constellationStageChipText: {
    color: '#827AA7',
    fontFamily: 'Pretendard',
    fontSize: 10,
    fontWeight: '400',
  },
  constellationStageChipTextActive: {
    color: '#5D51C2',
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
  },
  constellationModeHint: {
    color: '#746C99',
    fontFamily: 'Pretendard',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.18,
    lineHeight: 17,
    marginTop: 14,
    textAlign: 'center',
  },
  constellationCompleteCard: {
    alignItems: 'center',
    backgroundColor: '#F2ECFF',
    borderRadius: 18,
    marginTop: 14,
    padding: 14,
  },
  constellationCompleteTitle: {
    color: '#5648B2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 16,
  },
  constellationCompleteBody: {
    color: '#746B9C',
    fontFamily: 'Pretendard',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  constellationShareButton: {
    alignItems: 'center',
    backgroundColor: '#7662DF',
    borderRadius: 15,
    height: 38,
    justifyContent: 'center',
    marginTop: 11,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    width: '100%',
  },
  constellationShareButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-Medium',
    fontSize: 12,
  },
  planetAquariumCard: {
    backgroundColor: '#F9F7FE',
    borderRadius: 28,
    padding: 14,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  planetAquariumHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  planetAquariumEyebrow: {
    color: '#8379AA',
    fontFamily: 'Pretendard',
    fontSize: 10,
    letterSpacing: 0.25,
  },
  planetAquariumTitle: {
    color: '#5D51C2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 20,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  planetAquariumCount: {
    backgroundColor: '#ECE6FF',
    borderRadius: 13,
    color: '#6556BF',
    fontFamily: 'Pretendard-Medium',
    fontSize: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planetAquariumCanvas: {
    backgroundColor: '#2B225B',
    borderRadius: 24,
    height: 322,
    marginTop: 11,
    overflow: 'hidden',
    position: 'relative',
  },
  planetAquariumBackground: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    opacity: 0.72,
    width: '100%',
  },
  planetAquariumItem: {
    position: 'absolute',
  },
  planetAquariumPressable: {
    alignItems: 'center',
    borderRadius: 999,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  planetAquariumPressableActive: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    shadowColor: '#FFF2B2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 18,
  },
  planetAquariumImage: {
    height: '100%',
    width: '100%',
  },
  planetAquariumEmptyBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(33,25,76,0.82)',
    borderRadius: 15,
    bottom: 18,
    left: 38,
    paddingHorizontal: 13,
    paddingVertical: 8,
    position: 'absolute',
    right: 38,
  },
  planetAquariumEmptyText: {
    color: '#F2EDFF',
    fontFamily: 'Pretendard-Medium',
    fontSize: 10.5,
  },
  planetAquariumHint: {
    color: '#766E9B',
    fontFamily: 'Pretendard',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
  selectedDreamActions: {
    backgroundColor: '#FBF9FF',
    borderRadius: 20,
    marginTop: 14,
    padding: 13,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  selectedDreamActionTitle: {
    color: '#544A96',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 14,
    marginBottom: 10,
  },
  selectedDreamActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedDreamActionButton: {
    alignItems: 'center',
    backgroundColor: '#EEE9FF',
    borderRadius: 13,
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  selectedDreamActionButtonText: {
    color: '#5D51C2',
    fontFamily: 'Pretendard-Medium',
    fontSize: 11,
  },
  selectedDreamDeleteButton: {
    backgroundColor: '#FFF0F4',
  },
  selectedDreamDeleteText: {
    color: '#B85678',
  },
  dreamSummaryOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(24,17,54,0.46)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dreamSummaryCard: {
    alignItems: 'center',
    backgroundColor: '#FCFAFF',
    borderRadius: 30,
    padding: 22,
    shadowColor: '#6554C7',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    width: 330,
  },
  dreamSummaryClose: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 12,
    width: 34,
    zIndex: 2,
  },
  dreamSummaryCloseText: {
    color: '#8B82AB',
    fontFamily: 'Pretendard',
    fontSize: 25,
  },
  dreamSummaryAssetWrap: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 74,
    height: 148,
    justifyContent: 'center',
    width: 148,
  },
  dreamSummaryAsset: {
    height: 126,
    width: 126,
  },
  dreamSummaryDate: {
    color: '#887FA9',
    fontFamily: 'Pretendard',
    fontSize: 10.5,
    marginTop: 13,
  },
  dreamSummaryTitle: {
    color: '#5146A2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 18,
    lineHeight: 25,
    marginTop: 3,
    textAlign: 'center',
  },
  dreamSummaryMemo: {
    color: '#686184',
    fontFamily: 'Pretendard',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 11,
    textAlign: 'center',
  },
  dreamSummaryActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
    width: '100%',
  },
  dreamSummaryEditButton: {
    alignItems: 'center',
    backgroundColor: '#7662DF',
    borderRadius: 15,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  dreamSummaryEditText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-Medium',
    fontSize: 12,
  },
  dreamSummaryDeleteButton: {
    alignItems: 'center',
    backgroundColor: '#FFF0F4',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 78,
  },
  dreamSummaryDeleteText: {
    color: '#B85678',
    fontFamily: 'Pretendard-Medium',
    fontSize: 12,
  },
  deleteConfirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(24,17,54,0.46)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  deleteConfirmCard: {
    alignItems: 'center',
    backgroundColor: '#FCFAFF',
    borderRadius: 27,
    padding: 22,
    shadowColor: '#6554C7',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    width: 315,
  },
  deleteConfirmTitle: {
    color: '#5146A2',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 19,
  },
  deleteConfirmDreamTitle: {
    color: '#665E88',
    fontFamily: 'Pretendard-Medium',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    textAlign: 'center',
  },
  deleteConfirmBody: {
    color: '#8A82A5',
    fontFamily: 'Pretendard',
    fontSize: 10.5,
    marginTop: 5,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
    width: '100%',
  },
  deleteConfirmCancel: {
    alignItems: 'center',
    backgroundColor: '#EEE9FF',
    borderRadius: 15,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  deleteConfirmCancelText: {
    color: '#6559AE',
    fontFamily: 'Pretendard-Medium',
    fontSize: 12,
  },
  deleteConfirmDelete: {
    alignItems: 'center',
    backgroundColor: '#C15E7E',
    borderRadius: 15,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  deleteConfirmDeleteText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-Medium',
    fontSize: 12,
  },
  emptySpaceCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptySpaceText: {
    color: '#8a82ad',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: theme.typography.fontFamily,
  },
  detailContainer: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  darkDetailContainer: {
    backgroundColor: '#1b1633',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailDate: {
    color: '#8a82ad',
    fontSize: 11,
    fontWeight: '600',
  },
  closeDetailBtn: {
    paddingHorizontal: 6,
  },
  closeDetailText: {
    color: '#8a82ad',
    fontSize: 20,
    fontWeight: '300',
  },
  detailTitle: {
    color: '#2d237a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailMemo: {
    color: '#6f6a78',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  detailNoMemo: {
    color: '#c2bbdf',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(192, 82, 130, 0.1)',
    borderColor: 'rgba(192, 82, 130, 0.2)',
    borderWidth: 1,
  },
  deleteBtnText: {
    color: '#c05282',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.5,
  },
  miniFaceMarker: {
    marginTop: 4,
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
