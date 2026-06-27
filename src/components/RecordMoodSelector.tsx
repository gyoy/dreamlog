import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MoodFace } from './MoodFace';
import { CustomMoodModal } from './CustomMoodModal';
import type { DreamMood, DreamMoodId } from '../types/record';
import { theme } from '../theme';

type RecordMoodSelectorProps = {
  moods: DreamMood[];
  onSelectMood: (moodId: DreamMoodId) => void;
  selectedMoodIds: DreamMoodId[];
  onAddMood: (mood: DreamMood) => void;
  onDeleteMood: (moodId: DreamMoodId) => void;
  sectionLabel?: string;
};

type MoodCardProps = {
  mood: DreamMood;
  onSelectMood: (id: DreamMoodId) => void;
  onDeleteMood?: (id: DreamMoodId) => void;
  selected: boolean;
  isEditMode: boolean;
};

const MoodCard = memo(function MoodCard({
  mood,
  onSelectMood,
  onDeleteMood,
  selected,
  isEditMode,
}: MoodCardProps) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 160,
      mass: 0.8,
    }).start();
  }, [progress, selected]);

  const handlePress = useCallback(() => {
    if (isEditMode) {
      onDeleteMood?.(mood.id);
    } else {
      onSelectMood(mood.id);
    }
  }, [isEditMode, mood.id, onSelectMood, onDeleteMood]);

  return (
    <Animated.View
      style={[
        styles.cardAnimated,
        {
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.07],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`${mood.label} 감정 ${selected ? '선택됨' : '선택'}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.moodCard,
          selected && styles.moodCardSelected,
          selected && Platform.OS !== 'web' && { shadowColor: mood.faceColor },
          Platform.OS === 'web' ? styles.webNoOutline : null,
          pressed && styles.pressed,
        ]}
      >
        <MoodFace mood={mood} />
        <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{mood.label}</Text>
        {isEditMode && (
          <View style={styles.deleteBadge}>
            <Text style={styles.deleteBadgeText}>×</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

export const RecordMoodSelector = memo(function RecordMoodSelector({
  moods,
  onSelectMood,
  selectedMoodIds,
  onAddMood,
  onDeleteMood,
  sectionLabel = '꿈의 감정',
}: RecordMoodSelectorProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{sectionLabel}</Text>
      <View style={styles.titleRow}>
        <View style={styles.titleWithEdit}>
          <Text style={styles.title}>이 꿈에서 느낀 감정을 선택해주세요.</Text>
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
      </View>
      
      <View style={styles.moodRow}>
        {moods.map((mood) => (
          <MoodCard
            key={mood.id}
            mood={mood}
            onSelectMood={onSelectMood}
            onDeleteMood={onDeleteMood}
            selected={selectedMoodIds.includes(mood.id)}
            isEditMode={isEditMode}
          />
        ))}

        {/* Add Mood Button Card with hitSlop for easier press */}
        {!isEditMode && (
          <Pressable
            accessibilityLabel="감정 직접 추가"
            accessibilityRole="button"
            onPress={() => setIsModalVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              styles.addCardButton,
              pressed && styles.pressed,
              Platform.OS === 'web' ? styles.webNoOutline : null,
            ]}
          >
            <View style={styles.addCardIconWrap}>
              <Text style={styles.addCardPlusText}>+</Text>
            </View>
            <Text style={styles.addCardLabel}>추가</Text>
          </Pressable>
        )}
      </View>

      <CustomMoodModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={onAddMood}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleWithEdit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.memoTitle,
    fontFamily: theme.typography.displayFontFamily,
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 22,
  },
  editToggleBtn: {
    marginLeft: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.xs, // 6 -> xs is 3, sm is 8. Let's keep 6 or use sm. Let's use sm.
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  editToggleBtnActive: {
    backgroundColor: '#ffeded',
    borderColor: '#ffc5c5',
  },
  editToggleText: {
    color: theme.colors.accent,
    fontSize: 10.5,
    fontWeight: '700',
  },
  editToggleTextActive: {
    color: '#ff5c5c',
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
    justifyContent: 'flex-start',
  },
  cardAnimated: {
    height: 61,
    width: 57,
  },
  moodCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.cardSurface,
    borderRadius: theme.radius.md, // 12
    borderWidth: 0,
    height: 61,
    shadowColor: '#8B7DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
    justifyContent: 'flex-start',
    width: 57,
    position: 'relative',
  },
  moodCardSelected: {
    backgroundColor: '#F4F0FF',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  moodLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: theme.colors.accent,
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
    color: theme.colors.textLight,
    fontSize: theme.typography.sizes.labelSmall, // 11
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  addCardButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgWhite,
    borderColor: theme.colors.placeholder,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md, // 12
    borderWidth: 1.5,
    height: 61,
    justifyContent: 'center',
    width: 57,
  },
  addCardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  addCardPlusText: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  addCardLabel: {
    color: theme.colors.textHelper,
    fontSize: theme.typography.sizes.labelSmall, // 11
    fontWeight: '700',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
