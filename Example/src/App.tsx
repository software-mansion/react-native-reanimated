import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Button, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';

const UIPropsExample = React.memo(() => {
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
});

const NativePropsExample = React.memo(() => {
  const [state, setState] = React.useState(0);
  const fontSize = useSharedValue(14);
  const style = useAnimatedStyle(() => {
    return { fontSize: fontSize.value };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Button
        onPress={() => {
          fontSize.value = withSpring(Math.random() * 40 + 10);
        }}
        title="click me"
      />
      <Animated.Text style={style} onPress={() => setState(Math.random())}>lorem ipsum</Animated.Text>
      <Text>sit dolor amet</Text>
    </View>
  );
});

const ScrollViewExample = React.memo(() => {
  const scrollHandler = useAnimatedScrollHandler((event) => {
    console.log(event);
    console.log('dziala!');
  });

  return (
    <Animated.ScrollView
      scrollEventThrottle={16}
      onScroll={scrollHandler}
      style={{ flex: 1, width: '100%' }}>
      {[...Array(100)].map((x, i) => (
        <Text key={i} style={{ fontSize: 50, textAlign: 'center' }}>
          {i}
        </Text>
      ))}
    </Animated.ScrollView>
  );
});

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {/* <UIPropsExample /> */}
      <NativePropsExample />
      {/* <ScrollViewExample /> */}
    </View>
  );
}
