import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedDream, RecordActionPayload } from '../types/record';

const DREAMS_STORAGE_KEY = '@dreamlog_saved_dreams';

// Helper to format Date to YYYY-MM-DD
export function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Initial mock dreams to seed if storage is empty
const INITIAL_SEED_DREAMS: SavedDream[] = [
  {
    id: 'seed-sea-of-stars',
    date: '2026-06-14', // Yesterday relative to current time 2026-06-15
    title: '별이 쏟아지는 바다 위를 걸었어요',
    mode: 'planet',
    selectedKeywordIds: ['sea', 'star'],
    selectedMoodIds: ['happy'],
    memo: '잔잔한 바다 위로 반짝이는 별들이 쏟아지고 있었어요. 그 별들이 물결에 닿을 때마다 반짝이는 빛이 퍼졌고, 나는 그 위를 걸으며 마음이 평온해졌습니다.',
    createdAt: new Date('2026-06-14T23:00:00Z').toISOString(),
  },
  {
    id: 'seed-castle-clouds',
    date: '2026-06-13', // Day before yesterday
    title: '분홍빛 구름 위에 있는 성',
    mode: 'constellation',
    selectedKeywordIds: ['castle', 'sky'],
    selectedMoodIds: ['calm'],
    memo: '구름이 분홍색으로 물들어 있었고 저 멀리 거대한 성이 보였습니다. 둥둥 떠다니는 기분이었어요.',
    createdAt: new Date('2026-06-13T22:30:00Z').toISOString(),
  },
];

export async function getSavedDreams(): Promise<SavedDream[]> {
  try {
    const raw = await AsyncStorage.getItem(DREAMS_STORAGE_KEY);
    if (!raw) {
      // Seed initial mock dreams
      try {
        await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(INITIAL_SEED_DREAMS));
      } catch {
        // 웹 환경 등에서 setItem 실패 시 무시
      }
      return INITIAL_SEED_DREAMS;
    }
    return JSON.parse(raw) as SavedDream[];
  } catch {
    // 웹 환경에서 AsyncStorage 네이티브 모듈 미지원 시 시드 데이터 반환
    return INITIAL_SEED_DREAMS;
  }
}

export async function saveDream(
  payload: RecordActionPayload,
  dreamId?: string,
  targetDate?: string
): Promise<SavedDream> {
  const dreams = await getSavedDreams();
  const dateStr = targetDate || formatDateString(new Date());

  if (dreamId) {
    // Editing an existing dream
    const idx = dreams.findIndex((d) => d.id === dreamId);
    if (idx !== -1) {
      const updatedDream: SavedDream = {
        ...dreams[idx],
        title: payload.title || '제목 없음',
        mode: payload.mode,
        selectedKeywordIds: payload.selectedKeywordIds,
        selectedMoodIds: payload.selectedMoodIds,
        memo: payload.memo,
      };
      dreams[idx] = updatedDream;
      try { await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(dreams)); } catch {}
      return updatedDream;
    }
  }

  // 기존에 해당 날짜에 기록된 꿈이 있다면 덮어쓰기(수정)하여 중복 방지
  const existingIdx = dreams.findIndex((d) => d.date === dateStr);
  if (existingIdx !== -1) {
    const updatedDream: SavedDream = {
      ...dreams[existingIdx],
      title: payload.title || '제목 없음',
      mode: payload.mode,
      selectedKeywordIds: payload.selectedKeywordIds,
      selectedMoodIds: payload.selectedMoodIds,
      memo: payload.memo,
    };
    dreams[existingIdx] = updatedDream;
    try { await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(dreams)); } catch {}
    return updatedDream;
  }

  // Creating a new dream
  const newDream: SavedDream = {
    id: `dream_${Date.now()}`,
    date: dateStr,
    title: payload.title || '제목 없음',
    mode: payload.mode,
    selectedKeywordIds: payload.selectedKeywordIds,
    selectedMoodIds: payload.selectedMoodIds,
    memo: payload.memo,
    createdAt: new Date().toISOString(),
  };

  dreams.unshift(newDream); // Add to beginning (most recent first)
  try { await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(dreams)); } catch {}
  return newDream;
}

export async function deleteDream(id: string): Promise<void> {
  try {
    const dreams = await getSavedDreams();
    const filtered = dreams.filter((d) => d.id !== id);
    await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // 웹 환경에서 AsyncStorage 미지원 시 무시
  }
}
