import React, { useState } from 'react';
import { Button, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedRef,
  useAnimatedStyle,
  measure,
  runOnUI,
} from 'react-native-reanimated';

const MeasureTest = () => {
  const measureResult = useSharedValue(0);
  const [state, setState] = useState(true);
  const colors = ['yellow', 'green', 'blue'];

  const containersData = [];
  const arefs = [];

  for (const color of colors) {
    const width = Math.floor(Math.random() * 50 + 50);
    const height = Math.floor(Math.random() * 50 + 50);
    containersData.push({ width, height, backgroundColor: color });
    arefs.push(useAnimatedRef());
  }

  const uas = useAnimatedStyle(() => {
    const backgroundColor = measureResult.value === 1 ? 'green' : 'red';
    return {
      backgroundColor,
    };
  });

  return (
    <View>
      <Text>
        To perform a test tap on 'set new sizes'(result box should be red) and
        then MEASURE button(result box should turn green)
      </Text>
      <Text>Result box</Text>
      <Animated.View
        style={[
          { width: 30, height: 30, backgroundColor: 'red', margin: 5 },
          uas,
        ]}
      />
      <Button
        title="set new sizes"
        onPress={() => {
          measureResult.value = 0;
          setState(!state);
        }}
      />
      <Button
        title="measure"
        onPress={() => {
          runOnUI(() => {
            'worklet';
            measureResult.value = 1;
            arefs.forEach((aref, index) => {
              const mw = Math.round(measure(aref).width);
              const mh = Math.round(measure(aref).height);
              if (measureResult.value === 1) {
                if (
                  mw !== containersData[index].width ||
                  mh !== containersData[index].height
                ) {
                  measureResult.value = 0;
                }
              }
            });
          })();
        }}
      />
      {containersData.map(({ width, height, backgroundColor }, index) => (
        <View key={index}>
          <Text>
            width: {width} / height: {height}
          </Text>
          <View
            style={{ width, height, backgroundColor, margin: 5 }}
            ref={arefs[index]}
          />
        </View>
      ))}
    </View>
  );
};

export default MeasureTest;
