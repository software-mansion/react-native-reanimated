import React, { useState } from 'react';
import {
  Button,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  BounceIn,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  LinearTransition,
  RotateOutDownLeft,
} from 'react-native-reanimated';

export default function BBExample() {
  const [show, setShow] = useState(true);
  const [show2, setShow2] = useState(false);

  return (
    <View style={styles.container}>
      <Button title="toggle" onPress={() => setShow(!show)} />
      <Button title="toggle" onPress={() => setShow2(!show2)} />
      {show && (
        <TouchableWithoutFeedback onPress={() => setShow(!show)}>
          <Animated.View
            entering={BounceIn}
            layout={LinearTransition}
            style={styles.box}
            exiting={FadeOutLeft.duration(1000)}>
            <Animated.View
              style={styles.innerBox}
              exiting={RotateOutDownLeft.duration(2000)}
              entering={FadeInRight.delay(500)}
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
      {show2 && (
        <Animated.View
          entering={FadeInUp}
          layout={LinearTransition.duration(2000)}
          exiting={RotateOutDownLeft}
          style={[styles.refresher, { width: show ? 200 : 100 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 200,
    backgroundColor: 'pink',
  },
  box: {
    marginTop: 10,
    width: 200,
    height: 100,
    backgroundColor: 'tomato',
  },
  innerBox: {
    marginTop: 10,
    width: 100,
    height: 50,
    backgroundColor: 'green',
  },
  refresher: {
    marginTop: 10,
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
});
