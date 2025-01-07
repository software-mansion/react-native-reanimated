import React, { useState } from 'react';
import { View, StyleSheet, Button } from 'react-native';

import { Rect, Svg } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type SwitchProps = {
  y?: number;
};

class Switch extends React.Component<SwitchProps> {
  rectRef: Rect | null = null;

  // When an animated version of the Switch is created we want to animate the inner Rect instead of the outer Svg component.
  getAnimatableRef() {
    return this.rectRef;
  }

  render() {
    return (
      <Svg height="310" width="70">
        <Rect
          x="5"
          y="5"
          width="60"
          height="300"
          fill="none"
          stroke={'black'}
          strokeWidth={10}
        />
        <Rect
          x="10"
          y={this.props.y}
          width="50"
          height="40"
          fill="red"
          ref={(component) => {
            this.rectRef = component;
          }}
        />
      </Svg>
    );
  }
}

const AnimatedSwitch = Animated.createAnimatedComponent(Switch);
export default function AnimatableRefExample() {
  const [isUp, setIsUp] = useState(true);
  const sv = useSharedValue(0);

  const animatedProps = useAnimatedProps(() => {
    return {
      y: sv.value + 10,
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedSwitch animatedProps={animatedProps} />
      <Button
        onPress={() => {
          sv.value = withSpring(isUp ? 250 : 0, { damping: 18 });
          setIsUp(!isUp);
        }}
        title={`Go ${isUp ? 'down' : 'up'}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 200,
  },
});
