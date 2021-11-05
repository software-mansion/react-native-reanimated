import Animated, { FadeInLeft, ZoomOutRotate } from 'react-native-reanimated';
import { Button, View } from 'react-native';

import React from 'react';

export default function EnteringExitingExample() {
  const [state, setState] = React.useState(false);

  const handleToggle = () => {
    setState((state) => !state);
  };

  return (
    <>
      <View style={{ paddingVertical: 50 }}>
        <Button onPress={handleToggle} title="Toggle" />
      </View>
      <View style={{ alignItems: 'center' }}>
        {state && (
          <Animated.View
            style={{
              width: 100,
              height: 100,
              backgroundColor: 'blue',
            }}
            entering={FadeInLeft}
            exiting={ZoomOutRotate}
          />
        )}
      </View>
    </>
  );
}
