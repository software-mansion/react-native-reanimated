import { selectAssetSource } from 'expo-asset/build/AssetSources';
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, {
  AnimatedLayout,
  makeMutable,
  withTiming,
  withDelay,
  SlideInDown,
} from 'react-native-reanimated';

function CustomLayoutTransiton() {
  const isEven = makeMutable(1);
  return (values) => {
    'worklet';
    const isEvenLocal = isEven.value;
    isEven.value = 1 - isEven.value;

    return {
      animations: {
        originX: withDelay(
          isEvenLocal ? 1000 : 0,
          withTiming(values.originX, { duration: 1000 })
        ),
        originY: withDelay(
          isEvenLocal ? 0 : 1000,
          withTiming(values.originY, { duration: 1000 })
        ),
        width: withTiming(values.width, { duration: 1000 }),
        height: withTiming(values.height, { duration: 1000 }),
      },
      initialValues: {
        originX: values.boriginX,
        originY: values.boriginY,
        width: values.bwidth,
        height: values.bheight,
      },
    };
  };
}

function Box({ label, state }: { label: string; state: boolean }) {
  const ind = label.charCodeAt(0) - 'A'.charCodeAt(0);
  const delay = 300 * ind;
  return (
    <Animated.View
      layout={CustomLayoutTransiton()}
      style={[styles.box, { height: state ? 30 : 60 }]}>
      <Text> {label} </Text>
    </Animated.View>
  );
}

export function CustomLayoutAnimationScreen(): React.ReactElement {
  const [state, setState] = useState(true);
  return (
    <View style={{ marginTop: 30 }}>
      <View style={{ height: 300 }}>
        <AnimatedLayout
          style={{ flexDirection: state ? 'row' : 'column', borderWidth: 1 }}>
          <Box key="a" label="A" state={state} />
          <Box key="b" label="B" state={state} />
          <Box key="c" label="C" state={state} />
        </AnimatedLayout>
      </View>

      <Button
        onPress={() => {
          setState(!state);
        }}
        title="toggle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    margin: 20,
    padding: 5,
    borderWidth: 1,
    borderColor: 'black',
    width: 60,
    height: 60,
  },
});



