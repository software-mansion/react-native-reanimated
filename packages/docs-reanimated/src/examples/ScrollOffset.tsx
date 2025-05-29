import React from 'react';
import { View, Text, StyleSheet, TextInput, Button } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedRef,
  useDerivedValue,
  useScrollOffset,
} from 'react-native-reanimated';
import type { DerivedValue } from 'react-native-reanimated';

export default function App() {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  // highlight-start
  const offset = useScrollOffset(animatedRef);
  const text = useDerivedValue(
    () => `Scroll offset: ${offset.value.toFixed(1)}`
  );
  // highlight-end
  const [isScrollHorizontal, setIsScrollHorizontal] =
    React.useState<boolean>(false);

  return (
    <View style={styles.container}>
      <AnimatedText text={text} />
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        ref={animatedRef}
        horizontal={isScrollHorizontal}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={styles.box}>
            <Text style={styles.center}>{i}</Text>
          </View>
        ))}
      </Animated.ScrollView>
      <Button
        title={`Toggle scroll to ${
          isScrollHorizontal ? 'vertical' : 'horizontal'
        }`}
        onPress={() => setIsScrollHorizontal(!isScrollHorizontal)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scroll: {
    borderWidth: 1,
    borderColor: 'gray',
    height: 250,
    width: 250,
    margin: 20,
  },
  scrollContent: {
    alignItems: 'center',
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

function AnimatedText({ text, ...props }: { text: DerivedValue<string> }) {
  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
    defaultValue: text.value,
  }));
  return (
    <AnimatedTextInput
      editable={false}
      {...props}
      value={text.value}
      animatedProps={animatedProps}
    />
  );
}
