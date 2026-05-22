import MaskedView from '@react-native-masked-view/masked-view';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/apps/css/components';

import { AuroraBg } from './AuroraBg';

function expandRepeating(
  angle: string,
  pattern: ReadonlyArray<[string, number]>,
  span = 100
): string {
  const startPos = pattern[0][1];
  const cycle = pattern[pattern.length - 1][1] - startPos;
  const stops: string[] = [];
  for (let offset = 0; offset <= span; offset += cycle) {
    for (const [color, p] of pattern) {
      const pos = p - startPos + offset;
      if (pos > span) break;
      stops.push(`${color} ${pos}%`);
    }
  }
  return `linear-gradient(${angle}, ${stops.join(', ')})`;
}

const textMask = expandRepeating('100deg', [
  ['rgba(255,255,255,0.64)', 0],
  ['rgba(255,255,255,0.64)', 4],
  ['rgb(255,255,255)', 12],
  ['rgba(255,255,255,0.64)', 20],
  ['rgba(255,255,255,0.64)', 24],
]);

export default function Aurora() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);
  return (
    <Screen>
      <AuroraBg>
        <Animated.View style={styles.center} pointerEvents="none">
          <Animated.View style={styles.entrance}>
            <MaskedView
              maskElement={<Animated.View style={styles.maskStripes} />}>
              <Animated.Text style={styles.title}>Hello, App.js!</Animated.Text>
            </MaskedView>
          </Animated.View>
        </Animated.View>
      </AuroraBg>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrance: {
    animationName: {
      from: {
        opacity: 0,
        transform: [{ translateY: 24 }, { scale: 0.94 }],
      },
      to: {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
      },
    },
    animationDuration: '1.2s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'forwards',
    opacity: 0,
  },
  maskStripes: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '600%',
    experimental_backgroundImage: textMask,
    animationName: {
      from: { transform: [{ translateX: 0 }] },
      to: { transform: [{ translateX: -900 }] },
    },
    animationTimingFunction: 'linear',
    animationDuration: '54000ms',
    animationIterationCount: 'infinite',
  },
  title: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(110, 80, 240, 0.56)',
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
});
