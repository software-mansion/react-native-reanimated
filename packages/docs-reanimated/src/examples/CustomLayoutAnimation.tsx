import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Animated, {
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const customLayoutTransition = (values) => {
  'worklet';
  return {
    animations: {
      originX: withTiming(values.targetOriginX, { duration: 1000 }),
      originY: withDelay(
        1000,
        withTiming(values.targetOriginY, { duration: 1000 })
      ),
      width: withSpring(values.targetWidth),
      height: withSpring(values.targetHeight),
    },

    initialValues: {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      width: values.currentWidth,
      height: values.currentHeight,
    },
  };
};

const Box = ({ label, state }) => {
  return (
    <Animated.View
      layout={customLayoutTransition}
      style={[
        styles.box,
        {
          flexDirection: state ? 'row' : 'row-reverse',
          height: state ? 100 : 180,
        },
      ]}>
      <Text>{label}</Text>
    </Animated.View>
  );
};

const Layout = () => {
  const [state, setState] = useState(true);

  const handleToggle = () => {
    setState((prevState) => !prevState);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.innerContainer,
          {
            alignItems: state ? 'center' : 'flex-start',
          },
        ]}>
        <View style={{ flexDirection: state ? 'row' : 'column' }}>
          {state && <Box key="A" label="A" state={state} />}
          <Box key="B" label="B" state={state} />
          {!state && <Box key="A" label="A" state={state} />}
          <Box key="C" label="C" state={state} />
        </View>
      </View>
      <Button onPress={handleToggle} title="Toggle" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 16,
  },
  innerContainer: {
    height: 600,
    display: 'flex',
    alignItems: 'center',
  },
  box: {
    backgroundColor: 'lightblue',
    borderRadius: 8,
    margin: 5,
    width: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Layout;
