import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Button } from 'react-native';
import Animated, {
  BounceInDown,
  FadeIn,
  FadeOutDown,
  LinearTransition,
  RotateOutDownLeft,
} from 'react-native-reanimated';

const BottomBar = createBottomTabNavigator();

const TabA = () => {
  const [toggle, setToggle] = React.useState(false);

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeIn.duration(1000)}
        layout={LinearTransition}
        exiting={FadeOutDown}
        style={[styles.boxA, { width: toggle ? 200 : 100 }]}
      />
      <Button title="toggle" onPress={() => setToggle((prev) => !prev)} />
    </View>
  );
};

const TabB = () => {
  return (
    <View style={styles.container}>
      <Animated.View
        entering={BounceInDown.duration(1000)}
        exiting={RotateOutDownLeft.duration(1000)}
        style={styles.boxB}
      />
    </View>
  );
};

const BottomTabsExample = () => {
  return (
    <BottomBar.Navigator>
      <BottomBar.Screen name="A" component={TabA} />
      <BottomBar.Screen name="B" component={TabB} />
    </BottomBar.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  boxA: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
  boxB: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
  },
});

export default BottomTabsExample;
