import { StyleSheet, View } from 'react-native';
import type { DreamMood } from '../types/record';

export type MoodExpression =
  | 'smile'
  | 'line'
  | 'open'
  | 'fear'
  | 'sad'
  | 'wink'
  | 'excited'
  | 'angry'
  | 'sleepy'
  | 'dizzy';

export function MoodFace({ mood, size = 31 }: { mood: DreamMood; size?: number }) {
  const scale = size / 31;
  const faceStyle = [
    styles.face,
    {
      backgroundColor: mood.faceColor,
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ];

  const expr = mood.expression as MoodExpression;

  return (
    <View style={faceStyle}>
      {/* Eyebrows */}
      {expr === 'fear' && (
        <>
          <View
            style={[
              styles.eyebrow,
              styles.leftEyebrow,
              {
                width: 8 * scale,
                height: 1.5 * scale,
                top: 7 * scale,
                left: 5 * scale,
                transform: [{ rotate: '25deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.eyebrow,
              styles.rightEyebrow,
              {
                width: 8 * scale,
                height: 1.5 * scale,
                top: 7 * scale,
                right: 4 * scale,
                transform: [{ rotate: '-25deg' }],
              },
            ]}
          />
        </>
      )}

      {expr === 'angry' && (
        <>
          <View
            style={[
              styles.eyebrow,
              styles.leftEyebrow,
              {
                width: 8 * scale,
                height: 1.5 * scale,
                top: 7 * scale,
                left: 5 * scale,
                transform: [{ rotate: '-25deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.eyebrow,
              styles.rightEyebrow,
              {
                width: 8 * scale,
                height: 1.5 * scale,
                top: 7 * scale,
                right: 4 * scale,
                transform: [{ rotate: '25deg' }],
              },
            ]}
          />
        </>
      )}

      {/* Eyes */}
      {/* Left Eye */}
      {expr === 'excited' ? (
        <View
          style={[
            styles.happyClosedEye,
            {
              width: 5 * scale,
              height: 4 * scale,
              top: 9 * scale,
              left: 8 * scale,
              borderTopWidth: 1.5 * scale,
              borderRadius: 3.5 * scale,
            },
          ]}
        />
      ) : expr === 'sleepy' ? (
        <View
          style={[
            styles.sleepyEye,
            {
              width: 5 * scale,
              height: 1.5 * scale,
              top: 11 * scale,
              left: 8 * scale,
            },
          ]}
        />
      ) : expr === 'dizzy' ? (
        <View
          style={[
            styles.dizzyEye,
            {
              width: 5 * scale,
              height: 1.5 * scale,
              top: 11 * scale,
              left: 8 * scale,
              transform: [{ rotate: '45deg' }],
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.eye,
            styles.leftEye,
            {
              width: 3 * scale,
              height: 4 * scale,
              top: 11 * scale,
              left: 9 * scale,
              borderRadius: 2 * scale,
            },
          ]}
        />
      )}

      {/* Right Eye */}
      {expr === 'excited' ? (
        <View
          style={[
            styles.happyClosedEye,
            {
              width: 5 * scale,
              height: 4 * scale,
              top: 9 * scale,
              right: 8 * scale,
              borderTopWidth: 1.5 * scale,
              borderRadius: 3.5 * scale,
            },
          ]}
        />
      ) : expr === 'sleepy' ? (
        <View
          style={[
            styles.sleepyEye,
            {
              width: 5 * scale,
              height: 1.5 * scale,
              top: 11 * scale,
              right: 8 * scale,
            },
          ]}
        />
      ) : expr === 'dizzy' ? (
        <View
          style={[
            styles.dizzyEye,
            {
              width: 5 * scale,
              height: 1.5 * scale,
              top: 11 * scale,
              right: 8 * scale,
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        />
      ) : expr === 'wink' ? (
        <View
          style={[
            styles.happyClosedEye,
            {
              width: 5 * scale,
              height: 4 * scale,
              top: 9 * scale,
              right: 8 * scale,
              borderTopWidth: 1.5 * scale,
              borderRadius: 3.5 * scale,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.eye,
            styles.rightEye,
            {
              width: 3 * scale,
              height: 4 * scale,
              top: 11 * scale,
              right: 9 * scale,
              borderRadius: 2 * scale,
            },
          ]}
        />
      )}

      {/* Mouth */}
      {(expr === 'smile' || expr === 'wink' || expr === 'excited') && (
        <View
          style={[
            styles.smileMouth,
            {
              width: 14 * scale,
              height: 8 * scale,
              bottom: 7 * scale,
              left: 8.5 * scale,
              borderBottomWidth: 2 * scale,
              borderRadius: 7 * scale,
            },
          ]}
        />
      )}

      {expr === 'line' && (
        <View
          style={[
            styles.lineMouth,
            {
              width: 9 * scale,
              height: 1.5 * scale,
              bottom: 8 * scale,
              left: 11 * scale,
            },
          ]}
        />
      )}

      {(expr === 'open' || expr === 'fear') && (
        <View
          style={[
            styles.openMouth,
            {
              width: 5 * scale,
              height: 6 * scale,
              bottom: 6 * scale,
              left: 13 * scale,
              borderRadius: 4 * scale,
            },
          ]}
        />
      )}

      {(expr === 'sad' || expr === 'angry') && (
        <View
          style={[
            styles.sadMouth,
            {
              width: 14 * scale,
              height: 8 * scale,
              bottom: 4 * scale,
              left: 8.5 * scale,
              borderTopWidth: 2 * scale,
              borderRadius: 7 * scale,
            },
          ]}
        />
      )}

      {expr === 'sleepy' && (
        <View
          style={[
            styles.openMouth,
            {
              width: 4 * scale,
              height: 4 * scale,
              bottom: 6 * scale,
              left: 13.5 * scale,
              borderRadius: 2 * scale,
            },
          ]}
        />
      )}

      {expr === 'dizzy' && (
        <View
          style={[
            styles.lineMouth,
            {
              width: 9 * scale,
              height: 1.5 * scale,
              bottom: 8 * scale,
              left: 11 * scale,
              transform: [{ rotate: '15deg' }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'relative',
  },
  eye: {
    backgroundColor: '#2b2359',
    position: 'absolute',
  },
  leftEye: {},
  rightEye: {},
  happyClosedEye: {
    borderTopColor: '#2b2359',
    position: 'absolute',
  },
  sleepyEye: {
    backgroundColor: '#2b2359',
    position: 'absolute',
  },
  dizzyEye: {
    backgroundColor: '#2b2359',
    position: 'absolute',
  },
  smileMouth: {
    borderBottomColor: '#2b2359',
    position: 'absolute',
  },
  lineMouth: {
    backgroundColor: '#2b2359',
    position: 'absolute',
  },
  openMouth: {
    backgroundColor: '#2b2359',
    position: 'absolute',
  },
  sadMouth: {
    borderTopColor: '#2b2359',
    position: 'absolute',
  },
  eyebrow: {
    backgroundColor: '#2b2359',
    position: 'absolute',
  },
  leftEyebrow: {},
  rightEyebrow: {},
});
