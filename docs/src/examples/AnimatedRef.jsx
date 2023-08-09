import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

export default function App() {
  // highlight-next-line
  const animatedRef = useAnimatedRef();

  return (
    <View style={styles.container}>
      <Animated.View
        // highlight-next-line
        ref={animatedRef}
        style={styles.box}
        onLayout={() => {
          // Returns a reference to the component
          // highlight-next-line
          const component = animatedRef.current;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginVertical: 64,
  },
});
