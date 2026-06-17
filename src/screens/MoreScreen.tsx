import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../theme';
import type { HomeTabId } from '../types/home';
import { getSavedDreams } from '../utils/dreamStorage';

// 배지 아이템 타입 정의
type BadgeItem = {
  id: string;
  title: string;
  reqText: string;
  unlockedDesc: string;
  source: any;
  targetCount: number;
  type: 'total' | 'streak';
};

// 배지 상세 정보 모달 컴포넌트
type BadgeDetailModalProps = {
  visible: boolean;
  badge: BadgeItem | null;
  currentValue: number;
  isUnlocked: boolean;
  onClose: () => void;
};

// 더보기 화면 프로프 타입 정의
type MoreScreenProps = {
  active?: boolean;
  onTabPress?: (tabId: HomeTabId) => void;
};

function BadgeDetailModal({ visible, badge, currentValue, isUnlocked, onClose }: BadgeDetailModalProps) {
  if (!badge) return null;

  const progress = Math.min(1, currentValue / badge.targetCount);
  const percent = Math.round(progress * 100);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => false}>
          {/* Badge Image */}
          <View style={styles.modalImageContainer}>
            <Image
              source={badge.source}
              style={[styles.modalBadgeImage, !isUnlocked && styles.lockedImage]}
              resizeMode="contain"
            />
            {!isUnlocked && (
              <View style={styles.modalLockBadge}>
                <Text style={styles.modalLockText}>🔒</Text>
              </View>
            )}
          </View>

          {/* Badge Info */}
          <Text style={styles.modalBadgeTitle}>{badge.title}</Text>
          <Text style={styles.modalBadgeDesc}>{badge.reqText}</Text>
          <Text style={styles.modalBadgeStatus}>
            {isUnlocked ? `🎉 ${badge.unlockedDesc}` : `🔒 미획득 (조건: ${badge.targetCount}${badge.type === 'total' ? '회 기록' : '일 연속'})`}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>달성도</Text>
              <Text style={styles.progressValue}>
                {currentValue} / {badge.targetCount} ({percent}%)
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            </View>
          </View>

          {/* Close Button */}
          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>닫기</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────
