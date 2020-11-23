import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { Button, ScrollView } from 'react-native';
import React from 'react';

export default function SharedAnimatedStyleUpdateExample(props) {
  const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
    };
  });

  const renderList = () => {
    const items = [];
    for (let i = 0; i < 100; i++) {
      items.push(
        <Animated.View
          key={i}
          style={[
            { width: 100, height: 5, backgroundColor: 'black', margin: 1 },
            style,
          ]}
        />
      );
    }
    return items;
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
        }}
      />
      {renderList()}
    </ScrollView>
  );
}
