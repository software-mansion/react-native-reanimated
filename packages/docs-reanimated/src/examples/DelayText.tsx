import React, { useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import useThemedTextStyle from '@site/src/hooks/useThemedTextStyle';

const DURATION = 1000;
const DELAY = 500;

const text = ['React', 'Native', 'Reanimated'];

interface AppProps {
  width: number;
}

export default function App({ width }: AppProps) {
  const textColor = useThemedTextStyle();
  const [isShown, setShown] = useState<boolean>(false);

  const opacity1 = useSharedValue<number>(0);
  const opacity2 = useSharedValue<number>(0);
  const opacity3 = useSharedValue<number>(0);

  // prettier-ignore
  const show = () => {
    if (isShown) {
      opacity3.value = withDelay(0 * DELAY, withTiming(0, { duration: DURATION }));
      opacity2.value = withDelay(1 * DELAY, withTiming(0, { duration: DURATION }));
      opacity1.value = withDelay(2 * DELAY, withTiming(0, { duration: DURATION }));
    } else {
      opacity1.value = withDelay(0 * DELAY, withTiming(1, { duration: DURATION }));
      opacity2.value = withDelay(1 * DELAY, withTiming(1, { duration: DURATION }));
      opacity3.value = withDelay(2 * DELAY, withTiming(1, { duration: DURATION }));
    }

    setShown(!isShown);
  };

  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <Animated.Text style={[styles.label, textColor, { opacity: opacity1 }]}>
          {text[0]}
        </Animated.Text>
        <Animated.Text style={[styles.label, textColor, { opacity: opacity2 }]}>
          {text[1]}
        </Animated.Text>
        {width > 450 && (
          <Animated.Text
            style={[styles.label, textColor, { opacity: opacity3 }]}>
            {text[2]}
          </Animated.Text>
        )}
      </View>
      {width <= 450 && (
        <Animated.Text style={[styles.label, textColor, { opacity: opacity3 }]}>
          {text[2]}
        </Animated.Text>
      )}
      <Button title={isShown ? 'Hide' : 'Show'} onPress={show} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flexDirection: 'column',
  },
  text: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    fontSize: 42,
    textAlign: 'center',
    fontWeight: 'bold',
    marginRight: 8,
  },
  divider: {
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  animatedBorder: {
    height: 8,
    width: 64,
    backgroundColor: 'tomato',
    borderRadius: 20,
  },
});
