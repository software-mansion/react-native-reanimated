import { Button, View } from 'react-native';

import Animated from 'react-native-reanimated';
import React from 'react';

export default function LayoutTransitionExample() {
  const [state, setState] = React.useState(false);

  const handleToggle = () => {
    setState((state) => !state);
  };

  return (
    <>
      <View style={{ paddingVertical: 50 }}>
        <Button onPress={handleToggle} title="Toggle" />
      </View>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: state ? 'row' : 'column',
        }}>
        <Animated.View
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'red',
          }}
        />
        <Animated.View
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'lime',
          }}
        />
        <Animated.View
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'blue',
          }}
        />
      </View>
    </>
  );
}
