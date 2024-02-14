import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeOutLeft,
  LinearTransition,
} from 'react-native-reanimated';
import React from 'react';

export default function EmptyExample() {
  const [show, setShow] = React.useState(true);
  const [refresher, setRefresher] = React.useState(false);
  console.log('dupa');
  return (
    <View style={styles.container}>
      {show && (
        <Animated.View
          onTouchStart={() => setShow(!show)}
          onLayout={() => {}}
          style={styles.box}
          exiting={FadeOutLeft}
        />
      )}
      <Animated.View
        onLayout={() => {}}
        layout={LinearTransition}
        onTouchStart={() => setRefresher(!refresher)}
        style={styles.refresher}
      />
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
    width: 200,
    height: 100,
    backgroundColor: 'tomato',
  },
  refresher: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
});
