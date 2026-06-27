import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme, type TextSizePreference } from '../context/ThemeContext';
import { theme } from '../theme';
import type { HomeTabId } from '../types/home';
import { getSavedDreams } from '../utils/dreamStorage';

type BadgeItem = {
  id: string;
  title: string;
  reqText: string;
  unlockedDesc: string;
  source: number;
  targetCount: number;
  type: 'total' | 'streak';
};

type MoreScreenProps = {
  active?: boolean;
  userName?: string;
  onUserNameChange?: (userName: string) => void;
  onTabPress?: (tabId: HomeTabId) => void;
};
const ARCHIVE_VIEW_MODE_KEY = '@dreamlog_archive_view_mode';
type RecordModeInfo = {
  title: string;
  description: string;
  detailTitle: string;
  detailDescription: string;
  bulletPoints: string[];
  image: number;
  mode: 'constellation' | 'planet';
};

type SectionHeaderProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  isDark: boolean;
  styles: ReturnType<typeof createStyles>;
};

const TEXT_SIZE_OPTIONS: {
  value: TextSizePreference;
  label: string;
  preview: string;
}[] = [
  { value: 'small', label: '작게', preview: '가' },
  { value: 'default', label: '기본', preview: '가' },
  { value: 'large', label: '크게', preview: '가' },
];

const REMINDER_TIMES = ['07:00', '08:00', '09:00', '10:00'];
const SETTINGS_SHORTCUTS = [
  { id: 'badges', title: '배지', icon: 'trophy-outline' },
  { id: 'record', title: '기록 모드', icon: 'layers-outline' },
  { id: 'display', title: '화면', icon: 'contrast-outline' },
  { id: 'reminder', title: '알림', icon: 'notifications-outline' },
  { id: 'data', title: '데이터', icon: 'folder-open-outline' },
  { id: 'account', title: '계정', icon: 'shield-checkmark-outline' },
] as const;

