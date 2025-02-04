import Animated, {
  PinwheelIn,
  PinwheelOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { Button, StyleSheet, View, Text } from 'react-native';

import React from 'react';

interface BoxProps {
  config: ReduceMotion;
}

function Box({ config }: BoxProps) {
  const [show, setShow] = React.useState(false);

  return (
    <View style={styles.outerBox}>
      <Button onPress={() => setShow(!show)} title={show ? 'hide' : 'show'} />
      <Text style={styles.text}>{config} reduce</Text>
      {show && (
        <Animated.View
          style={styles.box}
          entering={PinwheelIn.duration(2000).reduceMotion(config)}
          exiting={PinwheelOut.duration(2000).reduceMotion(config)}
        />
      )}
    </View>
  );
}

export default function ReducedMotionLayoutExample() {
  return (
    <View style={styles.container}>
      <Box config={ReduceMotion.Always} />
      <Box config={ReduceMotion.System} />
      <Box config={ReduceMotion.Never} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 20,
    height: '100%',
  },
  box: {
    height: 100,
    width: 100,
    margin: 20,
    backgroundColor: '#b58df1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#b58df1',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  outerBox: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
});
