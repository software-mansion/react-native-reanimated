import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
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
  const [state, setState] = useState(0);
  const width = useSharedValue(0);

  const style = useAnimatedStyle(() => {
    return { width: 100 + 120 * width.value };
  }, []);

  const handleTouch = () => {
    width.value = withTiming(1 - width.value, { duration: 2000 });
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: state % 2 ? 100 : 50,
        height: 1000,
      }}>
      <View
        style={{
          height: 100,
          width: 50,
          backgroundColor: 'black',
        }}
        onTouchStart={() => setState((s) => s + 1)}
      />
      <Animated.View
        onTouchStart={handleTouch}
        style={[
          {
            height: state % 2 ? 125 : 175,
            backgroundColor: state % 2 ? 'blue' : 'lime',
          },
          style,
        ]}>
      </Animated.View>
      <View
        style={{
          height: state % 2 ? 150 : 200,
          width: 50,
          backgroundColor: state % 2 ? 'red' : 'yellow',
          flex: 1,
          alignItems: state % 2 ? 'center' : 'flex-start',
          justifyContent: state % 2 ? 'flex-start' : 'flex-end',
        }}
        onTouchStart={() => setState((s) => s + 1)}>
        <View style={{ width: 10, height: 10, backgroundColor: 'black' }} />
      </View>
    </Animated.View>
  );
}
