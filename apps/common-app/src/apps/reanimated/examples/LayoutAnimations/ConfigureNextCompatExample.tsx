import React from 'react';
import { Button, LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

export default function ConfigureNextCompatExample() {
  const [rnState, setRnState] = React.useState(false);
  const [reaVisible, setReaVisible] = React.useState(true);
  const [callbackCount, setCallbackCount] = React.useState(0);

  const configureNext = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(1000, 'easeInEaseOut', 'opacity'),
      () => setCallbackCount((count) => count + 1)
    );
    setRnState(!rnState);
  };

  return (
    <View style={styles.container}>
      <Text>React Native LayoutAnimation</Text>
      <Button onPress={configureNext} title="configureNext + toggle" />
      <Text>{`success callback fired ${callbackCount} times`}</Text>
      <View style={[styles.box, rnState && styles.boxMoved]} />

      <Text>Reanimated layout animations</Text>
      <Button
        onPress={() => setReaVisible(!reaVisible)}
        title="Toggle Reanimated view"
      />
      {reaVisible && (
        <Animated.View
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(500)}
          layout={LinearTransition}
          style={[styles.box, styles.reanimatedBox]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    marginTop: 100,
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
  boxMoved: {
    marginLeft: 200,
    backgroundColor: 'red',
  },
  reanimatedBox: {
    backgroundColor: 'green',
  },
});
