import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components';
import { colors, flex, radius, sizes } from '@/theme';

// TODO - implement more and better examples
export default function MultipleTransitionSettings() {
  const [start, setStart] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStart(true);
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Screen style={flex.center}>
      <Animated.View
        style={[
          styles.box,
          {
            transitionDuration: ['1s', '10s', '1s'],
            // 'all' overrides 'width' settings, thus width will be animated
            // for 10s with easeOut timing function; height will be animated
            // for 1s with easeIn timing function (it's how it works in CSS)
            transitionProperty: ['width', 'all', 'height'],
            transitionTimingFunction: ['easeIn', 'easeOut', 'easeInOut'],
          },
          start && {
            height: sizes.xxxl,
            width: sizes.xxxl,
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.xl,
    width: sizes.xl,
  },
});
