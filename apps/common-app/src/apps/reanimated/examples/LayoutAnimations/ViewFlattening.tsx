import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

export default function ViewFlatteningExample() {
  const [visible, setVisible] = React.useState(true);

  return (
    <View style={styles.container}>
      <Button title="Toggle" onPress={() => setVisible(!visible)} />
      <View style={styles.purpleBox} collapsable={!visible}>
        <View style={styles.redBox} collapsable={visible}>
          <View style={styles.greenBox} collapsable={false}>
            {visible && (
              <Animated.View
                style={styles.blueBox}
                exiting={FadeOut.duration(2000)}
              />
            )}
          </View>
        </View>
        <View style={styles.redBox} collapsable={!visible}>
          <View style={styles.greenBox} collapsable={false}>
            {visible && (
              <Animated.View
                style={styles.blueBox}
                exiting={FadeOut.duration(2000)}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purpleBox: {
    width: 200,
    height: 200,
    backgroundColor: 'purple',
  },
  redBox: {
    width: 100,
    height: 100,
    backgroundColor: 'red',
  },
  greenBox: {
    width: 50,
    height: 50,
    backgroundColor: 'green',
  },
  blueBox: {
    width: 25,
    height: 25,
    backgroundColor: 'blue',
  },
});
