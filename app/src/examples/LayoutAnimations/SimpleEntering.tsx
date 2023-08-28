import Animated, { PinwheelIn, PinwheelOut } from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function SimpleEntering() {
  const [outer, setOuter] = React.useState(true);

  return (
    <Animated.LayoutConfig config={true}>
      <View style={styles.container}>
        <Button
          onPress={() => {
            setOuter(!outer);
          }}
          title="Toggle"
        />
        {outer && (
          <Animated.View
            entering={PinwheelIn}
            exiting={PinwheelOut}
            style={styles.outerBox}
          />
        )}
      </View>
    </Animated.LayoutConfig>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
  },
  outerBox: {
    width: 150,
    height: 150,
    flexDirection: 'row',
    backgroundColor: 'navy',
    alignItems: 'center',
    borderRadius: 20,
  },
});