export function MoreScreen({ active, onTabPress }: MoreScreenProps) {
  const { width } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // DB 및 프로필 정보 상태
  const [dreams, setDreams] = useState<any[]>([]);
  const [userName, setUserName] = useState('꿈결이');
  const [userEmail, setUserEmail] = useState('@kkumgyeol');
  const [userStatus, setUserStatus] = useState('오늘도 좋은 꿈 꾸세요 🌙');
  const [selectedMode, setSelectedMode] = useState<'dreamflow' | 'archive'>('dreamflow');
  
  // 리마인더 알림 상태
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');

  // 활성 왼쪽 탭 (스크롤 오프셋 동기화용)
  const [activeSubTab, setActiveSubTab] = useState('badge');

  // 모달 상태
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [isBadgeDetailVisible, setIsBadgeDetailVisible] = useState(false);

  // 백업 데이터 관리 입력창 상태
  const [backupJsonString, setBackupJsonString] = useState('');
  const [isBackupInputVisible, setIsBackupInputVisible] = useState(false);

  // ScrollView Ref 및 카드 위치 기록용 Ref
  const rightScrollRef = useRef<ScrollView>(null);
  const cardLayouts = useRef<Record<string, number>>({});

  // 1. 배지 목록 정의
  const badges: BadgeItem[] = useMemo(() => [
    {
      id: 'badge1',
      title: '꿈 기록 입문',
      reqText: '꿈 일기를 첫 번째로 등록하여 기록의 첫걸음을 떼보세요!',
      unlockedDesc: '기록 1회 달성!',
      source: require('../../assets/settings/badge-star.png'),
      targetCount: 1,
      type: 'total'
    },
    {
      id: 'badge2',
      title: '첫 꿈의 설렘',
      reqText: '꿈 일기를 10회 기록하여 꿈속 여정을 조금 더 친숙하게 만들어 보세요.',
      unlockedDesc: '기록 10회 달성!',
      source: require('../../assets/settings/badge-cloud.png'),
      targetCount: 10,
      type: 'total'
    },
    {
      id: 'badge3',
      title: '꿈 탐험가',
      reqText: '꿈 일기를 50회 이상 등록해 깊은 수면 속 숨겨진 세상을 탐험하세요.',
      unlockedDesc: '기록 50회 달성!',
      source: require('../../assets/settings/badge-planet.png'),
      targetCount: 50,
      type: 'total'
    },
    {
      id: 'badge4',
      title: '연속 3일 기록',
      reqText: '3일 연속으로 꿈을 빼놓지 않고 기록하여 꿈 습관의 기틀을 마련하세요.',
      unlockedDesc: '3일 연속 기록 성공!',
      source: require('../../assets/settings/badge-cal3.png'),
      targetCount: 3,
      type: 'streak'
    },
    {
      id: 'badge5',
      title: '연속 7일 기록',
      reqText: '7일 연속으로 밤하늘의 기억을 모아 꿈의 연속적인 흐름을 발견해 보세요.',
      unlockedDesc: '7일 연속 기록 성공!',
      source: require('../../assets/settings/badge-cal7.png'),
      targetCount: 7,
      type: 'streak'
    },
    {
      id: 'badge6',
      title: '연속 30일 기록',
      reqText: '한 달(30일) 연속으로 꿈을 빠짐없이 세심하게 추적해 완벽한 은하수를 이어보세요.',
      unlockedDesc: '30일 연속 기록 성공!',
      source: require('../../assets/settings/badge-cal30.png'),
      targetCount: 30,
      type: 'streak'
    }
  ], []);

  // 2. 연속 스트리크 일수 계산 유틸리티
  const maxStreak = useMemo(() => {
    if (dreams.length === 0) return 0;
    
    // YYYY-MM-DD 포맷 날짜만 추출 및 중복 제거
    const dates = dreams
      .map((d) => d.date)
      .filter((dateStr): dateStr is string => typeof dateStr === 'string' && dateStr.length === 10);
    
    const uniqueSortedDates = Array.from(new Set(dates)).sort();
    
    let maxS = 0;
    let currentS = 0;
    let prevMs: number | null = null;

    for (const dateStr of uniqueSortedDates) {
      const parts = dateStr.split('-');
      if (parts.length !== 3) continue;
      
      const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      current.setHours(0, 0, 0, 0);
      const currentMs = current.getTime();

      if (prevMs === null) {
        currentS = 1;
      } else {
        const diffDays = Math.round((currentMs - prevMs) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentS += 1;
        } else if (diffDays > 1) {
          if (currentS > maxS) {
            maxS = currentS;
          }
          currentS = 1;
        }
      }
      prevMs = currentMs;
    }

    return Math.max(maxS, currentS);
  }, [dreams]);

  // 3. 각 배지 획득 조건 체크
  const unlockedBadgesCount = useMemo(() => {
    let count = 0;
    badges.forEach((b) => {
      const val = b.type === 'total' ? dreams.length : maxStreak;
      if (val >= b.targetCount) {
        count += 1;
      }
    });
    return count;
  }, [dreams.length, maxStreak, badges]);

  // DB 로드 함수
  const loadData = async () => {
    try {
      // 꿈 데이터 로드
      const stored = await getSavedDreams();
      setDreams(stored);

      // 사용자 정보 로드
      const storedName = await AsyncStorage.getItem('@dreamlog_user_name');
      if (storedName) {
        setUserName(storedName);
        setEditName(storedName);
      } else {
        setUserName('꿈결이');
        setEditName('꿈결이');
      }

      const storedEmail = await AsyncStorage.getItem('@dreamlog_user_email');
      if (storedEmail) setUserEmail(storedEmail);

      const storedStatus = await AsyncStorage.getItem('@dreamlog_user_status');
      if (storedStatus) {
        setUserStatus(storedStatus);
        setEditStatus(storedStatus);
      } else {
        setUserStatus('오늘도 좋은 꿈 꾸세요 🌙');
        setEditStatus('오늘도 좋은 꿈 꾸세요 🌙');
      }

      // 설정 로드
      const storedModeVal = await AsyncStorage.getItem('@dreamlog_selected_mode');
      if (storedModeVal) {
        setSelectedMode(storedModeVal as any);
      }

      const storedReminder = await AsyncStorage.getItem('@dreamlog_reminder_enabled');
      if (storedReminder) {
        setReminderEnabled(storedReminder === 'true');
      }

      const storedReminderTime = await AsyncStorage.getItem('@dreamlog_reminder_time');
      if (storedReminderTime) {
        setReminderTime(storedReminderTime);
      }
    } catch (e) {
      console.error('Failed to load settings data:', e);
    }
  };

  useEffect(() => {
    if (active) {
      loadData();
      
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        duration: 300,
        easing: Easing.out(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [active, fadeAnim]);

  // 탭 클릭 시 해당 카드 위치로 스크롤 이동
  const handleSubTabPress = (tabKey: string) => {
    setActiveSubTab(tabKey);
    const targetY = cardLayouts.current[tabKey];
    if (targetY !== undefined) {
      rightScrollRef.current?.scrollTo({ y: targetY - 10, animated: true });
    }
  };

  // 프로필 정보 업데이트 저장
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('오류', '이름을 입력해주세요.');
      return;
    }
    try {
      await AsyncStorage.setItem('@dreamlog_user_name', editName.trim());
      await AsyncStorage.setItem('@dreamlog_user_status', editStatus.trim());
      setUserName(editName.trim());
      setUserStatus(editStatus.trim());
      setIsEditProfileVisible(false);
      Alert.alert('알림', '프로필 정보가 성공적으로 변경되었습니다!');
    } catch (e) {
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  // 모드 변경 함수
  const handleModeChange = async (mode: 'dreamflow' | 'archive') => {
    try {
      await AsyncStorage.setItem('@dreamlog_selected_mode', mode);
      setSelectedMode(mode);
      Alert.alert('알림', `${mode === 'dreamflow' ? '꿈결 모드' : '아카이브 모드'}로 변경되었습니다!`);
    } catch (e) {
      console.error('Failed to save mode selection:', e);
    }
  };

  // 리마인더 알림 토글 함수
  const handleReminderToggle = async (val: boolean) => {
    try {
      await AsyncStorage.setItem('@dreamlog_reminder_enabled', val ? 'true' : 'false');
      setReminderEnabled(val);
      if (val) {
        Alert.alert('알림', `오전 ${reminderTime}에 꿈 기록 리마인더 알림이 작동합니다.`);
      }
    } catch (e) {
      console.error('Failed to save reminder toggle:', e);
    }
  };

  // 리마인더 시간 변경 함수
  const handleReminderTimeChange = async (time: string) => {
    try {
      await AsyncStorage.setItem('@dreamlog_reminder_time', time);
      setReminderTime(time);
      if (reminderEnabled) {
        Alert.alert('알림', `알림 시간이 오전 ${time}으로 변경되었습니다.`);
      }
    } catch (e) {
      console.error('Failed to save reminder time:', e);
    }
  };

  // 전체 데이터 초기화 함수
  const handleClearAllData = () => {
    Alert.alert(
      '경고',
      '정말로 모든 꿈 기록을 지우시겠습니까?\n삭제된 기록은 영구적으로 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@dreamlog_saved_dreams');
              setDreams([]);
              Alert.alert('알림', '모든 꿈 기록이 초기화되었습니다.');
            } catch (e) {
              Alert.alert('오류', '초기화에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  // 백업 데이터 다운로드
  const handleExportBackup = () => {
    const backupStr = JSON.stringify(dreams);
    setBackupJsonString(backupStr);
    setIsBackupInputVisible(true);
    Alert.alert('백업 생성 완료', '아래의 백업 텍스트 코드를 복사해서 메모장 등에 안전하게 보관하세요.');
  };

  // 백업 데이터 불러오기 복구
  const handleImportBackup = () => {
    if (!backupJsonString.trim()) {
      Alert.alert('오류', '불러올 백업 텍스트 코드를 입력해주세요.');
      return;
    }
    try {
      const parsed = JSON.parse(backupJsonString.trim());
      if (!Array.isArray(parsed)) {
        throw new Error('백업 데이터가 올바른 배열 포맷이 아닙니다.');
      }
      
      Alert.alert(
        '확인',
        `가져오려는 데이터는 총 ${parsed.length}건입니다. 기존 데이터에 병합하시겠습니까?\n아니오를 선택하면 기존 데이터를 모두 덮어씁니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '병합하여 가져오기',
            onPress: async () => {
              const combined = [...dreams];
              parsed.forEach((importedItem: any) => {
                if (importedItem.id && !combined.some(d => d.id === importedItem.id)) {
                  combined.push(importedItem);
                }
              });
              await AsyncStorage.setItem('@dreamlog_saved_dreams', JSON.stringify(combined));
              setDreams(combined);
              setIsBackupInputVisible(false);
              setBackupJsonString('');
              Alert.alert('완료', '백업 데이터 병합 복원이 완료되었습니다!');
            }
          },
          {
            text: '덮어쓰기',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.setItem('@dreamlog_saved_dreams', JSON.stringify(parsed));
              setDreams(parsed);
              setIsBackupInputVisible(false);
              setBackupJsonString('');
              Alert.alert('완료', '백업 데이터 덮어쓰기 복원이 완료되었습니다!');
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('오류', '올바른 백업 형식이 아니거나 데이터 분석에 실패했습니다.');
    }
  };

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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      <Animated.View style={[styles.container, animatedStyle]}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/settings/profile-avatar.png')}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerLogoText}>꿈결</Text>
            <View style={styles.logoPlusBadge}>
              <Text style={styles.logoPlusBadgeText}>+</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.notificationBell}
              onPress={() => Alert.alert('알림', '새로운 알림이 없습니다.')}
            >
              <Text style={styles.bellEmoji}>🔔</Text>
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>2</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Profile Card (Top Panel) */}
        <View style={styles.profileCard}>
          <View style={styles.profileMainRow}>
            <Image
              source={require('../../assets/settings/profile-avatar.png')}
              style={styles.profileAvatarLarge}
            />
            <View style={styles.profileInfoColumn}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileNameText}>{userName}</Text>
                <Pressable
                  style={styles.editProfileButton}
                  onPress={() => {
                    setEditName(userName);
                    setEditStatus(userStatus);
                    setIsEditProfileVisible(true);
                  }}
                >
                  <Text style={styles.editPencilEmoji}>✏️</Text>
                </Pressable>
              </View>
              <Text style={styles.profileHandleText}>{userEmail}</Text>
              <Text style={styles.profileStatusText}>{userStatus}</Text>
            </View>
            <View style={styles.profileChevronContainer}>
              <Text style={styles.profileChevronText}>&gt;</Text>
            </View>
          </View>
          
          <View style={styles.profileDivider} />

          {/* User Stats Grid Row */}
          <View style={styles.statsRowGrid}>
            <View style={styles.statColumnItem}>
              <Text style={styles.statLabelText}>기록한 꿈</Text>
              <Text style={styles.statValueText}>{dreams.length}</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statColumnItem}>
              <Text style={styles.statLabelText}>연속 기록</Text>
              <Text style={styles.statValueText}>{maxStreak}일</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statColumnItem}>
              <Text style={styles.statLabelText}>획득 배지</Text>
              <Text style={styles.statValueText}>{unlockedBadgesCount}</Text>
            </View>
          </View>
        </View>

        {/* Main Side-by-Side Dashboard Container */}
        <View style={styles.dashboardBody}>
          
          {/* Left Column Settings Menu (Width: 38%) */}
          <View style={styles.leftMenuColumn}>
            <View style={styles.leftMenuCard}>
              <Pressable
                style={[styles.menuItemRow, activeSubTab === 'badge' && styles.menuItemRowActive]}
                onPress={() => handleSubTabPress('badge')}
              >
                <Text style={styles.menuItemEmoji}>⭐</Text>
                <Text style={[styles.menuItemText, activeSubTab === 'badge' && styles.menuItemTextActive]}>배지 컬렉션</Text>
                <View style={styles.badgeCountPill}>
                  <Text style={styles.badgeCountPillText}>{unlockedBadgesCount}</Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.menuItemRow, activeSubTab === 'mode' && styles.menuItemRowActive]}
                onPress={() => handleSubTabPress('mode')}
              >
                <Text style={styles.menuItemEmoji}>☁️</Text>
                <Text style={[styles.menuItemText, activeSubTab === 'mode' && styles.menuItemTextActive]}>모드 선택</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItemRow, activeSubTab === 'reminder' && styles.menuItemRowActive]}
                onPress={() => handleSubTabPress('reminder')}
              >
                <Text style={styles.menuItemEmoji}>🔔</Text>
                <Text style={[styles.menuItemText, activeSubTab === 'reminder' && styles.menuItemTextActive]}>리마인더 설정</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItemRow, activeSubTab === 'data' && styles.menuItemRowActive]}
                onPress={() => handleSubTabPress('data')}
              >
                <Text style={styles.menuItemEmoji}>📁</Text>
                <Text style={[styles.menuItemText, activeSubTab === 'data' && styles.menuItemTextActive]}>데이터 관리</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItemRow, activeSubTab === 'security' && styles.menuItemRowActive]}
                onPress={() => handleSubTabPress('security')}
              >
                <Text style={styles.menuItemEmoji}>🛡️</Text>
                <Text style={[styles.menuItemText, activeSubTab === 'security' && styles.menuItemTextActive]}>보안 및 계정</Text>
              </Pressable>

              <Pressable
                style={[styles.menuItemRow, activeSubTab === 'info' && styles.menuItemRowActive]}
                onPress={() => handleSubTabPress('info')}
              >
                <Text style={styles.menuItemEmoji}>ℹ️</Text>
                <Text style={[styles.menuItemText, activeSubTab === 'info' && styles.menuItemTextActive]}>앱 정보</Text>
              </Pressable>
            </View>
          </View>

          {/* Right Column Settings Detail Scroll Panel (Width: 62%) */}
          <ScrollView
            ref={rightScrollRef}
            style={styles.rightDetailScrollColumn}
            contentContainerStyle={styles.rightDetailContentStyle}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* 1. Badge Collection Card */}
            <View
              style={styles.detailCard}
              onLayout={(e) => {
                cardLayouts.current['badge'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.detailCardHeader}>
                <Text style={styles.detailCardTitle}>배지 컬렉션</Text>
                <Pressable onPress={() => handleSubTabPress('badge')}>
                  <Text style={styles.detailCardHeaderLink}>전체 보기 &gt;</Text>
                </Pressable>
              </View>

              {/* Badges Grid */}
              <View style={styles.badgesGridContainer}>
                {badges.map((b) => {
                  const val = b.type === 'total' ? dreams.length : maxStreak;
                  const unlocked = val >= b.targetCount;
                  
                  return (
                    <Pressable
                      key={b.id}
                      style={styles.badgeGridCell}
                      onPress={() => {
                        setSelectedBadge(b);
                        setIsBadgeDetailVisible(true);
                      }}
                    >
                      <View style={styles.badgeImageWrapper}>
                        <Image
                          source={b.source}
                          style={[styles.badgeImage, !unlocked && styles.lockedImage]}
                          resizeMode="contain"
                        />
                        {!unlocked && (
                          <View style={styles.lockBadgeIconContainer}>
                            <Text style={styles.lockBadgeIconText}>🔒</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.badgeCellTitleText} numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text style={styles.badgeCellSubtitleText} numberOfLines={1}>
                        {b.unlockedDesc.split('!')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={({ pressed }) => [styles.cardFooterButton, pressed && styles.pressed]}
                onPress={() => {
                  Alert.alert('배지 컬렉션', `현재 꿈을 계속 기록하며 연속 달성일에 따라 총 6개의 3D 배지를 획득하실 수 있습니다!`);
                }}
              >
                <Text style={styles.cardFooterButtonText}>더 많은 배지 보기 &gt;</Text>
              </Pressable>
            </View>

            {/* 2. Mode Selection Card */}
            <View
              style={styles.detailCard}
              onLayout={(e) => {
                cardLayouts.current['mode'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.detailCardHeader}>
                <Text style={styles.detailCardTitle}>모드 선택</Text>
              </View>
              <Text style={styles.detailCardSubtitle}>
                나의 상황과 목적에 맞게 모드를 선택해 보세요.
              </Text>

              {/* Mode Select Grid */}
              <View style={styles.modeCardsRow}>
                {/* Mode 1: Dreamflow */}
                <Pressable
                  style={[
                    styles.modeOptionCard,
                    selectedMode === 'dreamflow' && styles.modeOptionCardActive
                  ]}
                  onPress={() => handleModeChange('dreamflow')}
                >
                  <Image
                    source={require('../../assets/settings/mode-sun.png')}
                    style={styles.modeOptionImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.modeOptionTitle}>꿈결 모드</Text>
                  <Text style={styles.modeOptionDesc}>
                    매일의 꿈을 기록하고 분석하며 나만의 패턴을 발견하는 모드
                  </Text>
                  <Text style={styles.modeOptionTags}>기록 • 분석 • 통계</Text>
                  <View style={[styles.radioButton, selectedMode === 'dreamflow' && styles.radioButtonActive]}>
                    {selectedMode === 'dreamflow' && <View style={styles.radioButtonInner} />}
                  </View>
                </Pressable>

                {/* Mode 2: Archive */}
                <Pressable
                  style={[
                    styles.modeOptionCard,
                    selectedMode === 'archive' && styles.modeOptionCardActive
                  ]}
                  onPress={() => handleModeChange('archive')}
                >
                  <Image
                    source={require('../../assets/settings/mode-cloud-box.png')}
                    style={styles.modeOptionImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.modeOptionTitle}>아카이브 모드</Text>
                  <Text style={styles.modeOptionDesc}>
                    기록을 정리하고 보관하며 과거의 나를 돌아보는 모드
                  </Text>
                  <Text style={styles.modeOptionTags}>정리 • 보관 • 회고</Text>
                  <View style={[styles.radioButton, selectedMode === 'archive' && styles.radioButtonActive]}>
                    {selectedMode === 'archive' && <View style={styles.radioButtonInner} />}
                  </View>
                </Pressable>
              </View>

              {/* Tip Banner */}
              <View style={styles.tipBannerRow}>
                <View style={styles.tipBannerLeft}>
                  <Text style={styles.tipBannerText}>
                    ☁️ 모드는 언제든 변경할 수 있어요. 설정 &gt; 모드 선택에서 간편하게 전환할 수 있어요.
                  </Text>
                </View>
                <Image
                  source={require('../../assets/settings/tip-star.png')}
                  style={styles.tipStarImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* 3. Reminder Settings Card */}
            <View
              style={styles.detailCard}
              onLayout={(e) => {
                cardLayouts.current['reminder'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.detailCardHeader}>
                <Text style={styles.detailCardTitle}>리마인더 설정</Text>
              </View>
              <Text style={styles.detailCardSubtitle}>
                매일 아침 꿈을 잊어버리기 전에 즉시 기록할 수 있게 알려 드려요.
              </Text>

              <View style={styles.settingsActionRow}>
                <Text style={styles.actionRowLabelText}>리마인더 푸시 알림 받기</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={handleReminderToggle}
                  trackColor={{ false: '#dcd8ed', true: '#7558f7' }}
                  thumbColor="#ffffff"
                />
              </View>

              {reminderEnabled && (
                <View style={styles.timePickerRow}>
                  <Text style={styles.timePickerLabel}>알림 수신 시간 선택</Text>
                  <View style={styles.timeSelectButtons}>
                    {['07:00', '08:00', '09:00', '10:00'].map((time) => (
                      <Pressable
                        key={time}
                        style={[styles.timeOptionBtn, reminderTime === time && styles.timeOptionBtnActive]}
                        onPress={() => handleReminderTimeChange(time)}
                      >
                        <Text style={[styles.timeOptionText, reminderTime === time && styles.timeOptionTextActive]}>
                          {time}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* 4. Data Management Card */}
            <View
              style={styles.detailCard}
              onLayout={(e) => {
                cardLayouts.current['data'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.detailCardHeader}>
                <Text style={styles.detailCardTitle}>데이터 관리</Text>
              </View>
              <Text style={styles.detailCardSubtitle}>
                꿈 기록을 백업해 보관하거나 기기 변경 시 복구할 수 있습니다.
              </Text>

              <View style={styles.dataButtonContainer}>
                <Pressable style={styles.dataActionButton} onPress={handleExportBackup}>
                  <Text style={styles.dataActionButtonText}>📥 꿈 기록 백업 코드 만들기</Text>
                </Pressable>

                <Pressable
                  style={[styles.dataActionButton, isBackupInputVisible && styles.dataActionButtonActive]}
                  onPress={() => setIsBackupInputVisible(!isBackupInputVisible)}
                >
                  <Text style={styles.dataActionButtonText}>📤 꿈 기록 백업 불러오기</Text>
                </Pressable>

                {isBackupInputVisible && (
                  <View style={styles.backupInputArea}>
                    <TextInput
                      style={styles.backupTextInput}
                      placeholder="여기에 복사한 백업 데이터 코드를 붙여넣어주세요."
                      multiline
                      value={backupJsonString}
                      onChangeText={setBackupJsonString}
                      placeholderTextColor="#a09cb0"
                    />
                    <View style={styles.backupActionButtons}>
                      <Pressable style={styles.backupSubBtn} onPress={handleImportBackup}>
                        <Text style={styles.backupSubBtnText}>복구 실행</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.backupSubBtn, styles.backupSubBtnCancel]}
                        onPress={() => {
                          setIsBackupInputVisible(false);
                          setBackupJsonString('');
                        }}
                      >
                        <Text style={[styles.backupSubBtnText, styles.backupSubBtnCancelText]}>취소</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                <View style={styles.dangerDivider} />

                <Pressable style={[styles.dataActionButton, styles.dangerButton]} onPress={handleClearAllData}>
                  <Text style={[styles.dataActionButtonText, styles.dangerButtonText]}>⚠️ 모든 꿈 기록 영구 삭제</Text>
                </Pressable>
              </View>
            </View>

            {/* 5. Security Card */}
            <View
              style={styles.detailCard}
              onLayout={(e) => {
                cardLayouts.current['security'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.detailCardHeader}>
                <Text style={styles.detailCardTitle}>보안 및 계정</Text>
              </View>
              <Text style={styles.detailCardSubtitle}>
                앱 접근 권한 및 보안 설정을 제어할 수 있는 임시 영역입니다.
              </Text>
              
              <View style={styles.settingsActionRow}>
                <Text style={styles.actionRowLabelText}>꿈로그 비밀번호 잠금 설정</Text>
                <Switch
                  value={false}
                  onValueChange={() => Alert.alert('보안', '비밀번호 잠금은 다음 업데이트에서 출시됩니다!')}
                  trackColor={{ false: '#dcd8ed', true: '#7558f7' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 6. App Info Card */}
            <View
              style={styles.detailCard}
              onLayout={(e) => {
                cardLayouts.current['info'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.detailCardHeader}>
                <Text style={styles.detailCardTitle}>앱 정보</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>앱 버전</Text>
                <Text style={styles.infoRowValue}>v1.0.0 (beta)</Text>
              </View>
              <View style={styles.infoSeparator} />
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>개발진 정보</Text>
                <Text style={styles.infoRowValue}>Google DeepMind Team</Text>
              </View>
              <View style={styles.infoSeparator} />
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowLabel}>적용 글꼴</Text>
                <Text style={styles.infoRowValue}>Pretendard Semibold / Medium</Text>
              </View>
            </View>
          </ScrollView>

        </View>
      </Animated.View>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent visible={isEditProfileVisible}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editProfileModalContent}
          >
            <Text style={styles.editModalTitle}>프로필 정보 수정</Text>
            
            <View style={styles.inputFormGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="꿈결에 비친 나의 이름"
                placeholderTextColor="#a09cb0"
              />
            </View>

            <View style={styles.inputFormGroup}>
              <Text style={styles.inputLabel}>오늘의 한마디 (상태 메시지)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editStatus}
                onChangeText={setEditStatus}
                placeholder="오늘 하루의 꿈 다짐"
                placeholderTextColor="#a09cb0"
              />
            </View>

            <View style={styles.modalActionRow}>
              <Pressable style={styles.modalSaveButton} onPress={handleSaveProfile}>
                <Text style={styles.modalSaveButtonText}>저장</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, styles.modalCancelButton]}
                onPress={() => setIsEditProfileVisible(false)}
              >
                <Text style={[styles.modalSaveButtonText, styles.modalCancelButtonText]}>취소</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        visible={isBadgeDetailVisible}
        badge={selectedBadge}
        currentValue={selectedBadge ? (selectedBadge.type === 'total' ? dreams.length : maxStreak) : 0}
        isUnlocked={selectedBadge ? (selectedBadge.type === 'total' ? dreams.length >= selectedBadge.targetCount : maxStreak >= selectedBadge.targetCount) : false}
        onClose={() => {
          setIsBadgeDetailVisible(false);
          setSelectedBadge(null);
        }}
      />
    </SafeAreaView>
  );

  // 배지 획득 판단 유틸
  function isUnlockedBadge(badge: BadgeItem): boolean {
    const val = badge.type === 'total' ? dreams.length : maxStreak;
    return val >= badge.targetCount;
  }
}

// ─── 스타일 시트 ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    backgroundColor: '#f6f5fc',
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 32 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7558f7',
    marginRight: 8,
  },
  headerLogoText: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily,
    fontWeight: '800',
    color: '#7558f7',
  },
  logoPlusBadge: {
    backgroundColor: '#ffd83b',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    marginLeft: 3,
  },
  logoPlusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3d3000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellEmoji: {
    fontSize: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#7558f7',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f6f5fc',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
    shadowColor: '#7558f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#e2daff',
  },
  profileInfoColumn: {
    flex: 1,
    marginLeft: 14,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d237a',
    fontFamily: theme.typography.fontFamily,
  },
  editProfileButton: {
    marginLeft: 6,
    padding: 4,
  },
  editPencilEmoji: {
    fontSize: 13,
  },
  profileHandleText: {
    fontSize: 12,
    color: '#8a82ad',
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
  },
  profileStatusText: {
    fontSize: 12,
    color: '#6f6a78',
    marginTop: 4,
    fontFamily: theme.typography.fontFamily,
  },
  profileChevronContainer: {
    paddingLeft: 8,
  },
  profileChevronText: {
    color: '#8a82ad',
    fontSize: 18,
    fontWeight: '600',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#f2effc',
    marginVertical: 12,
  },
  statsRowGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statColumnItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabelText: {
    fontSize: 11,
    color: '#8a82ad',
    fontFamily: theme.typography.fontFamily,
    marginBottom: 4,
  },
  statValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d237a',
    fontFamily: theme.typography.fontFamily,
  },
  statSeparator: {
    width: 1,
    height: 24,
    backgroundColor: '#f2effc',
  },
  dashboardBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 74, // BottomTab 높이 대비 넉넉하게 마진 부여
  },
  leftMenuColumn: {
    flex: 0.38,
  },
  leftMenuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  menuItemRowActive: {
    backgroundColor: '#ece8ff',
  },
  menuItemEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  menuItemText: {
    fontSize: 11.5,
    color: '#6f6a78',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
    flex: 1,
  },
  menuItemTextActive: {
    color: '#7558f7',
    fontWeight: '700',
  },
  badgeCountPill: {
    backgroundColor: '#7558f7',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeCountPillText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  rightDetailScrollColumn: {
    flex: 0.62,
  },
  rightDetailContentStyle: {
    paddingBottom: 24,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 218, 255, 0.72)',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d237a',
    fontFamily: theme.typography.fontFamily,
  },
  detailCardHeaderLink: {
    fontSize: 10,
    color: '#7558f7',
    fontWeight: '700',
  },
  detailCardSubtitle: {
    fontSize: 11,
    color: '#8a82ad',
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily,
    lineHeight: 14,
  },
  badgesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 12,
  },
  badgeGridCell: {
    width: '31%',
    alignItems: 'center',
  },
  badgeImageWrapper: {
    width: 48,
    height: 48,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeImage: {
    width: 44,
    height: 44,
  },
  lockedImage: {
    opacity: 0.28,
  },
  lockBadgeIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2daff',
  },
  lockBadgeIconText: {
    fontSize: 8,
  },
  badgeCellTitleText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2d237a',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    width: '100%',
  },
  badgeCellSubtitleText: {
    fontSize: 8,
    color: '#8a82ad',
    marginTop: 1,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    width: '100%',
  },
  cardFooterButton: {
    borderTopWidth: 1,
    borderColor: '#f2effa',
    paddingTop: 10,
    marginTop: 4,
    alignItems: 'center',
  },
  cardFooterButtonText: {
    fontSize: 11,
    color: '#7558f7',
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily,
  },
  modeCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeOptionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f0ecfc',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  modeOptionCardActive: {
    borderColor: '#7558f7',
    backgroundColor: '#fbfcff',
  },
  modeOptionImage: {
    width: 68,
    height: 52,
    marginBottom: 6,
  },
  modeOptionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2d237a',
    marginBottom: 2,
    fontFamily: theme.typography.fontFamily,
  },
  modeOptionDesc: {
    fontSize: 8.5,
    color: '#8a82ad',
    textAlign: 'center',
    lineHeight: 11,
    marginBottom: 4,
    height: 33, // 3줄 기준 고정 높이
    fontFamily: theme.typography.fontFamily,
  },
  modeOptionTags: {
    fontSize: 8.5,
    color: '#7558f7',
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily,
  },
  radioButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#c5bed6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: '#7558f7',
  },
  radioButtonInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7558f7',
  },
  tipBannerRow: {
    backgroundColor: '#f4f1ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipBannerLeft: {
    flex: 1,
    marginRight: 6,
  },
  tipBannerText: {
    fontSize: 8.5,
    color: '#7558f7',
    lineHeight: 12,
    fontFamily: theme.typography.fontFamily,
  },
  tipStarImage: {
    width: 24,
    height: 18,
  },
  settingsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  actionRowLabelText: {
    fontSize: 11.5,
    color: '#4e485e',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
  },
  timePickerRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: '#f2effa',
    paddingTop: 10,
  },
  timePickerLabel: {
    fontSize: 10.5,
    color: '#8a82ad',
    marginBottom: 6,
    fontFamily: theme.typography.fontFamily,
  },
  timeSelectButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  timeOptionBtn: {
    flex: 1,
    backgroundColor: '#f4f3f8',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eceaf2',
  },
  timeOptionBtnActive: {
    backgroundColor: '#7558f7',
    borderColor: '#7558f7',
  },
  timeOptionText: {
    fontSize: 11,
    color: '#6f6a78',
    fontWeight: '600',
  },
  timeOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dataButtonContainer: {
    gap: 6,
    marginTop: 4,
  },
  dataActionButton: {
    backgroundColor: '#f5f4fc',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e7e2ff',
  },
  dataActionButtonActive: {
    borderColor: '#7558f7',
    backgroundColor: '#ece8ff',
  },
  dataActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5542a6',
    fontFamily: theme.typography.fontFamily,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: '#f7eff0',
    marginVertical: 4,
  },
  dangerButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffd1d1',
  },
  dangerButtonText: {
    color: '#d64545',
  },
  backupInputArea: {
    marginTop: 4,
    backgroundColor: '#fbfcff',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#7558f7',
  },
  backupTextInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceaf2',
    borderRadius: 6,
    padding: 8,
    fontSize: 10,
    height: 70,
    color: '#2d237a',
    textAlignVertical: 'top',
    fontFamily: theme.typography.fontFamily,
  },
  backupActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  backupSubBtn: {
    backgroundColor: '#7558f7',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  backupSubBtnText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  backupSubBtnCancel: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceaf2',
  },
  backupSubBtnCancelText: {
    color: '#6f6a78',
  },
  infoRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoRowLabel: {
    fontSize: 11.5,
    color: '#8a82ad',
    fontFamily: theme.typography.fontFamily,
  },
  infoRowValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2d237a',
    fontFamily: theme.typography.fontFamily,
  },
  infoSeparator: {
    height: 1,
    backgroundColor: '#f2effa',
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 20, 41, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2daff',
  },
  modalImageContainer: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  modalBadgeImage: {
    width: 80,
    height: 80,
  },
  modalLockBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2daff',
  },
  modalLockText: {
    fontSize: 12,
  },
  modalBadgeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2d237a',
    marginBottom: 6,
    fontFamily: theme.typography.fontFamily,
  },
  modalBadgeDesc: {
    fontSize: 12,
    color: '#6f6a78',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily,
    paddingHorizontal: 8,
  },
  modalBadgeStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7558f7',
    marginBottom: 16,
    fontFamily: theme.typography.fontFamily,
  },
  progressContainer: {
    width: '100%',
    backgroundColor: '#f9f8fe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eceaf2',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: '#8a82ad',
    fontFamily: theme.typography.fontFamily,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2d237a',
    fontFamily: theme.typography.fontFamily,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e7e2ff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7558f7',
    borderRadius: 4,
  },
  modalCloseButton: {
    backgroundColor: '#7558f7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  editProfileModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#e2daff',
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d237a',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },
  inputFormGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8a82ad',
    marginBottom: 5,
    fontFamily: theme.typography.fontFamily,
  },
  modalTextInput: {
    backgroundColor: '#f7f6fc',
    borderWidth: 1,
    borderColor: '#eceaf2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#2d237a',
    fontFamily: theme.typography.fontFamily,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#7558f7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eceaf2',
  },
  modalCancelButtonText: {
    color: '#6f6a78',
  },
  pressed: {
    opacity: 0.75,
  },
  editProfileModalContentContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
