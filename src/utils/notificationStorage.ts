import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedDream } from '../types/record';
import { calculateStreak } from './dreamStorage';

const NOTIFICATIONS_STORAGE_KEY = '@dreamlog_notifications';

export type DreamNotification = {
  id: string;
  title: string;
  body: string;
  timestamp: string; // ISO string
  isRead: boolean;
};

// Initial mock notifications if storage is empty
const INITIAL_NOTIFICATIONS: DreamNotification[] = [
  {
    id: 'init-welcome',
    title: '나만의 꿈 우주에 오신 것을 환영합니다! ✨',
    body: '꿈결 일기에서 매일 밤의 은하수를 기록하고 마음을 돌아보세요.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    isRead: false,
  },
  {
    id: 'init-constellation-tip',
    title: '별자리 기록으로 꿈별 연결하기 🪐',
    body: '보관소에서 비슷한 키워드를 가진 꿈들이 어떻게 연결되는지 별자리로 확인해 보세요.',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    isRead: false,
  },
];

export async function getNotifications(): Promise<DreamNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      // Seed initial notifications
      try {
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      } catch {}
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw) as DreamNotification[];
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export async function saveNotifications(notifications: DreamNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export async function addNotification(title: string, body: string): Promise<void> {
  const notifications = await getNotifications();
  const newNotif: DreamNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    title,
    body,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  notifications.unshift(newNotif);
  await saveNotifications(notifications);
}

export async function markAsRead(id: string): Promise<void> {
  const notifications = await getNotifications();
  const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  await saveNotifications(updated);
}

export async function markAllAsRead(): Promise<void> {
  const notifications = await getNotifications();
  const updated = notifications.map((n) => ({ ...n, isRead: true }));
  await saveNotifications(updated);
}

export async function clearAllNotifications(): Promise<void> {
  await saveNotifications([]);
}

/**
 * 꿈 일기 상태를 기반으로 실시간 알림을 동적으로 생성/동기화합니다.
 */
export async function syncDynamicNotifications(dreams: SavedDream[]): Promise<number> {
  const notifications = await getNotifications();
  let updated = [...notifications];
  let changed = false;

  // 사용자 이름 동적 로드
  let displayName = '꿈결님';
  try {
    const stored = await AsyncStorage.getItem('@dreamlog_user_name');
    if (stored && stored.trim()) displayName = stored.trim();
  } catch (_e) { /* 이름 로드 실패 시 기본값 유지 */ }

  // 1. 첫 번째 기록 성공 알림 생성
  if (dreams.length > 0) {
    const hasFirstRecordNotif = notifications.some((n) => n.id === 'dyn-first-record');
    if (!hasFirstRecordNotif) {
      updated.unshift({
        id: 'dyn-first-record',
        title: '첫 번째 은하수 조각 기록 완료! 🎉',
        body: `${displayName}이 남겨주신 소중한 기록이 우주에 안전하게 저장되었습니다.`,
        timestamp: new Date().toISOString(),
        isRead: false,
      });
      changed = true;
    }
  }

  // 2. 스트릭(연속 기록) 기반 알림
  const streak = calculateStreak(dreams);
  if (streak >= 3) {
    const hasStreak3Notif = notifications.some((n) => n.id === 'dyn-streak-3');
    if (!hasStreak3Notif) {
      updated.unshift({
        id: 'dyn-streak-3',
        title: '연속 기록 탐험가! 🌌',
        body: `벌써 ${streak}일 연속으로 꿈을 은하수로 그리셨습니다. 대단해요!`,
        timestamp: new Date().toISOString(),
        isRead: false,
      });
      changed = true;
    }
  }

  // 3. 기록 누적 개수 기반 알림
  if (dreams.length >= 5) {
    const hasCount5Notif = notifications.some((n) => n.id === 'dyn-count-5');
    if (!hasCount5Notif) {
      updated.unshift({
        id: 'dyn-count-5',
        title: '어느덧 5개의 꿈을 모았어요 🔮',
        body: `차곡차곡 쌓인 ${displayName}의 은하수가 통계 화면에서 감정 패턴으로 분석되고 있습니다.`,
        timestamp: new Date().toISOString(),
        isRead: false,
      });
      changed = true;
    }
  }

  if (changed) {
    await saveNotifications(updated);
  }

  // 안읽은 알림 수 반환
  const unreadCount = updated.filter((n) => !n.isRead).length;
  // 홈 화면 뱃지 카운트도 AsyncStorage에 동기화
  await AsyncStorage.setItem('@dreamlog_notification_count', String(unreadCount));
  
  return unreadCount;
}
