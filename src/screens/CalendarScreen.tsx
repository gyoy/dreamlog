import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
} from 'react-native';

import { HOME_DESIGN_HEIGHT, HOME_DESIGN_WIDTH } from '../data/home';
import { getSavedDreams, deleteDream } from '../utils/dreamStorage';
import type { SavedDream } from '../types/record';
import type { HomeTabId } from '../types/home';
import { theme } from '../theme';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

type CalendarScreenProps = {
  active?: boolean;
  onRecordPress?: (preselectedDate?: string) => void;
  onTabPress?: (tabId: HomeTabId) => void;
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
      style={{
        position: 'absolute',
        left: centerX - radius,
        top: centerY - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: 'rgba(117, 88, 247, 0.08)',
        borderStyle: 'dashed',
      }}
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
      style={{
        position: 'absolute',
        left: midX - distance / 2,
        top: midY - 1,
        width: distance,
        height: 1.5,
        backgroundColor: 'rgba(180, 160, 255, 0.16)',
        transform: [{ rotate: `${angle}rad` }],
      }}
      pointerEvents="none"
    />
  );
}

export function CalendarScreen({
  active,
  onRecordPress,
}: CalendarScreenProps) {
  const { height, width } = useWindowDimensions();
  const scale = Math.min(width / HOME_DESIGN_WIDTH, height / HOME_DESIGN_HEIGHT);
  const screenWidth = HOME_DESIGN_WIDTH * scale;
  
  // 아카이브 뷰 모드 상태: 'calendar' | 'constellation' | 'planet'
  const [archiveViewMode, setArchiveViewMode] = useState<'calendar' | 'constellation' | 'planet'>('calendar');

  // Calendar Date State (1-indexed month)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1 ~ 12

  // Saved dreams loaded from AsyncStorage
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [selectedDream, setSelectedDream] = useState<SavedDream | null>(null);

  // Floating animation value for planets
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Load saved dreams on mount or active
  const loadDreams = useCallback(async () => {
    const data = await getSavedDreams();
    setDreams(data);
  }, []);

  useEffect(() => {
    if (active) {
      loadDreams();
      setSelectedDream(null);
    }
  }, [active, loadDreams]);

  // Orbit animation loop
  useEffect(() => {
    if (active && archiveViewMode !== 'calendar') {
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
  }, [active, archiveViewMode, floatAnim]);

  // Map dreams by date for quick lookup
  const dreamsByDate = useMemo(() => {
    const map: Record<string, SavedDream> = {};
    dreams.forEach((dream) => {
      map[dream.date] = dream;
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
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDream(null);
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
    setSelectedDream(null);
    loadDreams();
  };

  // ─── 별자리 / 행성 좌표 해시 생성 유틸 ───────────────────────────────
  // 일정한 좌표 분포를 형성하기 위해 꿈의 ID 해시를 기반으로 안정된 좌표(X, Y) 생성
  const spaceElements = useMemo(() => {
    const center = screenWidth / 2;
    const centerY = 300 * scale;

    return dreams.map((d, index) => {
      // Simple hash function for placement
      let hash = 0;
      for (let i = 0; i < d.id.length; i++) {
        hash = d.id.charCodeAt(i) + ((hash << 5) - hash);
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
      if (d.moodId === 'happy' || d.moodId === 'proud' || d.moodId === 'excited') {
        color = '#ffd86a'; // Golden / Positive
      } else if (d.moodId === 'scared' || d.moodId === 'sad' || d.moodId === 'angry') {
        color = '#f87b7b'; // Red / Negative
      } else if (d.moodId === 'calm' || d.moodId === 'mysterious') {
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

  const isDarkTheme = archiveViewMode !== 'calendar';

  return (
    <View style={[styles.root, isDarkTheme && styles.darkRoot]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header (No home-background image overlap anymore!) */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isDarkTheme && styles.darkText]}>꿈 보관소</Text>
          {archiveViewMode === 'calendar' && (
            <Pressable onPress={handleGoToToday} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>오늘</Text>
            </Pressable>
          )}
        </View>

        {/* View Mode Tabs Selector (달력 보기 | 별자리 모드 | 행성계 모드) */}
        <View style={[styles.tabBar, isDarkTheme && styles.darkTabBar]}>
          <Pressable
            style={[styles.tabItem, archiveViewMode === 'calendar' && styles.tabItemActive]}
            onPress={() => {
              setArchiveViewMode('calendar');
              setSelectedDream(null);
            }}
          >
            <Text style={[styles.tabItemText, archiveViewMode === 'calendar' && styles.tabItemTextActive]}>
              📅 달력 보기
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, archiveViewMode === 'constellation' && styles.tabItemActive]}
            onPress={() => {
              setArchiveViewMode('constellation');
              setSelectedDream(null);
            }}
          >
            <Text style={[styles.tabItemText, archiveViewMode === 'constellation' && styles.tabItemTextActive, isDarkTheme && styles.darkTabItemText]}>
              ✨ 별자리 모드
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, archiveViewMode === 'planet' && styles.tabItemActive]}
            onPress={() => {
              setArchiveViewMode('planet');
              setSelectedDream(null);
            }}
          >
            <Text style={[styles.tabItemText, archiveViewMode === 'planet' && styles.tabItemTextActive, isDarkTheme && styles.darkTabItemText]}>
              🪐 행성계 모드
            </Text>
          </Pressable>
        </View>

        {/* ─────────────── 1. 달력 보기 (Calendar View) ─────────────── */}
        {archiveViewMode === 'calendar' && (
          <View style={styles.calendarContainer}>
            {/* Month Navigator */}
            <View style={styles.navigator}>
              <Pressable
                disabled={isPrevDisabled}
                onPress={handlePrevMonth}
                style={({ pressed }) => [
                  styles.navArrow,
                  isPrevDisabled && styles.disabledArrow,
                  pressed && !isPrevDisabled && styles.pressed,
                ]}
              >
                <Text style={styles.arrowText}>◀</Text>
              </Pressable>
              <Text style={styles.monthLabel}>
                {currentYear}년 {currentMonth}월
              </Text>
              <Pressable
                disabled={isNextDisabled}
                onPress={handleNextMonth}
                style={({ pressed }) => [
                  styles.navArrow,
                  isNextDisabled && styles.disabledArrow,
                  pressed && !isNextDisabled && styles.pressed,
                ]}
              >
                <Text style={styles.arrowText}>▶</Text>
              </Pressable>
            </View>

            {/* Weekdays */}
            <View style={styles.weekdaysRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <Text key={i} style={[styles.weekdayText, (i === 0 || i === 6) && styles.weekendText]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.grid}>
              {calendarCells.map((cell, index) => {
                const hasDream = cell.dayNum ? Boolean(dreamsByDate[cell.dateStr]) : false;
                const dream = cell.dayNum ? dreamsByDate[cell.dateStr] : null;
                const isToday = Boolean(
                  cell.dayNum &&
                  today.getFullYear() === currentYear &&
                  today.getMonth() + 1 === currentMonth &&
                  today.getDate() === cell.dayNum
                );

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleCellPress(cell.dateStr, cell.dayNum)}
                    style={({ pressed }) => [
                      styles.cell,
                      isToday ? styles.todayCell : null,
                      (pressed && cell.dayNum) ? styles.pressedCell : null,
                    ]}
                  >
                    {cell.dayNum && (
                      <>
                        <Text style={[styles.dateText, isToday ? styles.todayText : null]}>
                          {cell.dayNum}
                        </Text>
                        {hasDream && dream && (
                          <View
                            style={[
                              styles.dreamMarkerDot,
                              { backgroundColor: dream.moodId === 'happy' ? '#ffd86a' : (dream.moodId === 'scared' ? '#f87b7b' : '#7558f7') }
                            ]}
                          />
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ─────────────── 2. 별자리 모드 (Constellation Mode View) ─────────────── */}
        {archiveViewMode === 'constellation' && (
          <View style={[styles.spaceCanvas, { height: 420 * scale }]}>
            {/* Background Tiny Stars */}
            {Array.from({ length: 24 }).map((_, i) => (
              <View
                key={`bg-star-${i}`}
                style={[
                  styles.spaceBgStar,
                  {
                    left: ((i * 19) % 90) + 5 + '%',
                    top: ((i * 31) % 80) + 10 + '%',
                    opacity: 0.1 + (i % 5) * 0.15,
                  },
                ]}
              />
            ))}

            {/* Constellation Connection Lines */}
            {constellationConnections.map((line) => (
              <ConstellationLine key={line.id} x1={line.from.x} y1={line.from.y - 100 * scale} x2={line.to.x} y2={line.to.y - 100 * scale} />
            ))}

            {/* Glowing Star Nodes (Dreams) */}
            {spaceElements.map((el) => {
              const active = selectedDream?.id === el.dream.id;
              return (
                <Pressable
                  key={`star-${el.dream.id}`}
                  style={{
                    position: 'absolute',
                    left: el.constellation.x - el.size / 2,
                    top: el.constellation.y - 100 * scale - el.size / 2,
                    width: el.size,
                    height: el.size,
                    borderRadius: el.size / 2,
                    backgroundColor: el.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: el.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: active ? 0.9 : 0.6,
                    shadowRadius: active ? 10 : 4,
                    elevation: 5,
                  }}
                  onPress={() => setSelectedDream(el.dream)}
                >
                  {active && (
                    <View
                      style={{
                        width: el.size + 10,
                        height: el.size + 10,
                        borderRadius: (el.size + 10) / 2,
                        borderWidth: 1.5,
                        borderColor: '#ffffff',
                        position: 'absolute',
                      }}
                    />
                  )}
                </Pressable>
              );
            })}

            {dreams.length === 0 && (
              <View style={styles.emptySpaceCenter}>
                <Text style={styles.emptySpaceText}>아직 기록된 꿈이 없어 별자리가 비어 있습니다. ✨</Text>
              </View>
            )}
          </View>
        )}

        {/* ─────────────── 3. 행성계 모드 (Planet Mode View) ─────────────── */}
        {archiveViewMode === 'planet' && (
          <View style={[styles.spaceCanvas, { height: 420 * scale }]}>
            {/* Center Star / Sun */}
            <View
              style={{
                position: 'absolute',
                left: screenWidth / 2 - 20,
                top: 200 * scale - 20,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#ffe58f',
                shadowColor: '#ffd86a',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 14,
                elevation: 10,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>☀️</Text>
            </View>

            {/* Orbit rings */}
            <OrbitLine radius={90} centerX={screenWidth / 2} centerY={200 * scale} />
            <OrbitLine radius={140} centerX={screenWidth / 2} centerY={200 * scale} />
            <OrbitLine radius={190} centerX={screenWidth / 2} centerY={200 * scale} />

            {/* Floating Planet Spheres */}
            {spaceElements.map((el, index) => {
              const active = selectedDream?.id === el.dream.id;
              
              // Apply small float animation offset
              const translateY = floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [index % 2 === 0 ? -4 : 4, index % 2 === 0 ? 4 : -4],
              });

              return (
                <Animated.View
                  key={`planet-${el.dream.id}`}
                  style={{
                    position: 'absolute',
                    left: el.planet.x - el.size * 1.25,
                    top: el.planet.y - el.size * 1.25,
                    transform: [{ translateY }],
                  }}
                >
                  <Pressable
                    style={{
                      width: el.size * 2.5,
                      height: el.size * 2.5,
                      borderRadius: el.size * 1.25,
                      backgroundColor: el.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: el.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: active ? 0.9 : 0.5,
                      shadowRadius: active ? 12 : 6,
                      elevation: 6,
                      borderWidth: 1.5,
                      borderColor: active ? '#ffffff' : 'rgba(255,255,255,0.2)',
                    }}
                    onPress={() => setSelectedDream(el.dream)}
                  >
                    <Text style={{ fontSize: 8 * scale, color: '#100b2b', fontWeight: '800' }}>
                      🪐
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}

            {dreams.length === 0 && (
              <View style={styles.emptySpaceCenter}>
                <Text style={styles.emptySpaceText}>아직 기록된 꿈이 없어 궤도가 비어 있습니다. 🪐</Text>
              </View>
            )}
          </View>
        )}

        {/* Selected Dream Details Card (Figma bottom card style) */}
        {selectedDream && (
          <Card
            style={[
              styles.detailContainer,
              isDarkTheme && styles.darkDetailContainer
            ]}
            border={true}
            padding={16}
          >
            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>{selectedDream.date}</Text>
              <Pressable onPress={() => setSelectedDream(null)} style={styles.closeDetailBtn}>
                <Text style={styles.closeDetailText}>×</Text>
              </Pressable>
            </View>
            <Text style={[styles.detailTitle, isDarkTheme && styles.darkText]}>
              {selectedDream.title}
            </Text>
            {selectedDream.memo ? (
              <Text style={[styles.detailMemo, isDarkTheme && styles.darkSubText]}>
                {selectedDream.memo}
              </Text>
            ) : (
              <Text style={styles.detailNoMemo}>작성된 메모가 없습니다.</Text>
            )}
            <View style={styles.detailActions}>
              <Button
                label="기록 보기/수정"
                variant="primary"
                onPress={() => onRecordPress?.(selectedDream.date)}
                style={styles.editBtn}
                textStyle={styles.editBtnText}
              />
              <Button
                label="기록 삭제"
                variant="secondary"
                onPress={() => handleDelete(selectedDream.id)}
                style={styles.deleteBtn}
                textStyle={styles.deleteBtnText}
              />
            </View>
          </Card>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f5fc', // Clean light background matching settings
  },
  darkRoot: {
    backgroundColor: '#0a081a', // Immersive dark galaxy background
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
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
    fontWeight: '800',
    fontFamily: theme.typography.fontFamily,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
  },
  darkTabBar: {
    backgroundColor: '#1c1735',
    borderColor: 'rgba(117, 88, 247, 0.15)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: 'rgba(117, 88, 247, 0.1)',
  },
  tabItemText: {
    fontSize: 12,
    color: '#6f6a78',
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#7558f7',
    fontWeight: '800',
  },
  darkTabItemText: {
    color: '#cdcae2',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
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
    backgroundColor: '#0f0c26',
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
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
  },
  darkDetailContainer: {
    backgroundColor: '#1b1633',
    borderColor: 'rgba(117, 88, 247, 0.25)',
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
});
