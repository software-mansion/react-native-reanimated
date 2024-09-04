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
              borderTopLeftRadius: state ? undefined : 100,
              borderBottomRightRadius: state ? undefined : 100,
              shadowOffset: state
                ? { width: 10, height: 50 }
                : { width: -50, height: -50 },
              shadowColor: state ? 'navy' : 'orange',
              shadowOpacity: state ? 0.5 : 1,
              shadowRadius: state ? 15 : 1,
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
