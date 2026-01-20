import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransitionBoundary } from 'react-native-reanimated';

export default function EmptyExample() {
  const [activeID, setActiveID] = React.useState(0);

  return (
    <View style={styles.container}>
      <Button onPress={() => setActiveID((id) => 1 - id)} title="toggle" />
      <View style={styles.fakeScreen}>
        <SharedTransitionBoundary isActive={activeID === 0}>
          <Animated.View
            sharedTransitionTag="tag"
            style={{ backgroundColor: 'red', width: 100, height: 100 }}
          />
        </SharedTransitionBoundary>
      </View>
      {activeID === 1 && (
        <View style={styles.fakeScreen}>
          <SharedTransitionBoundary isActive={activeID === 1}>
            <Animated.View
              sharedTransitionTag="tag"
              style={{ backgroundColor: 'blue', width: 100, height: 100 }}
            />
          </SharedTransitionBoundary>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fakeScreen: {
    backgroundColor: 'grey',
    width: 200,
    height: 200,
    margin: 10,
  },
});
