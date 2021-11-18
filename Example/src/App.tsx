// Change Component Transition

import React from 'react';

import Animated, {
  FadeIn,
  FadeOut,
  PinwheelOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { Button, Text, View } from 'react-native';

function Mleko({
  newEntering = null,
  oldExiting = null,
  children,
  // deps = [children], // MAGIC: by default, we want to animate change each time children are updated
  // to customize this, please pass an array of dependencies
  // TODO: default value for deps, should be null or []?
}) {
  const [current, setCurrent] = React.useState(null);
  const [flag, setFlag] = React.useState(false);

  React.useEffect(() => {
    setCurrent(children);
    // MAGIC: we always want to update children, even if deps didn't change
    // TODO: don't render twice if no deps have changed
  });

  React.useEffect(() => {
    // MAGIC: only animate change when deps changed
    // this can also be achieved by keeping `key` in state and incrementing it here
    setFlag((flag) => !flag); // double buffering
  }); // TODO: deps

  // the magic part here is the use of `key` prop
  // because of this, the component will not be replaced
  // instead the component with old key will be unmounted
  // and the component with the new key will be mounted
  // as a result, layout animations will fire

  // MAGIC: use of `key` prop
  return (
    <>
      <Animated.View key={flag} entering={newEntering} exiting={oldExiting}>
        {current}
      </Animated.View>
    </>
  );
}

export default function App() {
  const [count, setCount] = React.useState(42);
  const [color, setColor] = React.useState('red');

  const handleIncrement = () => {
    setCount((count) => count + 1);
  };

  const handleToggleColor = () => {
    setColor((c) => (c === 'red' ? 'blue' : 'red'));
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>{count}</Text>
      <Mleko
        // oldExiting={FadeOut}
        // newEntering={FadeIn.delay(300)}
        // oldExiting={SlideOutLeft.duration(1500).delay(500)}
        // newEntering={SlideInRight.duration(1500)}
        oldExiting={PinwheelOut}
        newEntering={SlideInRight}>
        <Text
          style={{
            fontSize: 100,
            fontWeight: 'bold',
            color,
          }}>
          {count}
        </Text>
      </Mleko>
      <Button onPress={handleIncrement} title="Increment" />
      <Button onPress={handleToggleColor} title="Toggle color" />
    </View>
  );
}
