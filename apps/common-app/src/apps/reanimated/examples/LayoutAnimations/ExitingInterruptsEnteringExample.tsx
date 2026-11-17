import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// An exiting animation that starts while the entering animation is still running
// should continue from the view's current opacity, instead of jumping to the
// exiting animation's initial value first.
export default function ExitingInterruptsEnteringExample() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Press Show, then press Hide before the square has fully faded in. It
        should fade out from its current opacity, instead of jumping to full
        opacity first.
      </Text>
      <Button
        title={isVisible ? 'Hide' : 'Show'}
        onPress={() => setIsVisible((value) => !value)}
      />
      <View style={styles.slot}>
        {isVisible && (
          <Animated.View
            testID="square"
            entering={FadeIn.duration(1000)}
            exiting={FadeOut.duration(1000)}
            style={styles.square}
          />
        )}
      </View>
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
  slot: {
    width: 120,
    height: 120,
  },
  square: {
    width: 120,
    height: 120,
    backgroundColor: '#2563eb',
  },
});
