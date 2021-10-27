import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

export default function FlexExample() {
  const [state, setState] = useState(0);
  const width = useSharedValue(0);

  const style1 = useAnimatedStyle(() => {
    return {
      width: 100 + 100 * width.value,
      height: 50 + width.value * 100,
      // marginRight: width.value * 30,
      // opacity: 0.5 + 0.5 * width.value,
    };
  }, []);

  const style2 = useAnimatedStyle(() => {
    return {
      width: 50 + 50 * width.value,
      height: 50 + width.value * 100,
      // borderLeftWidth: width.value * 30,
    };
  }, []);

  const style3 = useAnimatedStyle(() => {
    const x = Math.round(width.value * 255);
    return {
      fontSize: 20 + width.value * 60,
      fontWeight: 'bold',
      color: `rgb(${x},${x},${x})`,
    };
  }, []);

  const handleTouch = () => {
    width.value = withTiming(1 - width.value, { duration: 1500 });
  };

  return (
    <ScrollView>
      <Animated.View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
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
              alignItems: state % 2 ? 'center' : 'flex-start',
              justifyContent: state % 2 ? 'flex-start' : 'flex-end',
            },
            style1,
          ]}>
          {/* <Animated.Text style={style3}>42</Animated.Text> */}
          <View style={{ width: 10, height: 10, backgroundColor: 'black' }} />
        </Animated.View>
        <View
          style={{
            height: state % 2 ? 150 : 200,
            width: 50,
            backgroundColor: state % 2 ? 'red' : 'yellow',
            alignItems: state % 2 ? 'center' : 'flex-start',
            justifyContent: state % 2 ? 'flex-start' : 'flex-end',
            flex: 1,
          }}
          onTouchStart={() => setState((s) => s + 1)}>
          <View style={{ width: 10, height: 10, backgroundColor: 'black' }} />
        </View>
        <Animated.View
          onTouchStart={handleTouch}
          style={[
            {
              height: state % 2 ? 125 : 175,
              backgroundColor: state % 2 ? 'blue' : 'lime',
              alignItems: state % 2 ? 'center' : 'flex-start',
              justifyContent: state % 2 ? 'flex-start' : 'flex-end',
              borderLeftColor: state % 2 ? 'violet' : 'black',
            },
            style2,
          ]}>
          <View style={{ width: 10, height: 10, backgroundColor: 'black' }} />
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}
