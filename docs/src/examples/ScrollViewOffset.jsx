import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  useAnimatedRef,
  useDerivedValue,
  useScrollViewOffset,
} from 'react-native-reanimated';
import AnimatedText from '../components/AnimatedText';

export default function App() {
  const aref = useAnimatedRef();
  const scrollHandler = useScrollViewOffset(aref);
  const text = useDerivedValue(() => scrollHandler.value.toFixed(1));

  return (
    <View style={{ height: 300, flexDirection: 'column' }}>
      <AnimatedText text={text} />
      <ScrollView
        ref={aref}
        style={{ backgroundColor: 'orange' }}
        // Note: `scrollEventThrottle` is required as the default value of `0`
        // means that the offset is only updated once per gesture
        scrollEventThrottle={1}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View
            key={i}
            style={{
              backgroundColor: 'white',
              aspectRatio: 1,
              width: 100,
              margin: 10,
              justifyContent: 'center',
              alignContent: 'center',
            }}>
            <Text style={{ textAlign: 'center' }}>{i}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
