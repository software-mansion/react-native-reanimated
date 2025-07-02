import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

export default function ReparentingExample() {
  const [collapsable, setCollapsable] = React.useState(false);
  return (
    <View style={styles.container}>
      <Button
        title="Toggle Collapsable"
        onPress={() => setCollapsable(!collapsable)}
      />
      <View collapsable={false}>
        <View collapsable={collapsable}>
          <Animated.View
            layout={LinearTransition}
            style={[styles.box, { width: collapsable ? 100 : 200 }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'tomato',
  },
});
