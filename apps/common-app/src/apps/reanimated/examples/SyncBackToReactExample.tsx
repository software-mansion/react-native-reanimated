import { balloonsImage } from '@/apps/css/assets';
import React, { useCallback } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  DynamicColorIOS,
  PlatformColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const instructions = [
  '1. Press "Toggle shared value" button',
  '2. Wait until the animated styles are synced back to React (about 3 seconds)',
  '3. Press "Increase counter" button',
  '4. The width and colors should not change, similar to when the feature flag is disabled',
].join('\n');

interface CustomButtonProps {
  title: string;
  onPress: () => void;
}

// We use a custom button component on native platforms
// because the one from React Native triggers additional renders when pressed.
function CustomButton({ title, onPress }: CustomButtonProps) {
  if (Platform.OS === 'web') {
    return <Button title={title} onPress={onPress} />;
  }

  return (
    <View onTouchEnd={onPress} style={styles.buttonView}>
      <Text style={styles.buttonText}>{title}</Text>
    </View>
  );
}

export default function SyncBackToReactExample() {
  const [count, setCount] = React.useState(0);

  const ref = React.useRef(false);

  const sv = useSharedValue(false);

  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      width: withSpring(sv.value ? 150 : 50),
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      backgroundColor: sv.value ? 'blue' : 'green',
    };
  });

  const animatedStyle3 = useAnimatedStyle(() => {
    return {
      backgroundColor: sv.value ? 'transparent' : 'green',
    };
  });

  const animatedStyle4 = useAnimatedStyle(() => {
    return {
      backgroundColor:
        Platform.OS === 'android'
          ? PlatformColor(
              sv.value
                ? '@android:color/holo_blue_bright'
                : '@android:color/holo_green_light'
            )
          : Platform.OS === 'ios'
            ? PlatformColor(sv.value ? 'systemBlue' : 'systemGreen')
            : 'gray',
    };
  });

  const animatedStyle5 = useAnimatedStyle(() => {
    return {
      backgroundColor:
        Platform.OS === 'ios'
          ? sv.value
            ? DynamicColorIOS({ light: 'blue', dark: 'orange' })
            : DynamicColorIOS({ light: 'green', dark: 'red' })
          : 'gray',
    };
  });

  const animatedStyle6 = useAnimatedStyle(() => {
    return {
      boxShadow: [
        {
          blurRadius: 10,
          offsetX: 10,
          offsetY: 10,
          color: sv.value ? 'blue' : 'green',
        },
      ],
    };
  });

  const animatedStyle7 = useAnimatedStyle(() => {
    return {
      transform: `rotate(${sv.value ? 30 : 0}deg)`,
    };
  });

  const animatedStyle8 = useAnimatedStyle(() => {
    return {
      filter: `brightness(${sv.value ? 0.5 : 1})`,
    };
  });

  const handleToggle = useCallback(() => {
    sv.value = ref.current = !ref.current;
  }, [sv]);

  const handleIncreaseCounter = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedStyle1]} />
      <Animated.View style={[styles.box, animatedStyle2]} />
      <Animated.View style={[styles.box, animatedStyle3]} />
      <Animated.View style={[styles.box, animatedStyle4]} />
      <Animated.View style={[styles.box, animatedStyle5]} />
      <Animated.View style={[styles.box, animatedStyle6]} />
      <Animated.View style={[styles.box, animatedStyle7]} />
      <Animated.Image
        source={balloonsImage}
        // @ts-ignore
        style={[styles.box, animatedStyle8]}
      />
      <CustomButton title="Toggle shared value" onPress={handleToggle} />
      <Text>Counter: {count}</Text>
      <CustomButton title="Increase counter" onPress={handleIncreaseCounter} />
      <Text style={styles.instructions}>{instructions}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 50,
    height: 50,
    backgroundColor: 'black',
  },
  buttonView: {
    margin: 20,
  },
  buttonText: {
    fontSize: 20,
    color: 'dodgerblue',
  },
  instructions: {
    marginHorizontal: 20,
  },
});
