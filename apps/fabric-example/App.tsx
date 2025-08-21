import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

function LaunchButton() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
      }}>
      <Pressable>
        {({ pressed }) => (
          <Animated.View
            style={{
              transitionDuration: 100,
              boxShadow: pressed
                ? ` 0px -1px 1px rgba(255, 255, 255, 0.6)`
                : ` 0px -3px 3px rgba(255, 255, 255, 0.85)`,
            }}>
            <Text style={{ color: 'white' }}>Hello</Text>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

export default function Playground() {
  return <LaunchButton />;
}
