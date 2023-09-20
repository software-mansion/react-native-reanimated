'use strict';
import Animated, {
  LayoutAnimationConfig,
  PinwheelIn,
  PinwheelOut,
} from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function NestedLayoutAnimationConfig() {
  const [outer1, setOuter1] = React.useState(true);
  const [inner1, setInner1] = React.useState(true);
  const [outer2, setOuter2] = React.useState(true);
  const [inner2, setInner2] = React.useState(true);

  return (
    <View style={styles.container}>
      <Button
        onPress={() => {
          setOuter1(!outer1);
        }}
        title={toggleString(outer1) + ' first outer'}
      />
      <Button
        onPress={() => {
          setInner1(!inner1);
        }}
        title={toggleString(inner1) + ' first inner'}
      />
      <Button
        onPress={() => {
          setOuter2(!outer2);
        }}
        title={toggleString(outer2) + ' second outer'}
      />
      <Button
        onPress={() => {
          setInner2(!inner2);
        }}
        title={toggleString(inner2) + ' second inner'}
      />
      <LayoutAnimationConfig skipEntering>
        <View style={styles.rowContainer}>
          <View style={styles.boxContainer}>
            {outer1 && (
              <Animated.View
                entering={PinwheelIn.duration(1000)}
                exiting={PinwheelOut.duration(2000)}
                style={styles.outerBox}>
                <LayoutAnimationConfig skipEntering skipExiting>
                  {inner1 && (
                    <Animated.View
                      style={styles.box}
                      entering={PinwheelIn.duration(2000)}
                      exiting={PinwheelOut.duration(1000)}
                    />
                  )}
                </LayoutAnimationConfig>
              </Animated.View>
            )}
          </View>
          <View style={styles.boxContainer}>
            {outer2 && (
              <Animated.View
                entering={PinwheelIn.duration(1000)}
                exiting={PinwheelOut.duration(2000)}
                style={styles.outerBox}>
                {/* setting skipEntering to false cancels the skip */}
                <LayoutAnimationConfig skipEntering={false} skipExiting>
                  {inner2 && (
                    // setting skipExiting to false cancels the skip
                    <LayoutAnimationConfig skipExiting={false}>
                      <Animated.View
                        style={styles.box}
                        entering={PinwheelIn.duration(2000)}
                        exiting={PinwheelOut.duration(1000)}
                      />
                    </LayoutAnimationConfig>
                  )}
                </LayoutAnimationConfig>
              </Animated.View>
            )}
          </View>
        </View>
      </LayoutAnimationConfig>
    </View>
  );
}

function toggleString(value: boolean) {
  return value ? 'Hide' : 'Show';
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
    height: 150,
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
