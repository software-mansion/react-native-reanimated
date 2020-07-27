import React from 'react';
import { Button, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

const FastRefreshTest = () => {
    // check if certain hooks work
    const sv = useSharedValue(50)

    // ...

    return (
        <View>
            <Animated.View />
        </View>
    );
}

export default FastRefreshTest;
