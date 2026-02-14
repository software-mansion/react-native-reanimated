import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Rect, Svg } from 'react-native-svg';

type SwitchProps = {
  y?: number;
};

type SwitchRef = {
  getAnimatableRef: () => Rect | null;
};

const Switch = forwardRef<SwitchRef, SwitchProps>(({ y }, ref) => {
  const rectRef = useRef<Rect | null>(null);

  // When an animated version of the Switch is created we want to animate the inner Rect instead of the outer Svg component.
  useImperativeHandle(ref, () => ({
    getAnimatableRef() {
      return rectRef.current;
    },
  }));

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
      <Rect x="10" y={y} width="50" height="40" fill="red" ref={rectRef} />
    </Svg>
  );
});

Switch.displayName = 'Switch';

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
          sv.value = withSpring(isUp ? 250 : 0);
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
