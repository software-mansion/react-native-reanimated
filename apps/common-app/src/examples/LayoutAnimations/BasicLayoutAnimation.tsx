import Animated, {
  BounceInLeft,
  FadeOutRight,
  Layout,
} from 'react-native-reanimated';
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
          entering={BounceInLeft}
          layout={Layout.springify()}
          exiting={FadeOutRight.duration(500)}
          style={[
            styles.box,
            {
              marginLeft: state ? 200 : 0,
              backgroundColor: state ? 'red' : 'blue',
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
    width: 100,
    height: 100,
  },
});
