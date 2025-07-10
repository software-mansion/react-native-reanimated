import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

import Animated, { FadeOut } from 'react-native-reanimated';

export default function MoveWithExiting() {
  const [collapsable, setCollapsable] = React.useState(false);

  return (
    <View style={styles.container}>
      <Button
        title="Toggle Collapsable"
        onPress={() => setCollapsable(!collapsable)}
      />
      <View
        collapsable={collapsable}
        style={{
          width: 200,
          height: 200,
          backgroundColor: collapsable ? 'transparent' : 'red',
        }}>
        <Animated.View
          exiting={FadeOut}
          style={{ width: 100, height: 100, backgroundColor: 'blue' }}>
          {!collapsable && (
            <View style={{ width: 50, height: 50, backgroundColor: 'green' }} />
          )}
        </Animated.View>
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
});
