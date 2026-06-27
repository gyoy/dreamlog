import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { DreamKeyword } from '../types/record';
import { theme } from '../theme';

type RecordKeywordSelectorProps = {
  extraKeywords: DreamKeyword[];
  keywords: DreamKeyword[];
  maxSelected: number;
  onToggleKeyword: (keywordId: string) => void;
  onAddKeyword: (label: string) => void;
  onDeleteKeyword: (keywordId: string) => void;
  selectedKeywordIds: string[];
  onToggleMore: () => void;
  showMore: boolean;
  onFocus?: () => void;
  sectionLabel?: string;
};

type KeywordChipProps = {
  keyword: DreamKeyword;
  onToggleKeyword: (id: string) => void;
  onDeleteKeyword?: (id: string) => void;
  selected: boolean;
  isEditMode: boolean;
};

const KeywordChip = memo(function KeywordChip({
  keyword,
  onToggleKeyword,
  onDeleteKeyword,
  selected,
  isEditMode,
}: KeywordChipProps) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 170,
      mass: 0.8,
    }).start();
  }, [progress, selected]);

  const handlePress = useCallback(() => {
    if (isEditMode) {
      onDeleteKeyword?.(keyword.id);
    } else {
      onToggleKeyword(keyword.id);
    }
  }, [isEditMode, keyword.id, onToggleKeyword, onDeleteKeyword]);

  return (
    <Animated.View
      style={[
        styles.chipAnimated,
        {
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.07],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -2.5],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`${keyword.label} 키워드 ${selected ? '선택 해제' : '선택'}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.chipSelected,
          Platform.OS === 'web' ? styles.webNoOutline : null,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{keyword.label}</Text>
        {isEditMode && (
          <View style={styles.deleteBadge}>
            <Text style={styles.deleteBadgeText}>×</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

export const RecordKeywordSelector = memo(function RecordKeywordSelector({
  extraKeywords,
  keywords,
  maxSelected,
  onToggleKeyword,
  onAddKeyword,
  onDeleteKeyword,
  selectedKeywordIds,
  onToggleMore,
  showMore,
  onFocus,
  sectionLabel = '떠오른 키워드',
}: RecordKeywordSelectorProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [newKeywordText, setNewKeywordText] = useState('');

  const visibleKeywords = showMore ? [...keywords, ...extraKeywords] : keywords;

  const handleAddPress = () => {
    const trimmed = newKeywordText.trim();
    if (trimmed) {
      onAddKeyword(trimmed.slice(0, 8)); // limit to 8 chars
      setNewKeywordText('');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{sectionLabel}</Text>
      <View style={styles.headerRow}>
        <View style={styles.titleWithEdit}>
          <Text style={styles.title}>이 꿈에서 떠오르는 키워드를 골라주세요.</Text>
          <Pressable
            onPress={() => setIsEditMode(!isEditMode)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.editToggleBtn,
              isEditMode && styles.editToggleBtnActive,
              pressed && styles.pressed,
              Platform.OS === 'web' ? styles.webNoOutline : null,
            ]}
          >
            <Text style={[styles.editToggleText, isEditMode && styles.editToggleTextActive]}>
              {isEditMode ? '완료' : '편집'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.count}>{selectedKeywordIds.length}/{maxSelected}</Text>
      </View>
      <View style={styles.keywordGrid}>
        {visibleKeywords.map((keyword) => (
          <KeywordChip
            key={keyword.id}
            keyword={keyword}
            onToggleKeyword={onToggleKeyword}
            onDeleteKeyword={onDeleteKeyword}
            selected={selectedKeywordIds.includes(keyword.id)}
            isEditMode={isEditMode}
          />
        ))}
      </View>

      {/* Add Input Row (centered vertically baseline styling without fixed height) */}
      <View style={styles.addInputRow}>
        <TextInput
          style={styles.addInput}
          placeholder="키워드 직접 추가..."
          placeholderTextColor="#a29bcf"
          value={newKeywordText}
          onChangeText={setNewKeywordText}
          maxLength={8}
          onFocus={onFocus}
        />
        <Pressable
          onPress={handleAddPress}
          disabled={!newKeywordText.trim()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.addBtn,
            !newKeywordText.trim() && styles.addBtnDisabled,
            pressed && newKeywordText.trim() && styles.pressed,
            Platform.OS === 'web' ? styles.webNoOutline : null,
          ]}
        >
          <Text style={styles.addBtnText}>+ 추가</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={showMore ? '추가 키워드 접기' : '더 많은 키워드 보기'}
        accessibilityRole="button"
        onPress={onToggleMore}
        style={({ pressed }) => [
          styles.moreButton,
          Platform.OS === 'web' ? styles.webNoOutline : null,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.moreButtonText}>{showMore ? '- 추가 키워드 접기' : '+  더 많은 키워드 보기'}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    backgroundColor: '#F9F7FE',
    borderWidth: 0,
    borderRadius: 15,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    ...Platform.select({
      web: {
          boxShadow:
            '0px 10px 24px rgba(139,125,255,0.12), inset 0px 2px 4px rgba(139,125,255,0.07)',
        } as never,
      default: {
        shadowColor: '#8B7DFF',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 5,
      },
    }),
    width: 339,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    color: '#6C5CC8',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 14,
    letterSpacing: 0.18,
    marginBottom: 8,
    backgroundColor: '#EEE8FF',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    color: '#31267F',
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 22,
  },
  editToggleBtn: {
    marginLeft: 8,
    backgroundColor: '#f1edff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#e1daff',
  },
  editToggleBtnActive: {
    backgroundColor: '#ffeded',
    borderColor: '#ffc5c5',
  },
  editToggleText: {
    color: '#7b61ff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  editToggleTextActive: {
    color: '#ff5c5c',
  },
  count: {
    color: '#7b61ff',
    fontSize: 10,
    fontWeight: '400',
    includeFontPadding: false,
    lineHeight: 16,
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: 6,
    rowGap: 7,
  },
  chipAnimated: {
    height: 34,
    width: 54,
    position: 'relative',
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#f6f3ff',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 54,
    shadowColor: '#a69aff',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#7b61ff',
    shadowColor: '#7b61ff',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.26,
    shadowRadius: 6,
    elevation: 3.5,
  },
  chipText: {
    color: '#7156f3',
    fontSize: 11.5,
    fontWeight: '600',
    includeFontPadding: false,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff5c5c',
    borderRadius: 7.5,
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  deleteBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  addInputRow: {
    flexDirection: 'row',
    marginTop: 13,
    gap: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
    backgroundColor: '#f8f6ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#2d237a',
    fontSize: 11.5,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: '#7b61ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#d8d4ec',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  moreButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    height: 37,
    justifyContent: 'center',
    marginTop: 15,
  },
  moreButtonText: {
    color: '#7568e8',
    fontSize: 11.5,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 14,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
