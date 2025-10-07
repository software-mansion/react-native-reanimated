import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={{ gap: 10 }}>
      {Array.from({ length: 500 }).map((_, index) => (
        <SomeAnimatedRow key={index} />
      ))}
    </ScrollView>
  );
}

const SomeAnimatedRow = () => {
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: Math.random() * 1000,
      }),
      -1,
      true
    );
  }, [opacity]);

  return (
    <View
      style={{
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: 100,
            height: 100,
            backgroundColor: Math.random() > 0.5 ? 'red' : 'blue',
          },
        ]}
      />
    </View>
  );
};
