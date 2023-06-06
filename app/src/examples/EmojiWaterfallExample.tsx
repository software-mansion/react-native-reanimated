import Animated, {
  Easing,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button, Dimensions, StyleSheet, View } from 'react-native';
import React, { useContext, useMemo } from 'react';

const { width, height } = Dimensions.get('screen');

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface EmojiProps {
  emoji: string;
  progress: SharedValue<number>;
}

function Emoji({ emoji, progress }: EmojiProps) {
  const { fontSize, left, startY, endY, rotate, a, b } = useMemo(() => {
    return {
      fontSize: randomBetween(60, 100),
      left: randomBetween(-50, width + 100),
      startY: randomBetween(-1000, -100),
      endY: height + randomBetween(100, 1000),
      rotate: randomBetween(-45, 45),
      a: randomBetween(3, 10),
      b: randomBetween(5, 30),
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: left },
        { translateY: interpolate(progress.value, [0, 1], [startY, endY]) },
        { rotate: `${rotate + Math.sin(progress.value * a * Math.PI) * b}deg` },
      ],
    };
  });

  return (
    <Animated.Text style={[{ fontSize }, styles.text, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
}

export const EmojiWaterfallContext = React.createContext({
  startAnimation: () => {},
});

function EmojiWaterfallProvider({ children }: React.PropsWithChildren) {
  const progress = useSharedValue(0);

  const emoji = '💵';
  const count = 100;
  const duration = 5000;

  const startAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.linear });
  };

  return (
    <EmojiWaterfallContext.Provider value={{ startAnimation }}>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[...Array(count)].map((_, i) => (
          <Emoji emoji={emoji} progress={progress} key={i} />
        ))}
      </View>
    </EmojiWaterfallContext.Provider>
  );
}

export function useEmojiWaterfall() {
  const context = useContext(EmojiWaterfallContext);
  if (context == null) {
    throw new Error(
      'No context provided: useEmojiWaterfall() can only be used in a descendant of <EmojiWaterfallProvider>'
    );
  }
  return context;
}

function ControlPanel() {
  const { startAnimation } = useEmojiWaterfall();

  return <Button title="Click me!" onPress={startAnimation} />;
}

export default function EmojiWaterfallExample() {
  return (
    <View style={styles.container}>
      <EmojiWaterfallProvider>
        <ControlPanel />
      </EmojiWaterfallProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    position: 'absolute',
  },
});
