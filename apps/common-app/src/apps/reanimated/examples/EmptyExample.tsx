import { useIsFocused } from '@react-navigation/native';
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransitionBoundary,
  SlideInDown,
  FadeOutRight,
  SharedTransition,
} from 'react-native-reanimated';

const transition = SharedTransition.duration(3000);

export default function EmptyExample() {
  const [activeID, setActiveID] = React.useState(0);
  const isFocused = useIsFocused();

  return (
    <View style={styles.container}>
      <Button onPress={() => setActiveID((id) => 1 - id)} title="toggle" />
      <View style={styles.fakeScreen}>
        <SharedTransitionBoundary isActive={isFocused && activeID === 0}>
          <Animated.View
            sharedTransitionStyle={transition}
            sharedTransitionTag="tag"
            style={{ backgroundColor: 'red', width: 100, height: 100 }}
          />
        </SharedTransitionBoundary>
      </View>
      {activeID === 1 && (
        <Animated.View
          entering={SlideInDown}
          exiting={FadeOutRight.duration(1000)}
          style={styles.fakeScreen}>
          <SharedTransitionBoundary isActive={isFocused && activeID === 1}>
            <Animated.View
              sharedTransitionTag="tag"
              style={{
                backgroundColor: 'blue',
                width: 100,
                height: 100,
                transform: [{ rotate: '-225deg' }],
              }}
            />
          </SharedTransitionBoundary>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 150,
    alignItems: 'center',
  },
  fakeScreen: {
    backgroundColor: 'grey',
    width: 200,
    height: 200,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
