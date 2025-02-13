import React, { useState } from 'react';
import { View, Pressable, Text, Dimensions } from 'react-native';
import Animated, { SlideInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function App() {
  const [visible, setVisible] = useState(false);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
      }}>
      {visible && (
        <Animated.View
          entering={SlideInRight.delay(0)
            .duration(400)
            .withInitialValues({ originX: width + 50 })}
          style={{
            width: 100,
            height: 100,
            backgroundColor: '#82cab2',
            borderRadius: 20,
            position: 'absolute',
          }}
        />
      )}
      <Pressable onPress={() => setVisible((prev) => !prev)}>
        <Text
          style={{
            color: 'white',
            backgroundColor: '#b58df1',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 10,
          }}>
          Toggle
        </Text>
      </Pressable>
    </View>
  );
}
