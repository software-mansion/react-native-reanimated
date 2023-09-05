import Animated, {
  LayoutAnimationConfig,
  PinwheelIn,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function NestedEntering() {
  const [outer1, setOuter1] = React.useState(true);
  const [inner1, setInner1] = React.useState(true);
  const [outer2, setOuter2] = React.useState(false);
  const [inner2, setInner2] = React.useState(true);

  return (
    <View style={styles.container}>
      <Button
        onPress={() => {
          setOuter1(!outer1);
        }}
        title="Toggle first outer"
      />
      <Button
        onPress={() => {
          setInner1(!inner1);
        }}
        title="Toggle first inner"
      />
      <Button
        onPress={() => {
          setOuter2(!outer2);
        }}
        title="Toggle second outer"
      />
      <Button
        onPress={() => {
          setInner2(!inner2);
        }}
        title="Toggle second inner"
      />
      <LayoutAnimationConfig skipInitial>
        <View style={styles.rowContainer}>
          <View style={styles.boxContainer}>
            {outer1 && (
              <Animated.View entering={PinwheelIn} style={styles.outerBox}>
                <LayoutAnimationConfig skipInitial={false}>
                  {inner1 && (
                    <Animated.View
                      style={styles.box}
                      entering={PinwheelIn.duration(1000)}
                    />
                  )}
                </LayoutAnimationConfig>
              </Animated.View>
            )}
          </View>
          <View style={styles.boxContainer}>
            {outer2 && (
              <Animated.View entering={PinwheelIn} style={styles.outerBox}>
                {inner2 && (
                  <Animated.View
                    style={styles.box}
                    entering={PinwheelIn.duration(1000)}
                  />
                )}
              </Animated.View>
            )}
          </View>
        </View>
      </LayoutAnimationConfig>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 100,
  },
  rowContainer: {
    width: 340,
    marginTop: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxContainer: {
    width: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerBox: {
    width: 150,
    height: 150,
    backgroundColor: '#b58df1',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: '#782aeb',
  },
});
