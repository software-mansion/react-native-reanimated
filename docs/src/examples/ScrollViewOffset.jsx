import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedRef,
  useDerivedValue,
  useScrollViewOffset,
} from 'react-native-reanimated';

export default function App() {
  const animatedRef = useAnimatedRef();
  // highlight-start
  const offset = useScrollViewOffset(animatedRef);
  const text = useDerivedValue(() => `offset: ${offset.value.toFixed(1)}`);
  // highlight-end

  return (
    <View style={styles.container}>
      <AnimatedText text={text} />
      <Animated.ScrollView ref={animatedRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={styles.box}>
            <Text style={styles.center}>{i}</Text>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 250,
  },
  box: {
    width: 100,
    height: 100,
    margin: 10,
    borderRadius: 15,
    backgroundColor: '#b58df1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
Animated.addWhitelistedNativeProps({ text: true });

function AnimatedText({ text, ...props }) {
  const animatedProps = useAnimatedProps(() => ({ text: text.value }));
  return (
    <AnimatedTextInput
      editable={false}
      {...props}
      value={text.value}
      animatedProps={animatedProps}
    />
  );
}
