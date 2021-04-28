import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withRepeat,
  concat,
  interpolateNode,
  interpolate
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';
import { loop } from "react-native-redash/src/v1";

const dummy = new Array(100).fill(1);
function AnimatedStyleUpdateExample() {
  return (
    <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
      {dummy.map((_, i) => {

        const val = useSharedValue(0);
        const DEG = Math.PI;
        val.value = withRepeat(
          withTiming(DEG, { duration: 5000 }),
          -1, true
        );
        
        const style = useAnimatedStyle(() => {
          'worklet';
          return {
            transform: [
              //  { rotate: withTiming(val.value, { duration: 50 }) },
              //  { rotate: val.value + "deg" },
              // { rotate: interpolate(val.value, {
              //   inputRange: [0, 1],
              //   outputRange: [0, Math.PI * 2],
              // }) + "deg" }, 
               { rotate: val.value },
            ],
          };
        });

        // const val = loop({ duration: Math.random() * 2000 + 4000 });

        // const style = {
        //   transform: [
        //     {
        //       rotate: concat(
        //         interpolateNode(val, {
        //           inputRange: [0, 1],
        //           outputRange: [0, Math.PI * 2],
        //         }),
        //         "rad"
        //       ),
        //     },
        //   ],
        // };

        return (
          <View key={i}>
          <Animated.View
            
            style={[
              { width: 50, height: 50, borderWidth: 1 },
              style,
            ]}
          />
          {/* <Button title="mleko" onPress={() => {val.value = Math.random() * 5}}/> */}
          </View>
        );
      })}
    </View>
  );
}

export default AnimatedStyleUpdateExample;