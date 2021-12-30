import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Button, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';

export default function OldUIPropsExample() {
  const x = useSharedValue(1);

  const style = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${x.value}deg` }],
    };
  }, []);

  const [text, setText] = useState('');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text> uuu </Text>
      <Animated.View style={style}>
        <Text> {text} </Text>
        <TouchableOpacity
          onPress={() => {
            setText(text + 'a');
          }}>
          <Text>click 2</Text>
        </TouchableOpacity>
        <Button
          onPress={() => {
            x.value = withSpring(Math.random() * 180);
            setText(text + 'a');
            console.log('dsfwsfwe');
          }}
          title="click me"
        />
      </Animated.View>
    </View>
  );
}
