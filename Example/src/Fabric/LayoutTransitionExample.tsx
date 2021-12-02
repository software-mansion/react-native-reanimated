import {
  Button,
  LayoutAnimation,
  Platform,
  UIManager,
  View,
} from 'react-native';

import Animated from 'react-native-reanimated';
import React from 'react';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LayoutTransitionExample() {
  const [flexState, setFlexState] = React.useState(false);
  const [childState, setChildState] = React.useState(true);

  const handleToggleFlex = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setFlexState((s) => !s);
  };

  const handleToggleChild = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setChildState((s) => !s);
  };

  return (
    <>
      <View style={{ paddingVertical: 50 }}>
        <Button onPress={handleToggleFlex} title="Toggle flex" />
        <Button onPress={handleToggleChild} title="Toggle child" />
      </View>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: flexState ? 'row' : 'column',
        }}>
        <Animated.View
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'red',
          }}
        />
        {childState && (
          <Animated.View
            style={{
              width: 100,
              height: 100,
              backgroundColor: 'lime',
            }}
          />
        )}
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
