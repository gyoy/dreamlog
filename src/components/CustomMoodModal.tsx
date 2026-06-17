import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MoodFace, type MoodExpression } from './MoodFace';
import type { DreamMood } from '../types/record';

type CustomMoodModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (mood: DreamMood) => void;
};

const PASTEL_COLORS = [
  { hex: '#ffd66b', label: '기쁨' },
  { hex: '#94ddd0', label: '평온' },
  { hex: '#ff8588', label: '두려움' },
  { hex: '#9ec4f7', label: '슬픔' },
  { hex: '#d4c2fc', label: '설렘' },
];

const EXPRESSIONS: MoodExpression[] = [
  'smile',
  'line',
  'open',
  'fear',
  'sad',
  'wink',
  'excited',
  'angry',
  'sleepy',
  'dizzy',
];

export function CustomMoodModal({ visible, onClose, onSave }: CustomMoodModalProps) {
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].hex);
  const [selectedExpression, setSelectedExpression] = useState<MoodExpression>('smile');

  const handleSave = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    
    const newMood: DreamMood = {
      id: `custom_mood_${Date.now()}`,
      label: trimmedLabel.slice(0, 4), // limit to 4 chars
      faceColor: selectedColor,
      expression: selectedExpression,
    };
    
    onSave(newMood);
    setLabel('');
    setSelectedColor(PASTEL_COLORS[0].hex);
    setSelectedExpression('smile');
    onClose();
  };

  const previewMood: DreamMood = {
    id: 'preview',
    label: label.trim() || '미리보기',
    faceColor: selectedColor,
    expression: selectedExpression,
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>새로운 감정 등록</Text>
          
          {/* Preview Container */}
          <View style={styles.previewContainer}>
            <View style={styles.previewCard}>
              <MoodFace mood={previewMood} size={46} />
              <Text style={styles.previewLabel}>{previewMood.label}</Text>
            </View>
          </View>

          {/* Label Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>감정 이름 (최대 4자)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 설렘, 당황"
              placeholderTextColor="#b5aedc"
              value={label}
              onChangeText={setLabel}
              maxLength={4}
            />
          </View>

          {/* Color Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>얼굴 색상 선택</Text>
            <View style={styles.colorRow}>
              {PASTEL_COLORS.map((color) => {
                const isSelected = selectedColor === color.hex;
                return (
                  <Pressable
                    key={color.hex}
                    onPress={() => setSelectedColor(color.hex)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color.hex },
                      isSelected && styles.colorCircleSelected,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Expression Selector (10 items in 2x5 grid, no labels) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>표정 선택</Text>
            <View style={styles.expressionGrid}>
              {EXPRESSIONS.map((expr) => {
                const isSelected = selectedExpression === expr;
                const tempMood: DreamMood = {
                  id: expr,
                  label: '',
                  faceColor: selectedColor,
                  expression: expr,
                };
                return (
                  <Pressable
                    key={expr}
                    onPress={() => setSelectedExpression(expr)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    style={[
                      styles.expressionBtn,
                      isSelected && styles.expressionBtnSelected,
                    ]}
                  >
                    <MoodFace mood={tempMood} size={30} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
                Platform.OS === 'web' && styles.webNoOutline,
              ]}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            
            <Pressable
              onPress={handleSave}
              disabled={!label.trim()}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.saveButton,
                !label.trim() && styles.saveButtonDisabled,
                pressed && label.trim() && styles.pressed,
                Platform.OS === 'web' && styles.webNoOutline,
              ]}
            >
              <Text style={styles.saveButtonText}>우주 감정 등록</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 33, 138, 0.45)',
    flex: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    width: 320,
    shadowColor: '#25218a',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    color: '#2d237a',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e8e2ff',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 90,
    justifyContent: 'center',
    width: 80,
    shadowColor: '#25218a',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  previewLabel: {
    color: '#6d4bff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  section: {
    marginBottom: 18,
  },
  inputSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#554a9d',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f6ff',
    borderColor: '#ded5ff',
    borderRadius: 10,
    borderWidth: 1,
    color: '#2d237a',
    fontSize: 13,
    fontWeight: '500',
    height: 42,
    paddingHorizontal: 14,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  colorCircle: {
    borderRadius: 16,
    height: 32,
    width: 32,
    borderColor: 'transparent',
    borderWidth: 2,
  },
  colorCircleSelected: {
    borderColor: '#6d4bff',
    shadowColor: '#6d4bff',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.08 }],
  },
  expressionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  expressionBtn: {
    alignItems: 'center',
    backgroundColor: '#f8f6ff',
    borderColor: '#e5deff',
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  expressionBtnSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#6d4bff',
    borderWidth: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ded5ff',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#8d85bf',
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#6d4bff',
    borderRadius: 14,
    flex: 2,
    height: 42,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d8d4ec',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  webNoOutline: {
    outlineStyle: 'none',
  } as never,
});
