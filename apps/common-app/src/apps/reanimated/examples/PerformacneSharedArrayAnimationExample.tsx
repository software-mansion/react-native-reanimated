import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Button } from 'react-native';
import Animated, {
  PerformanceMonitor,
  SharedValue,
  useAnimatedStyle,
  useSharedArray,
  useSharedValue,
} from 'react-native-reanimated';

const randomValue = (min: number, max: number) => {
  'worklet';
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const ARRAY_LENGTH = 500;

export default function PerformanceSharedArrayAnimationExample() {
  const [isSharedValue, setIsSharedValue] = useState(false);
  const bigSharedValueArray = useSharedValue<number[]>(
    Array.from({ length: ARRAY_LENGTH }, () => 100)
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const bigSharedArray = useSharedArray(
    Array.from({ length: ARRAY_LENGTH }, () => 100)
  );

  return (
    <View style={{ flex: 1 }}>
      <PerformanceMonitor />
      <Button
        onPress={() => setIsSharedValue(!isSharedValue)}
        title={isSharedValue ? 'useSharedValue' : 'useSharedArray'}
      />
      <TouchableOpacity onPress={() => {}}>
        <Text>ModifyValue</Text>
      </TouchableOpacity>
      <ScrollView
        style={{
          flex: 1,
          padding: 20,
        }}>
        {isSharedValue
          ? bigSharedValueArray.value.map((value, index) => (
              <AnimatedComponent
                key={index}
                bigArray={bigSharedValueArray}
                index={index}
                isSharedValue={isSharedValue}
              />
            ))
          : bigSharedArray.value.map((value, index) => (
              <AnimatedComponent
                key={index}
                bigArray={bigSharedArray}
                index={index}
                isSharedValue={isSharedValue}
              />
            ))}
      </ScrollView>
    </View>
  );
}

export const AnimatedComponent = ({
  bigArray,
  index,
  isSharedValue,
}: {
  bigArray: SharedValue<number[]>;
  index: number;
  isSharedValue: boolean;
}) => {
  const modify = useCallback(() => {
    if (!isSharedValue) {
      bigArray.modifyValue(index, randomValue(50, 150));
    } else {
      bigArray.modify((prev) => {
        'worklet';
        prev[index] = randomValue(50, 150);
        return prev;
      });
    }
  }, [bigArray, index]);

  const style = useAnimatedStyle((registry) => {
    console.log(
      `ModifyValue: Component #${index} updated width: ${bigArray.value[index]}`
    );
    if (!isSharedValue) {
      registry?.registerForUpdates(bigArray, [index]);
    }
    return {
      backgroundColor: 'red',
      height: 40,
      marginBottom: 10,
      width: (bigArray.value[index] * 2) / 2 + 10,
    };
  });

  useEffect(() => {
    console.log(
      `useEffect: Component #${index} updated width: ${bigArray.value[index]}`
    );
  }, [bigArray.value[index]]);

  return (
    <TouchableOpacity onPress={modify}>
      <Animated.View style={style} />
    </TouchableOpacity>
  );
};
