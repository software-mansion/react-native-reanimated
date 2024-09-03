import Animated, { LinearTransition } from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function BasicLayoutAnimation() {
  const [state, setState] = React.useState(false);
  const [visible, setVisible] = React.useState(true);

  return (
    <View style={styles.container}>
      <Button onPress={() => setVisible(!visible)} title="Create/Remove" />
      <Button onPress={() => setState(!state)} title="Update" />
      {visible && (
        <Animated.View
          layout={LinearTransition.duration(1000)}
          style={[
            styles.box,
            {
              marginLeft: state ? 200 : 0,
              backgroundColor: state ? 'blue' : 'red',
              opacity: state ? 1 : 0.1,
              borderRadius: state ? undefined : 100,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
  },
  box: {
    width: 200,
    height: 200,
    opacity: 0.5,
  },
});
