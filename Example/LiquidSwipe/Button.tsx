import React from "react";
import { Dimensions, Text } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
//import { Feather as Icon } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const size = 50;

export default ({ progress, y }) => {
  const style = useAnimatedStyle(
    function(input) {
      'worklet';
      const { progress, y, size, width } = input;
      
      console.log('progress: ' + progress.value);

      return {
        opacity: Reanimated.interpolate(progress.value, 0, 0.1, 1, 0, Extrapolate.CLAMP),
        transform: [
          {
            translateX: Reanimated.interpolate(progress.value, 0, 0.4, width.value - size.value - 8, 0),
          },
          {
            translateY: y.value - size.value / 2,
          }
        ],
      }
    }, { progress, y, size, width }
  );

  return (
    <Animated.View
      style={[{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: "center",
        alignItems: "center",
      }, style]}
    >
      <Text>(</Text>
      {/*<Icon name="chevron-left" color="black" size={40} />*/}
    </Animated.View>
  );
};
