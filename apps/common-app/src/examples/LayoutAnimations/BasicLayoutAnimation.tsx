import Animated, { LinearStyleTransition } from 'react-native-reanimated';
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
          layout={LinearStyleTransition.duration(1000)}
          style={[
            styles.box,
            {
              marginLeft: state ? 100 : 0,
              backgroundColor: state ? 'blue' : 'red',
              opacity: state ? 1 : 0.1,

              borderLeftWidth: state ? 1 : 5,
              borderRightWidth: state ? 10 : 5,
              borderTopWidth: state ? 1 : 5,
              borderBottomWidth: state ? 15 : 5,

              borderTopLeftRadius: state ? 20 : 100,
              borderBottomRightRadius: state ? 50 : 100,
              borderBottomLeftRadius: state ? 40 : 100,
              borderTopRightRadius: state ? 10 : 10,
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
