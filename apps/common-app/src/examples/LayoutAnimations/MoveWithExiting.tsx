import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

export default function MoveWithExiting() {
  const [collapsable, setCollapsable] = React.useState(false);

  return (
    <View style={styles.container}>
      <Button
        title="Toggle Collapsable"
        onPress={() => setCollapsable(!collapsable)}
      />
      <View
        collapsable={collapsable}
        style={[
          styles.largeSquare,
          { backgroundColor: collapsable ? 'transparent' : 'red' },
        ]}>
        <Animated.View
          exiting={FadeOut}
          style={[styles.mediumSquare, { backgroundColor: 'blue' }]}>
          {!collapsable && (
            <View style={[styles.smallSquare, { backgroundColor: 'green' }]} />
          )}
        </Animated.View>
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
  largeSquare: {
    width: 200,
    height: 200,
  },
  mediumSquare: {
    width: 100,
    height: 100,
  },
  smallSquare: {
    width: 50,
    height: 50,
  },
});
