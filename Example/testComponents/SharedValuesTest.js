import React, { useRef } from 'react';
import { TouchableHighlight, View } from "react-native";
import { Text } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';


const SharedValueTest = () => {

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const z = useRef(0);
  const tab = [[100, 0], [0, 100], [-100, 0], [0, -100]];

  return (
    <View style={{ flex: 1 }}>
      <TouchableHighlight onPress={async () => {
        const vec = tab[(z.current++) % 4];
        x.set((await x.get()) + vec[0]);
        y.set((await y.get()) + vec[1]);
      }} style={{padding:30, backgroundColor:'blue'}}>
        <Text> change position </Text>
      </TouchableHighlight>
      <Animated.View
        style={{
          width: 40,
          height: 40,
          transform: [{
            translateX: x
          },
          {
            translateY: y
          }],
          backgroundColor: "black",
        }}
      />
      
    </View>
  )
}

export default SharedValueTest