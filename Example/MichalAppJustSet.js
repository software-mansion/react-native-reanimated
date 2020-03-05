import React, { useRef } from 'react';
import { TouchableHighlight, View } from "react-native";
import { Text } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';


const MichalAppJustSet = () => {

  const x = useSharedValue(0);
  const y = useSharedValue(0)
  const z = useRef(0);
  const tab = [[100, 0], [0, 100], [-100, 0], [0, -100]];

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          width: 40,
          height: 40,
          /*transform: [{
            translateX: x
          },
          {
            translateY: y
          }]*/
          marginLeft: x,
          marginTop: y,
          backgroundColor: "black",
        }}
      />
      <TouchableHighlight onPress={() => {
        const vec = tab[z.current++];
        x.set(x.get() + vec[0]);
        y.set(y.get() + vec[1]);
      }}>
        <Text> change position </Text>
      </TouchableHighlight>
    </View>
  )
}

export default MichalAppJustSet