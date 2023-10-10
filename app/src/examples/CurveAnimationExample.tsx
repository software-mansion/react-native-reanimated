import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  CurvedTransition,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';

export default function AnimatedStyleUpdateExample() {
  const [toggle, setToggle] = useState(false);
  const transition = useSharedValue(0);

  useEffect(() => {
    transition.value = toggle ? 0 : 100;
  }, [toggle, transition]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      marginLeft: withTiming(transition.value, {
        duration: 300,
        easing: Easing.in(Easing.ease),
      }),
      marginTop: withTiming(transition.value, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      }),
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Animated.View
          style={[
            styles.box,
            { marginLeft: toggle ? 0 : 100, marginTop: toggle ? 0 : 100 },
          ]}
          layout={CurvedTransition.duration(300)}
        />
      </View>
      <View style={styles.section}>
        <Animated.View style={[styles.box, animatedStyle]} />
      </View>
      <Button
        title="toggle"
        onPress={() => {
          setToggle(!toggle);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: 50,
  },
  section: {
    height: 250,
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'black',
    // margin: 30,
  },
});
