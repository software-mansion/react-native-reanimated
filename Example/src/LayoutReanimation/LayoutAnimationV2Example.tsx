import Animated, {
  FadeInRight,
  FadeOutRight,
  Fade,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';
import React, { useState } from 'react';

export default function LayoutAnimationV2Example() {
  const [toogle, setToogle] = useState(false);

  return (
    <View style={componentStyle.container}>
      <Button title="toggle" onPress={() => setToogle(!toogle)} />
      {toogle && (
        <Animated.View
          entering={Fade.RightEdge()}
          exiting={Fade.RightEdge().duration(2000)}
          style={componentStyle.square}
        />
      )}
      {toogle && (
        <Animated.View
          entering={FadeInRight}
          exiting={FadeOutRight.duration(2000)}
          style={componentStyle.square}
        />
      )}
    </View>
  );
}

const componentStyle = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    paddingTop: 50,
  },
  square: {
    width: 80,
    height: 80,
    backgroundColor: 'black',
    margin: 30,
  },
});
