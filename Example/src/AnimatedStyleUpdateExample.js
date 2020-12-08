import React, {useState} from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedGestureHandler, runOnJS } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

export default function App() {
  const [state, setState] = useState(false);

  const gh = useAnimatedGestureHandler({
    onStart:() => {
      runOnJS(setState)(true);
    },
  })

  return (
    <View style={{flex:1, backgroundColor: 'yellow'}}>
      <PanGestureHandler onGestureEvent={gh}>
        <Animated.View>
          <Text>test</Text>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}