import Animated, {
  FadeInLeft,
  FadeInUp,
  FadeOutDown,
  FadeOutRight,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function BasicNestedLayoutAnimation() {
  const [visible, setVisible] = React.useState(true);

  return (
    <View style={styles.container}>
      <Button onPress={() => setVisible(!visible)} title="Create/Remove" />
      {visible && (
        <Animated.View
          entering={FadeInLeft.duration(1000)}
          exiting={FadeOutRight.duration(1000)}
          style={styles.box1}>
          <Animated.View
            entering={FadeInUp.duration(1000)}
            exiting={FadeOutDown.duration(1000)}
            style={styles.box2}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
  },
  box1: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'lime',
  },
  box2: {
    width: 50,
    height: 50,
    backgroundColor: 'black',
  },
});
