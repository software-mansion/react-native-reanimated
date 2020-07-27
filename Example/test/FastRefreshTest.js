import React, { useState } from 'react';
import { Button, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

const FastRefreshTest = () => {
  const [state, setState] = useState(21);

  const shared = useSharedValue(state);

  const derived = useDerivedValue(() => {
    return state;
  }, [state]);

  const uas = useAnimatedStyle(() => {
    return {
      width: shared.value,
    };
  });

  const uas2 = useAnimatedStyle(() => {
    return {
      width: state,
    };
  }, [state]);

  const uas3 = useAnimatedStyle(() => {
    return {
      width: state,
    };
  });

  return (
    <View>
      <Button
        title="change"
        onPress={() => {
          setState(Math.floor(Math.random() * 300));
        }}
      />
      <Text>
        All numbers should be the same: {state} / {derived.value} /{' '}
        {shared.value}
      </Text>
      <Text>The lengths of the following containers should be the same</Text>
      <Animated.View style={[styles.box, uas]} />
      <Animated.View style={[styles.box, uas2]} />
      <Text>But this should not update</Text>
      <Animated.View style={[styles.box, uas3]} />
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    backgroundColor: 'orange',
    margin: 10,
  },
});

export default FastRefreshTest;
