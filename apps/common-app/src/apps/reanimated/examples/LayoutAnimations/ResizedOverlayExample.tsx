import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';

const KEYFRAME_ENTERING = new Keyframe({
  from: { opacity: 0 },
  to: { opacity: 1 },
}).duration(300);

const KEYFRAME_EXITING = new Keyframe({
  from: { opacity: 1 },
  to: { opacity: 0 },
}).duration(1500);

const ANIMATIONS = {
  preset: {
    entering: FadeIn.duration(300),
    exiting: FadeOut.duration(1500),
  },
  keyframe: {
    entering: KEYFRAME_ENTERING,
    exiting: KEYFRAME_EXITING,
  },
  initialValues: {
    entering: FadeIn.duration(300).withInitialValues({ opacity: 0.5 }),
    exiting: FadeOut.duration(1500),
  },
};

type AnimationKind = keyof typeof ANIMATIONS;

// An overlay that fills its parent should keep following the parent after its entering
// animation, and its exiting animation should start from its current size (#11214).
export default function ResizedOverlayExample() {
  const [kind, setKind] = useState<AnimationKind | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Open the overlay, resize the window (or rotate the device), then press
        Close. The overlay should fill the screen the whole time, also while it
        fades out.
      </Text>
      <Button title="Open with a preset" onPress={() => setKind('preset')} />
      <Button
        title="Open with a Keyframe"
        onPress={() => setKind('keyframe')}
      />
      <Button
        title="Open with initial values"
        onPress={() => setKind('initialValues')}
      />
      {kind && (
        <Animated.View
          testID="overlay"
          entering={ANIMATIONS[kind].entering}
          exiting={ANIMATIONS[kind].exiting}
          style={styles.overlay}>
          <Button title="Close" onPress={() => setKind(null)} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
    padding: 16,
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563ebdd',
  },
});
