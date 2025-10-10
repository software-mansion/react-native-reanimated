import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function ScrollPerformanceExample() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {Array.from({ length: 500 }).map((_, index) => (
        <Box key={index} />
      ))}
    </ScrollView>
  );
}

function Box() {
  const sv = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: sv.value };
  });

  useEffect(() => {
    sv.value = withRepeat(
      withTiming(1, { duration: Math.random() * 1000 }),
      -1,
      true
    );
  }, [sv]);

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
          styles.box,
          { backgroundColor: Math.random() > 0.5 ? 'red' : 'blue' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  box: {
    width: 100,
    height: 100,
  },
});
