import Animated, {
  useSharedValue,
  useAnimatedStyle,
  CurvedTransition,
  withCurveTransition,
} from 'react-native-reanimated';
import { View, Text, Button, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';

const LIGHT_BLUE = '#4fc3f7';
const DARK_BLUE = '#0288d1';

export default function AnimatedStyleUpdateExample() {
  const [toggle, setToggle] = useState(false);
  const transition = useSharedValue(0);

  useEffect(() => {
    transition.value = toggle ? 0 : 100;
  }, [toggle, transition]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      marginLeft: withCurveTransition(transition.value, 300).x,
      marginTop: withCurveTransition(transition.value, 300).y,
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
          layout={CurvedTransition.duration(300)}>
          <Text style={styles.text}>CurvedTransition</Text>
        </Animated.View>
      </View>
      <View style={styles.section}>
        <Animated.View style={[styles.box, animatedStyle]}>
          <Text style={styles.text}>UseAnimatedStyle</Text>
        </Animated.View>
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
    width: 200,
    height: 100,
    backgroundColor: LIGHT_BLUE,
    borderWidth: 4,
    borderRadius: 10,
    borderColor: DARK_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 17,
  },
});
