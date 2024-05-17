import { StyleSheet, View, Button } from 'react-native';
import Animated, {
  getViewProp,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import React, { useEffect } from 'react';

export default function GetViewPropExample() {
  const sv = useSharedValue(0);
  const animatedRef = useAnimatedRef();

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: sv.value,
    };
  });

  const handlePress = async () => {
    // @ts-ignore this is fine
    const viewTag = animatedRef() as number;
    const result = await getViewProp(viewTag, 'opacity');
    console.log(result);
  };

  return (
    <View style={styles.container}>
      <Animated.View ref={animatedRef} style={[animatedStyle, styles.box]} />
      <Button title="Press me" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'navy',
  },
});
