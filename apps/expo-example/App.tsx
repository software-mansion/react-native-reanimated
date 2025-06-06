import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function Appo() {
  const sv = useSharedValue(false);

  const handlePress = () => {
    sv.value = !sv.value;
  };

  const animatedStylez = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(sv.value ? 'red' : 'blue', { duration: 500 }),
    };
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 100,
          height: 100,

          backgroundColor: 'green',
          marginTop: 20,
        }}
      />
      <Animated.View
        style={[animatedStylez, { width: 100, height: 100, marginTop: 20 }]}
      />
      <Pressable
        onPress={handlePress}
        style={{ padding: 20, backgroundColor: 'blue', borderRadius: 5 }}>
        <Text>Mnie</Text>
      </Pressable>
      {/* <App /> */}
    </View>
  );
}
