import React from 'react';
import { Button, View, ScrollView, Text } from 'react-native';
import {
  useSharedValue,
  useAnimatedRef,
  useDerivedValue,
  scrollTo,
} from 'react-native-reanimated';

const ScrollToTest = () => {
  const aref = useAnimatedRef();
  const scrollIndex = useSharedValue(0);

  const validIndexes = [0, 5, 10, 14, 40];
  const items = [];
  for (let i = 0; i < validIndexes[validIndexes.length - 1]; ++i) {
    items.push(0);
  }
  validIndexes.forEach((item) => {
    items[item] = 1;
  });

  useDerivedValue(() => {
    scrollTo(aref, 0, validIndexes[scrollIndex.value] * 100, true);
  });

  return (
    <View>
      <Text>This should always scroll to the green colored box</Text>
      <Button
        title="scroll down"
        onPress={() => {
          scrollIndex.value = scrollIndex.value + 1;
          if (scrollIndex.value >= validIndexes.length - 1)
            scrollIndex.value = 0;
        }}
      />
      <View style={{ width: 100, height: 100, backgroundColor: 'black' }}>
        <ScrollView
          ref={aref}
          style={{ backgroundColor: 'orange', width: 100 }}>
          {items.map((value, i) => (
            <View
              key={i}
              style={{
                backgroundColor: value ? 'green' : 'red',
                width: 100,
                height: 100,
              }}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default ScrollToTest;