function SectionHeader({
  icon,
  title,
  description,
  isDark,
  styles,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, isDark && styles.darkSectionIcon]}>
        <Ionicons name={icon} size={20} color={isDark ? '#b9adff' : '#6f52e8'} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{title}</Text>
        {description ? (
          <Text style={[styles.sectionDescription, isDark && styles.darkSubText]}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type BadgeDetailModalProps = {
  visible: boolean;
  badge: BadgeItem | null;
  currentValue: number;
  isUnlocked: boolean;
  isDark: boolean;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
};

function BadgeDetailModal({
  visible,
  badge,
  currentValue,
  isUnlocked,
  isDark,
  styles,
  onClose,
}: BadgeDetailModalProps) {
  if (!badge) return null;

  const percent = Math.min(100, Math.round((currentValue / badge.targetCount) * 100));

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          accessibilityRole="none"
          style={[styles.modalCard, isDark && styles.darkCard]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.modalBadgeWrap}>
            <Image
              source={badge.source}
              style={[styles.modalBadgeImage, !isUnlocked && styles.lockedImage]}
              resizeMode="contain"
            />
            {!isUnlocked ? (
              <View style={[styles.lockIcon, isDark && styles.darkLockIcon]}>
                <Ionicons name="lock-closed" size={15} color="#7C67E8" />
              </View>
            ) : null}
          </View>
          <Text style={[styles.modalTitle, isDark && styles.darkText]}>{badge.title}</Text>
          <Text style={[styles.modalDescription, isDark && styles.darkSubText]}>
            {badge.reqText}
          </Text>
          <View style={[styles.statusPill, isUnlocked && styles.statusPillUnlocked]}>
            <Ionicons
              name={isUnlocked ? 'checkmark-circle' : 'lock-closed'}
              size={16}
              color={isUnlocked ? '#29866A' : '#7C67E8'}
            />
            <Text
              style={[
                styles.statusPillText,
                isUnlocked && styles.statusPillTextUnlocked,
              ]}
            >
              {isUnlocked ? badge.unlockedDesc : '아직 획득하지 못했어요'}
            </Text>
          </View>
          <View style={[styles.progressBox, isDark && styles.darkInset]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, isDark && styles.darkSubText]}>달성도</Text>
              <Text style={[styles.progressValue, isDark && styles.darkText]}>
                {currentValue} / {badge.targetCount}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
          </View>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>닫기</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function MoreScreen({
  active,
  userName: propUserName,
  onUserNameChange,
  onTabPress,
}: MoreScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const settingsScrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const {
    isDark,
    textSize,
    fontScale,
    setTextSize,
  } = useTheme();
  const styles = useMemo(() => createStyles(fontScale), [fontScale]);

  const [dreams, setDreams] = useState<any[]>([]);
  const [userName, setUserName] = useState(propUserName || '꿈결님');
  const [userEmail, setUserEmail] = useState('@kkumgyeol');
  const [userStatus, setUserStatus] = useState('오늘도 좋은 꿈 꾸세요');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [isBadgeDetailVisible, setIsBadgeDetailVisible] = useState(false);
  const [backupJsonString, setBackupJsonString] = useState('');
  const [isBackupInputVisible, setIsBackupInputVisible] = useState(false);
  const [selectedRecordModeInfo, setSelectedRecordModeInfo] = useState<RecordModeInfo | null>(null);

  const recordModeInfoList = useMemo<RecordModeInfo[]>(
    () => [
      {
        title: '별자리 기록',
        description:
          '꿈을 기록할 때마다 이번 달 별자리가 점점 채워져요. 남은 점과 진행률을 바로 확인할 수 있어요.',
        detailTitle: '별자리 기록 안내',
        detailDescription:
          '한 달 동안 선택된 별자리를 기준으로 꿈 기록이 별처럼 하나씩 채워지는 방식이에요.',
        bulletPoints: [
          '기록 한 개마다 별자리 점 한 칸이 채워져요.',
          '월별로 다른 별자리 레이아웃을 넘겨 보며 확인할 수 있어요.',
          '아카이브에서 이번 달 진행률과 이전 달 별자리를 함께 볼 수 있어요.',
        ],
        image: require('../../assets/settings/mode-sun.png'),
        mode: 'constellation',
      },
      {
        title: '행성 수집',
        description:
          '기록을 완료할 때마다 우주에 새로운 행성이 하나씩 더해져요. 모양과 분위기가 다른 수집 보상이 생깁니다.',
        detailTitle: '행성 수집 안내',
        detailDescription:
          '꿈을 남길수록 행성이 하나씩 모여 나만의 우주가 커지는 수집형 기록 방식이에요.',
        bulletPoints: [
          '기록 완료 시 새로운 행성 아이템이 추가돼요.',
          '행성 수와 분위기를 월별 아카이브에서 한 번에 볼 수 있어요.',
          '별자리 기록과 달리 채움 진행률보다 수집 결과를 중심으로 감상할 수 있어요.',
        ],
        image: require('../../assets/settings/mode-cloud-box.png'),
        mode: 'planet',
      },
    ],
    [],
  );

  const scrollToSettingsSection = (id: string) => {
    const y = sectionOffsets.current[id];
    if (typeof y === 'number') {
      settingsScrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
    }
  };

  const badges = useMemo<BadgeItem[]>(
    () => [
      {
        id: 'badge1',
        title: '꿈 기록 입문',
        reqText: '첫 번째 꿈 일기를 등록해 기록을 시작해 보세요.',
        unlockedDesc: '첫 기록을 달성했어요',
        source: require('../../assets/settings/badge-star.png'),
        targetCount: 1,
        type: 'total',
      },
      {
        id: 'badge2',
        title: '첫 꿈의 설렘',
        reqText: '꿈 일기를 10회 기록해 꿈속 여정에 익숙해져 보세요.',
        unlockedDesc: '기록 10회를 달성했어요',
        source: require('../../assets/settings/badge-cloud.png'),
        targetCount: 10,
        type: 'total',
      },
      {
        id: 'badge3',
        title: '꿈 탐험가',
        reqText: '꿈 일기를 50회 이상 등록해 나만의 꿈 패턴을 발견해 보세요.',
        unlockedDesc: '기록 50회를 달성했어요',
        source: require('../../assets/settings/badge-planet.png'),
        targetCount: 50,
        type: 'total',
      },
      {
        id: 'badge4',
        title: '연속 3일 기록',
        reqText: '3일 연속으로 꿈을 기록해 작은 습관을 만들어 보세요.',
        unlockedDesc: '3일 연속 기록에 성공했어요',
        source: require('../../assets/settings/badge-cal3.png'),
        targetCount: 3,
        type: 'streak',
      },
      {
        id: 'badge5',
        title: '연속 7일 기록',
        reqText: '일주일 동안 빠짐없이 꿈의 흐름을 이어 보세요.',
        unlockedDesc: '7일 연속 기록에 성공했어요',
        source: require('../../assets/settings/badge-cal7.png'),
        targetCount: 7,
        type: 'streak',
      },
      {
        id: 'badge6',
        title: '연속 30일 기록',
        reqText: '한 달 동안 꿈을 기록해 오래 이어지는 습관을 완성해 보세요.',
        unlockedDesc: '30일 연속 기록에 성공했어요',
        source: require('../../assets/settings/badge-cal30.png'),
        targetCount: 30,
        type: 'streak',
      },
    ],
    [],
  );

  const maxStreak = useMemo(() => {
    const dates = dreams
      .map((dream) => dream.date)
      .filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date));
    const uniqueDates = Array.from(new Set(dates)).sort();
    let max = 0;
    let current = 0;
    let previous: number | null = null;

    uniqueDates.forEach((date) => {
      const [year, month, day] = date.split('-').map(Number);
      const timestamp = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
      const gap = previous === null ? 0 : Math.round((timestamp - previous) / 86_400_000);
      current = previous === null || gap === 1 ? current + 1 : 1;
      max = Math.max(max, current);
      previous = timestamp;
    });

    return max;
  }, [dreams]);

  const unlockedBadgesCount = useMemo(
    () =>
      badges.filter((badge) => {
        const value = badge.type === 'total' ? dreams.length : maxStreak;
        return value >= badge.targetCount;
      }).length,
    [badges, dreams.length, maxStreak],
  );

  const loadData = async () => {
    try {
      const [
        storedDreams,
        storedName,
        storedEmail,
        storedStatus,
        storedReminder,
        storedReminderTime,
      ] = await Promise.all([
        getSavedDreams(),
        AsyncStorage.getItem('@dreamlog_user_name'),
        AsyncStorage.getItem('@dreamlog_user_email'),
        AsyncStorage.getItem('@dreamlog_user_status'),
        AsyncStorage.getItem('@dreamlog_reminder_enabled'),
        AsyncStorage.getItem('@dreamlog_reminder_time'),
      ]);

      const nextName = storedName || propUserName || '꿈결님';
      const nextStatus = storedStatus || '오늘도 좋은 꿈 꾸세요';
      setDreams(storedDreams);
      setUserName(nextName);
      setEditName(nextName);
      setUserStatus(nextStatus);
      setEditStatus(nextStatus);
      if (storedEmail) setUserEmail(storedEmail);
      setReminderEnabled(storedReminder === 'true');
      if (storedReminderTime) setReminderTime(storedReminderTime);
    } catch (error) {
      console.error('Failed to load More screen data:', error);
    }
  };

  useEffect(() => {
    if (active === false) return;
    void loadData();
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      duration: 260,
      easing: Easing.out(Easing.ease),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [active, fadeAnim]);

  useEffect(() => {
    if (propUserName?.trim()) {
      setUserName(propUserName.trim());
      setEditName(propUserName.trim());
    }
  }, [propUserName]);

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('이름을 확인해 주세요', '프로필에 표시할 이름을 입력해 주세요.');
      return;
    }
    try {
      const trimmedStatus = editStatus.trim();
      await Promise.all([
        AsyncStorage.setItem('@dreamlog_user_name', trimmedName),
        AsyncStorage.setItem('@dreamlog_user_status', trimmedStatus),
      ]);
      setUserName(trimmedName);
      onUserNameChange?.(trimmedName);
      setUserStatus(trimmedStatus);
      setIsEditProfileVisible(false);
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const handleOpenArchiveMode = async (mode: 'constellation' | 'planet') => {
    try {
      await AsyncStorage.setItem(ARCHIVE_VIEW_MODE_KEY, mode);
      onTabPress?.('archive');
    } catch (error) {
      console.error('Failed to open archive mode:', error);
    }
  };

  const handleConfirmRecordModeInfo = async () => {
    if (!selectedRecordModeInfo) return;
    await handleOpenArchiveMode(selectedRecordModeInfo.mode);
    setSelectedRecordModeInfo(null);
  };

  const handleReminderToggle = async (value: boolean) => {
    setReminderEnabled(value);
    try {
      await AsyncStorage.setItem('@dreamlog_reminder_enabled', String(value));
    } catch (error) {
      console.error('Failed to save reminder toggle:', error);
    }
  };

  const handleReminderTimeChange = async (time: string) => {
    setReminderTime(time);
    try {
      await AsyncStorage.setItem('@dreamlog_reminder_time', time);
    } catch (error) {
      console.error('Failed to save reminder time:', error);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      '모든 꿈 기록을 삭제할까요?',
      '삭제한 기록은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@dreamlog_saved_dreams');
              setDreams([]);
            } catch {
              Alert.alert('삭제하지 못했어요', '잠시 후 다시 시도해 주세요.');
            }
          },
        },
      ],
    );
  };

  const handleExportBackup = () => {
    setBackupJsonString(JSON.stringify(dreams));
    setIsBackupInputVisible(true);
  };

  const handleImportBackup = () => {
    try {
      const parsed = JSON.parse(backupJsonString.trim());
      if (!Array.isArray(parsed)) throw new Error('Invalid backup');
      Alert.alert(
        '백업을 불러올까요?',
        `${parsed.length}개의 기록이 들어 있습니다. 기존 기록과 합치거나 덮어쓸 수 있어요.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '합치기',
            onPress: async () => {
              const combined = [...dreams];
              parsed.forEach((item: any) => {
                if (item.id && !combined.some((dream) => dream.id === item.id)) combined.push(item);
              });
              await AsyncStorage.setItem('@dreamlog_saved_dreams', JSON.stringify(combined));
              setDreams(combined);
              setIsBackupInputVisible(false);
              setBackupJsonString('');
            },
          },
          {
            text: '덮어쓰기',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.setItem('@dreamlog_saved_dreams', JSON.stringify(parsed));
              setDreams(parsed);
              setIsBackupInputVisible(false);
              setBackupJsonString('');
            },
          },
        ],
      );
    } catch {
      Alert.alert('백업 코드를 확인해 주세요', '올바른 꿈로그 백업 형식이 아닙니다.');
    }
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      {
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={[styles.root, isDark && styles.darkRoot]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.appName, isDark && styles.darkText]}>꿈로그</Text>
            <Text style={[styles.pageTitle, isDark && styles.darkSubText]}>설정</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="알림 확인"
            style={[styles.iconButton, isDark && styles.darkInset]}
            onPress={() => Alert.alert('알림', '새로운 알림이 없습니다.')}
          >
            <Ionicons name="notifications-outline" size={23} color={isDark ? '#eeeaff' : '#4e426e'} />
          </Pressable>
        </View>

        <ScrollView
          ref={settingsScrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={({ pressed }) => [
              styles.profileCard,
              isDark && styles.darkCard,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setEditName(userName);
              setEditStatus(userStatus);
              setIsEditProfileVisible(true);
            }}
          >
            <Image
              source={require('../../assets/settings/profile-avatar.png')}
              style={styles.profileAvatar}
            />
            <View style={styles.profileContent}>
              <Text style={[styles.profileName, isDark && styles.darkText]}>{userName}</Text>
              <Text style={[styles.profileHandle, isDark && styles.darkSubText]}>{userEmail}</Text>
              <Text style={[styles.profileStatus, isDark && styles.darkSubText]} numberOfLines={2}>
                {userStatus}
              </Text>
            </View>
            <Ionicons name="create-outline" size={21} color={isDark ? '#b9adff' : '#7C67E8'} />
          </Pressable>

          <View style={[styles.statsCard, isDark && styles.darkCard]}>
            {[
              { label: '기록한 꿈', value: String(dreams.length) },
              { label: '최장 연속', value: `${maxStreak}일` },
              { label: '획득 배지', value: `${unlockedBadgesCount}/${badges.length}` },
            ].map((stat, index) => (
              <View key={stat.label} style={styles.statItem}>
                {index > 0 ? <View style={[styles.statDivider, isDark && styles.darkDivider]} /> : null}
                <View style={styles.statText}>
                  <Text style={[styles.statValue, isDark && styles.darkText]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, isDark && styles.darkSubText]}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.shortcutCard, isDark && styles.darkCard]}>
            <Text style={[styles.shortcutTitle, isDark && styles.darkText]}>설정 바로가기</Text>
            <Text style={[styles.shortcutDescription, isDark && styles.darkSubText]}>
              필요한 메뉴를 한눈에 보고 바로 이동하세요.
            </Text>
            <View style={styles.shortcutGrid}>
              {SETTINGS_SHORTCUTS.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => scrollToSettingsSection(item.id)}
                  style={({ pressed }) => [
                    styles.shortcutItem,
                    isDark && styles.darkInset,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.shortcutIcon}>
                    <Ionicons name={item.icon} size={19} color="#735DD8" />
                  </View>
                  <Text style={[styles.shortcutItemText, isDark && styles.darkText]}>
                    {item.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={15} color="#AAA1C5" />
                </Pressable>
              ))}
            </View>
          </View>

          <View
            onLayout={(event) => { sectionOffsets.current.badges = event.nativeEvent.layout.y; }}
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="trophy-outline"
              title="배지 컬렉션"
              description="기록을 이어가며 새로운 배지를 모아 보세요."
              isDark={isDark}
              styles={styles}
            />
            <View style={styles.badgeList}>
              {badges.map((badge) => {
                const currentValue = badge.type === 'total' ? dreams.length : maxStreak;
                const isUnlocked = currentValue >= badge.targetCount;
                return (
                  <Pressable
                    key={badge.id}
                    style={({ pressed }) => [
                      styles.badgeRow,
                      isDark && styles.darkInset,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setSelectedBadge(badge);
                      setIsBadgeDetailVisible(true);
                    }}
                  >
                    <View style={styles.badgeImageWrap}>
                      <Image
                        source={badge.source}
                        style={[styles.badgeImage, !isUnlocked && styles.lockedImage]}
                        resizeMode="contain"
                      />
                      {!isUnlocked ? (
                        <View style={[styles.lockIconSmall, isDark && styles.darkLockIcon]}>
                          <Ionicons name="lock-closed" size={10} color="#7C67E8" />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.badgeText}>
                      <Text style={[styles.rowTitle, isDark && styles.darkText]}>{badge.title}</Text>
                      <Text style={[styles.rowDescription, isDark && styles.darkSubText]}>
                        {isUnlocked
                          ? badge.unlockedDesc
                          : `${currentValue}/${badge.targetCount} 달성`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color={isDark ? '#81799b' : '#aaa3bd'} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            onLayout={(event) => { sectionOffsets.current.record = event.nativeEvent.layout.y; }}
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="layers-outline"
              title="기록 방식"
              description="별자리 기록과 행성 수집의 차이를 한눈에 볼 수 있어요."
              isDark={isDark}
              styles={styles}
            />
            <View style={styles.recordModeInfoList}>
              {recordModeInfoList.map((item) => (
                <Pressable
                  key={item.title}
                  accessibilityRole="button"
                  onPress={() => setSelectedRecordModeInfo(item)}
                  style={({ pressed }) => [
                    styles.recordModeInfoRow,
                    isDark && styles.darkInset,
                    pressed && styles.pressed,
                  ]}
                >
                  <Image source={item.image} style={styles.modeImage} resizeMode="contain" />
                  <View style={styles.choiceText}>
                    <Text style={[styles.rowTitle, isDark && styles.darkText]}>{item.title}</Text>
                    <Text style={[styles.rowDescription, isDark && styles.darkSubText]} numberOfLines={3}>
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={19} color={isDark ? '#81799b' : '#aaa3bd'} />
                </Pressable>
              ))}
            </View>
          </View>

          <View
            onLayout={(event) => { sectionOffsets.current.display = event.nativeEvent.layout.y; }}
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="contrast-outline"
              title="화면 설정"
              description="편안하게 읽을 수 있도록 화면을 조절하세요."
              isDark={isDark}
              styles={styles}
            />
            <Text style={[styles.fieldLabel, isDark && styles.darkText]}>글자 크기</Text>
            <View style={styles.textSizeOptions}>
              {TEXT_SIZE_OPTIONS.map((option) => {
                const selected = textSize === option.value;
                const previewSize =
                  option.value === 'small' ? 15 : option.value === 'default' ? 18 : 21;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.textSizeButton,
                      isDark && styles.darkInset,
                      selected && styles.textSizeButtonSelected,
                    ]}
                    onPress={() => void setTextSize(option.value)}
                  >
                    <Text
                      style={[
                        styles.textSizePreview,
                        { fontSize: previewSize },
                        isDark && styles.darkText,
                        selected && styles.textSizeSelectedText,
                      ]}
                    >
                      {option.preview}
                    </Text>
                    <Text
                      style={[
                        styles.textSizeLabel,
                        isDark && styles.darkSubText,
                        selected && styles.textSizeSelectedText,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={17} color="#7C67E8" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.helperText, isDark && styles.darkSubText]}>
              선택한 크기는 꿈로그 전체 화면에서 사용할 수 있도록 저장됩니다.
            </Text>
          </View>

          <View
            onLayout={(event) => { sectionOffsets.current.reminder = event.nativeEvent.layout.y; }}
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="notifications-outline"
              title="리마인더"
              description="꿈이 흐려지기 전에 기록 시간을 알려 드려요."
              isDark={isDark}
              styles={styles}
            />
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>매일 알림 받기</Text>
                <Text style={[styles.rowDescription, isDark && styles.darkSubText]}>
                  설정한 시간에 기록 알림을 받아요.
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(value) => void handleReminderToggle(value)}
                trackColor={{ false: '#d7d2e4', true: '#7C67E8' }}
                thumbColor="#ffffff"
              />
            </View>
            {reminderEnabled ? (
              <>
                <View style={[styles.separator, isDark && styles.darkDivider]} />
                <Text style={[styles.fieldLabel, isDark && styles.darkText]}>알림 시간</Text>
                <View style={styles.timeOptions}>
                  {REMINDER_TIMES.map((time) => {
                    const selected = reminderTime === time;
                    return (
                      <Pressable
                        key={time}
                        style={[
                          styles.timeButton,
                          isDark && styles.darkInset,
                          selected && styles.timeButtonSelected,
                        ]}
                        onPress={() => void handleReminderTimeChange(time)}
                      >
                        <Text
                          style={[
                            styles.timeButtonText,
                            isDark && styles.darkSubText,
                            selected && styles.timeButtonTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>

          <View
            onLayout={(event) => { sectionOffsets.current.data = event.nativeEvent.layout.y; }}
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="folder-open-outline"
              title="데이터 관리"
              description="꿈 기록을 백업하거나 다른 기기에서 복구하세요."
              isDark={isDark}
              styles={styles}
            />
            <View style={styles.actionList}>
              <Pressable
                style={[styles.actionRow, isDark && styles.darkInset]}
                onPress={handleExportBackup}
              >
                <Ionicons name="download-outline" size={21} color="#7C67E8" />
                <Text style={[styles.actionText, isDark && styles.darkText]}>백업 코드 만들기</Text>
                <Ionicons name="chevron-forward" size={19} color={isDark ? '#81799b' : '#aaa3bd'} />
              </Pressable>
              <Pressable
                style={[styles.actionRow, isDark && styles.darkInset]}
                onPress={() => setIsBackupInputVisible((visible) => !visible)}
              >
                <Ionicons name="cloud-upload-outline" size={21} color="#7C67E8" />
                <Text style={[styles.actionText, isDark && styles.darkText]}>백업 코드 불러오기</Text>
                <Ionicons
                  name={isBackupInputVisible ? 'chevron-up' : 'chevron-down'}
                  size={19}
                  color={isDark ? '#81799b' : '#aaa3bd'}
                />
              </Pressable>
              {isBackupInputVisible ? (
                <View style={[styles.backupBox, isDark && styles.darkInset]}>
                  <TextInput
                    style={[styles.backupInput, isDark && styles.darkInput]}
                    placeholder="백업 코드를 붙여 넣어 주세요."
                    placeholderTextColor={isDark ? '#81799b' : '#9b94aa'}
                    multiline
                    value={backupJsonString}
                    onChangeText={setBackupJsonString}
                  />
                  <View style={styles.backupButtons}>
                    <Pressable
                      style={[styles.secondaryButton, isDark && styles.darkSecondaryButton]}
                      onPress={() => {
                        setIsBackupInputVisible(false);
                        setBackupJsonString('');
                      }}
                    >
                      <Text style={[styles.secondaryButtonText, isDark && styles.darkText]}>취소</Text>
                    </Pressable>
                    <Pressable style={styles.primarySmallButton} onPress={handleImportBackup}>
                      <Text style={styles.primarySmallButtonText}>복구하기</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              <Pressable
                style={[styles.actionRow, styles.dangerRow, isDark && styles.darkDangerRow]}
                onPress={handleClearAllData}
              >
                <Ionicons name="trash-outline" size={21} color="#d14b5b" />
                <Text style={[styles.actionText, styles.dangerText]}>모든 꿈 기록 삭제</Text>
                <Ionicons name="chevron-forward" size={19} color="#d98791" />
              </Pressable>
            </View>
          </View>

          <View
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="document-text-outline"
              title="개인정보 및 AI 안내"
              description="저장 방식과 AI 해석의 성격을 미리 확인하세요."
              isDark={isDark}
              styles={styles}
            />
            <View style={styles.infoStack}>
              <View style={styles.noticeRow}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>기록 저장 방식</Text>
                <Text style={[styles.rowDescription, isDark && styles.darkSubText]}>
                  꿈 기록과 프로필 이름은 이 기기 저장소에 보관됩니다.
                </Text>
              </View>
              <View style={[styles.separator, isDark && styles.darkDivider]} />
              <View style={styles.noticeRow}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>AI 해석 안내</Text>
                <Text style={[styles.rowDescription, isDark && styles.darkSubText]}>
                  AI 해석은 자기이해를 돕는 참고용이며 의료적 또는 정신건강 진단을 대신하지 않습니다.
                </Text>
              </View>
              <View style={[styles.separator, isDark && styles.darkDivider]} />
              <View style={styles.noticeRow}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>민감 정보 주의</Text>
                <Text style={[styles.rowDescription, isDark && styles.darkSubText]}>
                  실제 이름, 연락처, 결제 정보처럼 민감한 개인정보는 꿈 메모에 적지 않는 것을 권장합니다.
                </Text>
              </View>
            </View>
          </View>

          <View
            onLayout={(event) => { sectionOffsets.current.account = event.nativeEvent.layout.y; }}
            style={[styles.sectionCard, isDark && styles.darkCard]}
          >
            <SectionHeader
              icon="shield-checkmark-outline"
              title="보안 및 계정"
              description="꿈로그 접근과 계정 보안을 관리하세요."
              isDark={isDark}
              styles={styles}
            />
            <Pressable
              style={[styles.actionRow, isDark && styles.darkInset]}
              onPress={() => Alert.alert('준비 중인 기능이에요', '비밀번호 잠금은 다음 업데이트에서 제공됩니다.')}
            >
              <Ionicons name="lock-closed-outline" size={21} color="#7C67E8" />
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionText, isDark && styles.darkText]}>비밀번호 잠금</Text>
                <Text style={[styles.rowDescription, isDark && styles.darkSubText]}>준비 중</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={isDark ? '#81799b' : '#aaa3bd'} />
            </Pressable>
          </View>

          <View style={[styles.sectionCard, isDark && styles.darkCard]}>
            <SectionHeader
              icon="information-circle-outline"
              title="앱 정보"
              isDark={isDark}
              styles={styles}
            />
            {[
              ['앱 이름', '꿈로그'],
              ['버전', 'v1.0.0 (beta)'],
              ['글꼴', 'Pretendard'],
            ].map(([label, value], index) => (
              <View key={label}>
                {index > 0 ? <View style={[styles.separator, isDark && styles.darkDivider]} /> : null}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, isDark && styles.darkSubText]}>{label}</Text>
                  <Text style={[styles.infoValue, isDark && styles.darkText]}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      <Modal
        animationType="slide"
        transparent
        visible={isEditProfileVisible}
        onRequestClose={() => setIsEditProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.editModalCard, isDark && styles.darkCard]}
          >
            <View style={styles.modalHeadingRow}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>프로필 수정</Text>
              <Pressable
                accessibilityLabel="프로필 수정 닫기"
                onPress={() => setIsEditProfileVisible(false)}
              >
                <Ionicons name="close" size={24} color={isDark ? '#eeeaff' : '#4e426e'} />
              </Pressable>
            </View>
            <Text style={[styles.inputLabel, isDark && styles.darkText]}>이름</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={editName}
              onChangeText={setEditName}
              placeholder="표시할 이름"
              placeholderTextColor={isDark ? '#81799b' : '#9b94aa'}
            />
            <Text style={[styles.inputLabel, isDark && styles.darkText]}>상태 메시지</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              value={editStatus}
              onChangeText={setEditStatus}
              placeholder="오늘의 한마디"
              placeholderTextColor={isDark ? '#81799b' : '#9b94aa'}
            />
            <Pressable style={styles.primaryButton} onPress={() => void handleSaveProfile()}>
              <Text style={styles.primaryButtonText}>저장</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <BadgeDetailModal
        visible={isBadgeDetailVisible}
        badge={selectedBadge}
        currentValue={
          selectedBadge
            ? selectedBadge.type === 'total'
              ? dreams.length
              : maxStreak
            : 0
        }
        isUnlocked={
          selectedBadge
            ? (selectedBadge.type === 'total' ? dreams.length : maxStreak) >=
              selectedBadge.targetCount
            : false
        }
        isDark={isDark}
        styles={styles}
        onClose={() => {
          setIsBadgeDetailVisible(false);
          setSelectedBadge(null);
        }}
      />

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedRecordModeInfo)}
        onRequestClose={() => setSelectedRecordModeInfo(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedRecordModeInfo(null)}>
          <Pressable
            accessibilityRole="none"
            style={[styles.modalCard, isDark && styles.darkCard]}
            onPress={(event) => event.stopPropagation()}
          >
            {selectedRecordModeInfo ? (
              <>
                <Image
                  source={selectedRecordModeInfo.image}
                  style={styles.recordModeModalImage}
                  resizeMode="contain"
                />
                <Text style={[styles.modalTitle, isDark && styles.darkText]}>
                  {selectedRecordModeInfo.detailTitle}
                </Text>
                <Text style={[styles.modalDescription, isDark && styles.darkSubText]}>
                  {selectedRecordModeInfo.detailDescription}
                </Text>
                <View style={[styles.progressBox, styles.recordModeModalBox, isDark && styles.darkInset]}>
                  {selectedRecordModeInfo.bulletPoints.map((point) => (
                    <View key={point} style={styles.recordModeBulletRow}>
                      <View style={styles.recordModeBulletDot} />
                      <Text style={[styles.recordModeBulletText, isDark && styles.darkSubText]}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.recordModeModalActions}>
                  <Pressable
                    style={[styles.secondaryButton, { flex: 1, minHeight: 48, justifyContent: 'center' }]}
                    onPress={() => setSelectedRecordModeInfo(null)}
                  >
                    <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>닫기</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={() => void handleConfirmRecordModeInfo()}
                  >
                    <Text style={styles.primaryButtonText}>아카이브에서 보기</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (fontScale: number) => {
  const fs = (size: number) => Math.round(size * fontScale);
  const softCardShadow = {
    shadowColor: '#6f5cc7',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  } as const;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#F8F7FC',
    },
    darkRoot: {
      backgroundColor: '#0d0a1b',
    },
    container: {
      flex: 1,
    },
    topBar: {
      minHeight: 72,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    appName: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(21),
      lineHeight: fs(28),
      fontWeight: '800',
      color: '#241B4B',
    },
    pageTitle: {
      marginTop: 1,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      color: '#777184',
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      ...softCardShadow,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 112,
      gap: 12,
    },
    profileCard: {
      minHeight: 104,
      borderRadius: 22,
      backgroundColor: '#ffffff',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      ...softCardShadow,
    },
    profileAvatar: {
      width: 64,
      height: 64,
      borderRadius: 22,
      marginRight: 14,
    },
    profileContent: {
      flex: 1,
      paddingRight: 10,
    },
    profileName: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(18),
      lineHeight: fs(25),
      fontWeight: '800',
      color: '#241B4B',
    },
    profileHandle: {
      marginTop: 1,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      lineHeight: fs(18),
      color: '#8a8397',
    },
    profileStatus: {
      marginTop: 4,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      color: '#625D72',
    },
    statsCard: {
      backgroundColor: '#ffffff',
      borderRadius: 18,
      paddingVertical: 15,
      flexDirection: 'row',
      ...softCardShadow,
    },
    shortcutCard: {
      backgroundColor: '#ffffff',
      borderRadius: 22,
      padding: 17,
      ...softCardShadow,
    },
    shortcutTitle: {
      color: '#241B4B',
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(17),
      fontWeight: '800',
      lineHeight: fs(24),
    },
    shortcutDescription: {
      color: '#777184',
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      lineHeight: fs(18),
      marginTop: 2,
    },
    shortcutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    shortcutItem: {
      alignItems: 'center',
      backgroundColor: '#F8F6FD',
      borderRadius: 15,
      flexDirection: 'row',
      minHeight: 48,
      paddingHorizontal: 10,
      width: '48.7%',
    },
    shortcutIcon: {
      alignItems: 'center',
      backgroundColor: '#EEE9FF',
      borderRadius: 11,
      height: 32,
      justifyContent: 'center',
      marginRight: 8,
      width: 32,
    },
    shortcutItemText: {
      color: '#4C4568',
      flex: 1,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      fontWeight: '700',
      lineHeight: fs(18),
    },
    statItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 34,
      backgroundColor: '#ece8f3',
    },
    statText: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(17),
      lineHeight: fs(23),
      fontWeight: '800',
      color: '#241B4B',
    },
    statLabel: {
      marginTop: 2,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(11),
      lineHeight: fs(16),
      color: '#898398',
    },
    sectionCard: {
      backgroundColor: '#ffffff',
      borderRadius: 22,
      padding: 17,
      ...softCardShadow,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 15,
    },
    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: '#F3F0FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    sectionHeaderText: {
      flex: 1,
      paddingTop: 1,
    },
    sectionTitle: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(17),
      lineHeight: fs(24),
      fontWeight: '800',
      color: '#241B4B',
    },
    sectionDescription: {
      marginTop: 2,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      color: '#777184',
    },
    badgeList: {
      gap: 8,
    },
    badgeRow: {
      minHeight: 68,
      borderRadius: 16,
      backgroundColor: '#F8F7FC',
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
    },
    badgeImageWrap: {
      width: 48,
      height: 48,
      marginRight: 11,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    badgeImage: {
      width: 44,
      height: 44,
    },
    lockedImage: {
      opacity: 0.32,
    },
    lockIconSmall: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 19,
      height: 19,
      borderRadius: 10,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#ddd5fa',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      flex: 1,
      paddingRight: 8,
    },
    rowTitle: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(14),
      lineHeight: fs(21),
      fontWeight: '700',
      color: '#39334D',
    },
    rowDescription: {
      marginTop: 2,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      lineHeight: fs(18),
      color: '#777184',
    },
    modeList: {
      gap: 9,
    },
    recordModeInfoList: {
      gap: 10,
    },
    recordModeInfoRow: {
      minHeight: 82,
      borderRadius: 17,
      backgroundColor: '#F8F7FC',
      borderWidth: 1.5,
      borderColor: 'transparent',
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },
    recordModeModalImage: {
      width: 94,
      height: 94,
      marginBottom: 10,
      alignSelf: 'center',
    },
    recordModeModalBox: {
      marginTop: 8,
      paddingVertical: 14,
      gap: 10,
    },
    recordModeBulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    recordModeBulletDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: '#7C67E8',
      marginTop: 6,
      flexShrink: 0,
    },
    recordModeBulletText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(20),
      color: '#5F5873',
    },
    recordModeModalActions: {
      marginTop: 14,
      flexDirection: 'row',
      gap: 10,
    },
    choiceRow: {
      minHeight: 76,
      borderRadius: 17,
      backgroundColor: '#F8F7FC',
      borderWidth: 1.5,
      borderColor: 'transparent',
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },
    choiceRowSelected: {
      backgroundColor: '#F3F0FF',
      borderColor: '#7C67E8',
    },
    modeImage: {
      width: 58,
      height: 48,
      marginRight: 11,
    },
    choiceText: {
      flex: 1,
      paddingRight: 8,
    },
    settingRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingLabelWrap: {
      flex: 1,
      paddingRight: 16,
    },
    separator: {
      height: 1,
      backgroundColor: '#ece8f3',
      marginVertical: 15,
    },
    fieldLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(14),
      lineHeight: fs(21),
      fontWeight: '700',
      color: '#39334D',
      marginBottom: 10,
    },
    textSizeOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    textSizeButton: {
      flex: 1,
      minHeight: 82,
      borderRadius: 15,
      backgroundColor: '#F8F7FC',
      borderWidth: 1.5,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    textSizeButtonSelected: {
      borderColor: '#7C67E8',
      backgroundColor: '#F3F0FF',
    },
    textSizePreview: {
      fontFamily: theme.typography.fontFamily,
      lineHeight: 26,
      fontWeight: '800',
      color: '#39334D',
    },
    textSizeLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(11),
      lineHeight: fs(16),
      color: '#777080',
    },
    textSizeSelectedText: {
      color: '#6952D9',
      fontWeight: '800',
    },
    helperText: {
      marginTop: 10,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(11),
      lineHeight: fs(17),
      color: '#8a8397',
    },
    infoStack: {
      gap: 0,
    },
    noticeRow: {
      paddingVertical: 2,
    },
    timeOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    timeButton: {
      minWidth: '22%',
      flexGrow: 1,
      backgroundColor: '#F8F7FC',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'transparent',
      paddingVertical: 10,
      alignItems: 'center',
    },
    timeButtonSelected: {
      backgroundColor: '#7C67E8',
      borderColor: '#7C67E8',
    },
    timeButtonText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(18),
      fontWeight: '700',
      color: '#645d70',
    },
    timeButtonTextSelected: {
      color: '#ffffff',
    },
    actionList: {
      gap: 8,
    },
    actionRow: {
      minHeight: 54,
      borderRadius: 14,
      backgroundColor: '#F8F7FC',
      paddingHorizontal: 13,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    actionText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(14),
      lineHeight: fs(21),
      fontWeight: '700',
      color: '#39334D',
    },
    actionTextWrap: {
      flex: 1,
    },
    dangerRow: {
      backgroundColor: '#fff4f5',
    },
    dangerText: {
      color: '#c43e4f',
    },
    backupBox: {
      backgroundColor: '#F8F7FC',
      borderRadius: 15,
      padding: 11,
    },
    backupInput: {
      minHeight: 110,
      borderRadius: 12,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2ddea',
      padding: 12,
      textAlignVertical: 'top',
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      color: '#39334D',
    },
    backupButtons: {
      marginTop: 9,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    secondaryButton: {
      borderRadius: 11,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#ded8e8',
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    secondaryButtonText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(18),
      fontWeight: '700',
      color: '#645d70',
    },
    primarySmallButton: {
      borderRadius: 11,
      backgroundColor: '#7C67E8',
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    primarySmallButtonText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(18),
      fontWeight: '700',
      color: '#ffffff',
    },
    infoRow: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    infoLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      color: '#7d7688',
    },
    infoValue: {
      flexShrink: 1,
      textAlign: 'right',
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      fontWeight: '700',
      color: '#39334D',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 15, 34, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 24,
      backgroundColor: '#ffffff',
      padding: 22,
      shadowColor: '#463b7a',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 8,
      alignItems: 'center',
    },
    modalBadgeWrap: {
      width: 92,
      height: 92,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginBottom: 10,
    },
    modalBadgeImage: {
      width: 82,
      height: 82,
    },
    lockIcon: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#ddd5fa',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(19),
      lineHeight: fs(27),
      fontWeight: '800',
      color: '#241B4B',
    },
    modalDescription: {
      marginTop: 7,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(20),
      color: '#777080',
    },
    statusPill: {
      marginTop: 14,
      borderRadius: 999,
      backgroundColor: '#f0ecff',
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusPillUnlocked: {
      backgroundColor: '#e9f7f0',
    },
    statusPillText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      lineHeight: fs(17),
      fontWeight: '700',
      color: '#6549dd',
    },
    statusPillTextUnlocked: {
      color: '#247a55',
    },
    progressBox: {
      width: '100%',
      marginTop: 16,
      marginBottom: 16,
      borderRadius: 14,
      backgroundColor: '#F8F7FC',
      padding: 12,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      lineHeight: fs(17),
      color: '#7d7688',
    },
    progressValue: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(12),
      lineHeight: fs(17),
      fontWeight: '800',
      color: '#39334D',
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#e3def1',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: '#7C67E8',
    },
    primaryButton: {
      width: '100%',
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: '#7C67E8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(14),
      lineHeight: fs(20),
      fontWeight: '800',
      color: '#ffffff',
    },
    editModalCard: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      backgroundColor: '#ffffff',
      padding: 20,
    },
    modalHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    inputLabel: {
      marginBottom: 7,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(13),
      lineHeight: fs(19),
      fontWeight: '700',
      color: '#39334D',
    },
    input: {
      minHeight: 48,
      borderRadius: 13,
      backgroundColor: '#F8F7FC',
      borderWidth: 1,
      borderColor: '#e2ddea',
      paddingHorizontal: 13,
      marginBottom: 15,
      fontFamily: theme.typography.fontFamily,
      fontSize: fs(14),
      color: '#39334D',
    },
    pressed: {
      opacity: 0.72,
    },
    darkText: {
      color: '#f6f3ff',
    },
    darkSubText: {
      color: '#aaa3ba',
    },
    darkCard: {
      backgroundColor: '#1a152d',
      shadowColor: '#000000',
      shadowOpacity: 0.3,
    },
    darkInset: {
      backgroundColor: '#231d39',
      borderColor: '#352d50',
    },
    darkSectionIcon: {
      backgroundColor: '#2d254d',
    },
    darkDivider: {
      backgroundColor: '#342c4c',
    },
    darkChoiceRowSelected: {
      backgroundColor: '#2b2348',
    },
    darkLockIcon: {
      backgroundColor: '#2b2442',
      borderColor: '#4a3d72',
    },
    darkInput: {
      backgroundColor: '#151123',
      borderColor: '#3b3254',
      color: '#f6f3ff',
    },
    darkSecondaryButton: {
      backgroundColor: '#231d39',
      borderColor: '#3b3254',
    },
    darkDangerRow: {
      backgroundColor: '#321c2a',
    },
  });
};
