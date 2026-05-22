import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const BG = '#0a0040';

const A1 = '#2a0bb8';
const A2 = '#4e2bea';
const A3 = '#3a14d8';
const A4 = '#6342ea';
const A5 = '#2a0bb8';

const auroraGradient =
  `linear-gradient(100deg, ` +
  `${A5} 0%, ${A1} 10%, ${A2} 15%, ${A3} 20%, ${A4} 25%, ${A5} 30%, ` +
  `${A1} 30%, ${A2} 35%, ${A3} 40%, ${A4} 45%, ${A5} 50%, ` +
  `${A1} 50%, ${A2} 55%, ${A3} 60%, ${A4} 65%, ${A5} 70%, ` +
  `${A1} 70%, ${A2} 75%, ${A3} 80%, ${A4} 85%, ${A5} 90%, ` +
  `${A1} 90%, ${A2} 95%, ${A3} 100%)`;

const darkGradient =
  `linear-gradient(100deg, ` +
  `${BG} 0%, ${BG} 7%, transparent 10%, transparent 12%, ${BG} 16%, ` +
  `${BG} 23%, transparent 26%, transparent 28%, ${BG} 32%, ` +
  `${BG} 39%, transparent 42%, transparent 44%, ${BG} 48%, ` +
  `${BG} 55%, transparent 58%, transparent 60%, ${BG} 64%, ` +
  `${BG} 71%, transparent 74%, transparent 76%, ${BG} 80%, ` +
  `${BG} 87%, transparent 90%, transparent 92%, ${BG} 96%, ${BG} 100%)`;

const layered = `${darkGradient}, ${auroraGradient}`;

type AuroraBgProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AuroraBg({ children, style }: AuroraBgProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.backLayer}>
        <Animated.View style={styles.aurora}>
          <View style={styles.half} />
          <View style={styles.half} />
        </Animated.View>
      </View>
      <View style={styles.maskOverlay} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    overflow: 'hidden',
  },
  backLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage: layered,
    experimental_backgroundSize: [
      { x: '300%', y: '100%' },
      { x: '200%', y: '100%' },
    ],
    experimental_backgroundPosition: [
      { left: '50%', top: '50%' },
      { left: '50%', top: '50%' },
    ],
    filter: 'blur(10px)',
    opacity: 0.5,
  },
  aurora: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    width: '200%',
    height: '100%',
    mixBlendMode: 'difference',
    animationName: {
      from: { transform: [{ translateX: '0%' }] },
      to: { transform: [{ translateX: '-50%' }] },
    },
    animationDuration: '20s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  half: {
    flex: 1,
    height: '100%',
    experimental_backgroundImage: layered,
    experimental_backgroundSize: [
      { x: '200%', y: '100%' },
      { x: '100%', y: '100%' },
    ],
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage: `radial-gradient(ellipse at 100% 0%, transparent 10%, ${BG} 70%)`,
  },
});
