import Animated, { PinwheelIn, PinwheelOut } from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function NestedEntering() {
  const [outer1, setOuter1] = React.useState(true);
  const [outer2, setOuter2] = React.useState(false);

  return (
    <View style={styles.container}>
      <Button
        onPress={() => {
          setOuter1(!outer1);
        }}
        title="Toggle first"
      />
      <Button
        onPress={() => {
          setOuter2(!outer2);
        }}
        title="Toggle second"
      />
      <Animated.LayoutConfig config={true}>
        <View style={styles.container2}>
          {outer1 && (
            <Animated.View entering={PinwheelIn} style={styles.outerBox}>
              <Animated.LayoutConfig config={false}>
                <Animated.View
                  style={styles.box}
                  entering={PinwheelIn.duration(1000)}
                  exiting={PinwheelOut}
                />
              </Animated.LayoutConfig>
            </Animated.View>
          )}

          {outer2 && (
            <Animated.View entering={PinwheelIn} style={styles.outerBox}>
              <Animated.View
                style={styles.box}
                entering={PinwheelIn.duration(1000)}
                exiting={PinwheelOut}
              />
            </Animated.View>
          )}
        </View>
      </Animated.LayoutConfig>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 150,
  },
  container2: {
    width: 340,
    flexDirection: 'row',
    alignItems: 'center',
  },
  outerBox: {
    width: 150,
    height: 150,
    backgroundColor: 'navy',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    borderRadius: 20,
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
  },
});
