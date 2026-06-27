import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedDream, RecordActionPayload } from '../types/record';
import {
  MONTHLY_CONSTELLATIONS,
  RESERVE_CONSTELLATIONS,
  constellationForDate,
} from '../data/constellations';
import { DEFAULT_DREAM_STAR_ID, isDreamStarId } from '../data/dreamStars';

const DREAMS_STORAGE_KEY = '@dreamlog_saved_dreams';

function nextConstellationAssignment(date: string, monthDreams: SavedDream[]) {
  const month = Number(date.slice(5, 7)) || new Date().getMonth() + 1;
  const candidates = [
    MONTHLY_CONSTELLATIONS[month - 1],
    ...RESERVE_CONSTELLATIONS,
  ];

  for (const candidate of candidates) {
    const usedPoints = new Set(
      monthDreams
        .filter((dream) => dream.constellationId === candidate.id)
        .map((dream) => dream.constellationPointIndex)
        .filter((index): index is number => index !== undefined),
    );
    const availablePoint = Array.from(
      { length: candidate.points },
      (_, index) => index,
    ).find((index) => !usedPoints.has(index));
    if (availablePoint !== undefined) {
      return { ...candidate, pointIndex: availablePoint };
    }
  }

  const fallback = constellationForDate(date, monthDreams.length);
  return {
    ...fallback,
    pointIndex: monthDreams.length % fallback.points,
  };
}

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
    const parsed = (JSON.parse(raw) as SavedDream[]).filter(
      (d) => d && typeof d === 'object' && d.id && d.createdAt && d.date
    );
    let changed = false;
    const chronological = [...parsed].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const constellationCounts = new Map<string, number>();
    chronological.forEach((dream) => {
      if (dream.mode !== 'constellation') return;
      const monthKey = (dream.date || '').slice(0, 7);
      if (!monthKey) return;
      const index = constellationCounts.get(monthKey) ?? 0;
      if (!dream.constellationId || dream.constellationPointIndex === undefined) {
        const assignment = constellationForDate(dream.date, index);
        dream.constellationId = assignment.id;
        dream.constellationPointIndex = index % assignment.points;
        changed = true;
      }
      if (!isDreamStarId(dream.selectedStarId)) {
        dream.selectedStarId = DEFAULT_DREAM_STAR_ID;
        changed = true;
      }
      constellationCounts.set(monthKey, index + 1);
    });
    if (changed) {
      try { await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(parsed)); } catch {}
    }
    return parsed;
  } catch {
    // 웹 환경에서 AsyncStorage 네이티브 모듈 미지원 시 시드 데이터 반환
    return INITIAL_SEED_DREAMS;
  }
}

export async function saveDream(
  payload: RecordActionPayload,
  dreamId?: string,
  targetDate?: string,
  aiInterpretation?: string
): Promise<SavedDream> {
  const dreams = await getSavedDreams();
  const dateStr = targetDate || formatDateString(new Date());
  // A record is edited only when its id is explicitly supplied. Multiple dreams
  // on the same day are valid and must each receive their own collection item.
  const existingDream = dreamId
    ? dreams.find((dream) => dream.id === dreamId)
    : undefined;
  const monthKey = dateStr.slice(0, 7);
  const monthDreams = dreams.filter(
    (dream) =>
      dream.date.startsWith(monthKey) &&
      dream.mode === 'constellation' &&
      dream.id !== dreamId,
  );
  const assignment = nextConstellationAssignment(dateStr, monthDreams);
  const collectionFields = payload.mode === 'constellation'
    ? {
        constellationId:
          existingDream?.mode === 'constellation' && existingDream.constellationId
            ? existingDream.constellationId
            : assignment.id,
        constellationPointIndex:
          existingDream?.mode === 'constellation' &&
          existingDream.constellationPointIndex !== undefined
            ? existingDream.constellationPointIndex
            : assignment.pointIndex,
        planetId: undefined,
      }
    : {
        constellationId: undefined,
        constellationPointIndex: undefined,
        planetId:
          existingDream?.mode === 'planet' && existingDream.planetId
            ? existingDream.planetId
            : `dream-planet-${(dreams.filter((dream) => dream.planetId).length % 6) + 1}`,
      };

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
        selectedStarId: payload.selectedStarId,
        aiInterpretation: aiInterpretation || dreams[idx].aiInterpretation,
        ...collectionFields,
      };
      dreams[idx] = updatedDream;
      try { await AsyncStorage.setItem(DREAMS_STORAGE_KEY, JSON.stringify(dreams)); } catch {}
      return updatedDream;
    }
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
    selectedStarId: payload.selectedStarId,
    createdAt: new Date().toISOString(),
    aiInterpretation,
    ...collectionFields,
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

export function calculateStreak(dreams: SavedDream[]): number {
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
}
