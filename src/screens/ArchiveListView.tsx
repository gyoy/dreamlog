import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { SavedDream, DreamMood } from '../types/record';
import { theme } from '../theme';
import { MoodFace } from '../components/MoodFace';
import { RECORD_PRIMARY_KEYWORDS, RECORD_EXTRA_KEYWORDS, RECORD_MOODS } from '../data/record';

type ArchiveListViewProps = {
  dreams: SavedDream[];
  onDreamPress: (dream: SavedDream) => void;
  isDark: boolean;
};

const getKeywordLabel = (id: string) => {
  const allKeywords = [...RECORD_PRIMARY_KEYWORDS, ...RECORD_EXTRA_KEYWORDS];
  const found = allKeywords.find((k) => k.id === id);
  return found ? found.label : id;
};

const getMoodObject = (moodId: string): DreamMood => {
  const found = RECORD_MOODS.find((m) => m.id === moodId);
  return found || { id: 'calm', label: '평온', faceColor: '#94ddd0', expression: 'line' };
};

export function ArchiveListView({ dreams, onDreamPress, isDark }: ArchiveListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);

  // 동적 고유 태그 목록 생성 (실제 꿈에 사용된 태그만 추출)
  const activeTags = useMemo(() => {
    const ids = new Set<string>();
    dreams.forEach((d) => {
      (d.selectedKeywordIds || []).forEach((id) => ids.add(id));
    });
    return Array.from(ids).map((id) => ({
      id,
      label: getKeywordLabel(id),
    }));
  }, [dreams]);

  // 필터 및 검색 적용
  const filteredDreams = useMemo(() => {
    return dreams
      .filter((d) => {
        // 1. 검색어 필터 (제목 또는 메모)
        const matchSearch =
          (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.memo || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        // 2. 태그 필터
        const matchTag = selectedTag ? (d.selectedKeywordIds || []).includes(selectedTag) : true;

        // 3. 즐겨찾기 필터
        const matchFavorite = isFavoriteOnly ? Boolean(d.isFavorite) : true;

        return matchSearch && matchTag && matchFavorite;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 최신날짜순
  }, [dreams, searchQuery, selectedTag, isFavoriteOnly]);

  // 연월별 그룹화 (예: "2026년 6월")
  const groupedDreams = useMemo(() => {
    const groups: Record<string, SavedDream[]> = {};
    filteredDreams.forEach((dream) => {
      const parts = (dream.date || '').split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10);
        const groupKey = `${year}년 ${month}월`;
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(dream);
      }
    });
    return Object.entries(groups);
  }, [filteredDreams]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, isDark && styles.darkSearchContainer]}>
        <Ionicons name="search-outline" size={18} color={isDark ? '#8a82ad' : '#6f6a78'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isDark && styles.darkSearchInput]}
          placeholder="꿈의 제목이나 내용 검색..."
          placeholderTextColor={isDark ? '#8a82ad' : '#a09cb0'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color={isDark ? '#8a82ad' : '#c5bed6'} />
          </Pressable>
        )}
      </View>

      {/* Filter Options */}
      <View style={styles.filterRow}>
        {/* Favorite Only Toggle */}
        <Pressable
          style={[
            styles.filterToggle,
            isDark && styles.darkFilterToggle,
            isFavoriteOnly && styles.filterToggleActive,
          ]}
          onPress={() => setIsFavoriteOnly(!isFavoriteOnly)}
        >
          <Ionicons
            name={isFavoriteOnly ? 'star' : 'star-outline'}
            size={14}
            color={isFavoriteOnly ? '#ffd86a' : (isDark ? '#cdcae2' : '#7558f7')}
          />
          <Text
            style={[
              styles.filterToggleText,
              isDark && styles.darkText,
              isFavoriteOnly && styles.filterToggleTextActive,
            ]}
          >
            즐겨찾기만
          </Text>
        </Pressable>

        {/* Scrollable Tags Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagScrollContent}
        >
          {activeTags.map((tag) => {
            const active = selectedTag === tag.id;
            return (
              <Pressable
                key={tag.id}
                style={[
                  styles.tagChip,
                  isDark && styles.darkTagChip,
                  active && styles.tagChipActive,
                ]}
                onPress={() => setSelectedTag(active ? null : tag.id)}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    isDark && styles.darkText,
                    active && styles.tagChipTextActive,
                  ]}
                >
                  #{tag.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Grouped Dreams List */}
      <View style={styles.listWrapper}>
        {groupedDreams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={36} color={isDark ? '#392e6d' : '#ece8f7'} />
            <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
              조건에 맞는 꿈 기록이 없습니다. ☁️
            </Text>
          </View>
        ) : (
          groupedDreams.map(([groupKey, list]) => (
            <View key={groupKey} style={styles.groupSection}>
              <Text style={[styles.groupTitle, isDark && styles.darkSubText]}>{groupKey}</Text>
              <View style={styles.groupList}>
                {list.map((item) => {
                  const firstMood = item.selectedMoodIds?.[0] || 'calm';
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.dreamItem, isDark && styles.darkDreamItem]}
                      onPress={() => onDreamPress(item)}
                    >
                      <View style={styles.dreamLeft}>
                        <View style={styles.moodIconWrapper}>
                          <MoodFace mood={getMoodObject(firstMood)} size={28} />
                        </View>
                        <View style={styles.dreamInfo}>
                          <Text style={[styles.dreamTitle, isDark && styles.darkText]} numberOfLines={1}>
                            {item.title || '제목 없는 꿈'}
                          </Text>
                          <Text style={styles.dreamDate}>{item.date}</Text>
                        </View>
                      </View>
                      {item.isFavorite && (
                        <Ionicons name="star" size={16} color="#ffd86a" style={styles.favIcon} />
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isDark ? '#392e6d' : '#ece8f7'}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  darkSearchContainer: {
    backgroundColor: '#1c1735',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2d237a',
    fontWeight: '600',
    padding: 0,
    fontFamily: theme.typography.fontFamily,
  },
  darkSearchInput: {
    color: '#ffffff',
  },
  clearBtn: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 32,
    borderWidth: 1,
    borderColor: '#ece8f7',
    gap: 4,
  },
  darkFilterToggle: {
    backgroundColor: '#1c1735',
    borderColor: '#2b2353',
  },
  filterToggleActive: {
    backgroundColor: 'rgba(117, 88, 247, 0.1)',
    borderColor: '#7558f7',
  },
  filterToggleText: {
    fontSize: 11,
    color: '#6f6a78',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
  },
  filterToggleTextActive: {
    color: '#7558f7',
    fontWeight: '700',
  },
  tagScrollContent: {
    gap: 6,
    paddingRight: 16,
  },
  tagChip: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ece8f7',
  },
  darkTagChip: {
    backgroundColor: '#1c1735',
    borderColor: '#2b2353',
  },
  tagChipActive: {
    backgroundColor: '#7558f7',
    borderColor: '#7558f7',
  },
  tagChipText: {
    fontSize: 11.5,
    color: '#6f6a78',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
  },
  tagChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listWrapper: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#8a82ad',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily,
  },
  darkSubText: {
    color: '#cdcae2',
  },
  darkText: {
    color: '#ffffff',
  },
  groupSection: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6f6a78',
    marginBottom: 8,
    fontFamily: theme.typography.displayFontFamily,
  },
  groupList: {
    gap: 10,
  },
  dreamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#6f4be8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  darkDreamItem: {
    backgroundColor: '#1c1735',
  },
  dreamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moodIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(117, 88, 247, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dreamInfo: {
    flex: 1,
  },
  dreamTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2d237a',
    fontFamily: theme.typography.displayFontFamily,
    marginBottom: 3,
  },
  dreamDate: {
    fontSize: 10.5,
    color: '#8a82ad',
    fontFamily: theme.typography.fontFamily,
  },
  favIcon: {
    marginRight: 8,
  },
});
