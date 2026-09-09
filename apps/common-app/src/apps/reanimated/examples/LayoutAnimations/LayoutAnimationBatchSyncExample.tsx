import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

const BAR_COUNT = 500;
const BARS = Array.from({ length: BAR_COUNT }, (_, index) => index);

export default function LayoutAnimationBatchSyncExample() {
  const [alignRight, setAlignRight] = useState(false);

  return (
    <View style={styles.container}>
      <Button
        title={alignRight ? 'Move left' : 'Move right'}
        onPress={() => setAlignRight((value) => !value)}
      />
      <Text style={styles.description}>
        All {BAR_COUNT} bars should form one straight edge while moving and
        touch the side when the animation ends.
      </Text>
      <View
        style={[
          styles.list,
          { alignItems: alignRight ? 'flex-end' : 'flex-start' },
        ]}>
        {BARS.map((index) => (
          <Animated.View
            key={index}
            layout={LinearTransition}
            style={styles.bar}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  description: {
    marginHorizontal: 12,
    marginVertical: 8,
    fontSize: 12,
  },
  list: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#eeeeee',
  },
  bar: {
    width: 100,
    height: 1,
    backgroundColor: 'blue',
  },
});
