import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { css, FadeIn, FadeOut } from 'react-native-reanimated';

// On web, an `exiting` animation moves the children of the exiting view into a
// copy of the view. The children's animations should continue from where they
// were through that move: a running CSS animation shouldn't restart, a finished
// entering animation shouldn't replay, and a child's animation ending shouldn't
// end the exiting animation early.
export default function ExitingWithCSSAnimationExample() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        The green bar fades in, waits 500 ms, then grows from 0% to 100% over 2
        s, on repeat. Press Hide while the bar is partly grown. It should keep
        growing while the gray track fades out over 1 s, instead of snapping
        back to 0% or fading in again.
      </Text>
      <Button
        title={isVisible ? 'Hide' : 'Show'}
        onPress={() => setIsVisible((value) => !value)}
      />
      <View style={styles.slot}>
        {isVisible && (
          <Animated.View
            testID="track"
            exiting={FadeOut.duration(1000)}
            style={styles.track}>
            <Animated.View
              testID="fade-in"
              entering={FadeIn.duration(300)}
              style={styles.fill}>
              <Animated.View testID="bar" style={animations.bar} />
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const animations = css.create({
  bar: {
    height: '100%',
    backgroundColor: 'green',
    animationName: css.keyframes({
      from: { width: '0%' },
      to: { width: '100%' },
    }),
    animationDuration: '2s',
    animationDelay: '500ms',
    animationFillMode: 'backwards',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
});

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
  slot: {
    height: 32,
  },
  track: {
    width: 300,
    height: 32,
    backgroundColor: '#ddd',
  },
  fill: {
    flex: 1,
  },
});
