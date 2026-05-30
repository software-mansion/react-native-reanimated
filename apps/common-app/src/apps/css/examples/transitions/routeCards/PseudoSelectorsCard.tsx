import { faHandPointer as faHandPointerOutline } from '@fortawesome/free-regular-svg-icons';
import { faHandPointer as faHandPointerSolid } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  css,
  FadeInLeft,
  FadeOutRight,
  LayoutAnimationConfig,
} from 'react-native-reanimated';

import type { RouteCardComponent } from '@/apps/css/components';
import { RouteCard } from '@/apps/css/components';
import { Text } from '@/apps/css/components/core';
import { colors, radius, sizes, spacing } from '@/theme';

type Phase = 'active' | 'default' | 'hover' | 'leave';

type PhaseConfig = {
  box: { color: string; scale: number };
  hand: {
    duration: string;
    easing: string;
    opacity: number;
    x: number;
    y: number;
  };
  label: string;
};

// Everything that defines how a phase looks lives here: the square's fill and
// scale, the hand's position/fade and its transition, and the label shown.
// `leave` keeps the raised "hover" look while the hand exits, so the square only
// drops back to its resting look during the brief `default` beat.
const PHASES = {
  active: {
    box: { color: colors.primaryDark, scale: 0.92 },
    hand: { duration: '200ms', easing: 'ease-in', opacity: 1, x: 0, y: 0 },
    label: ':active',
  },
  default: {
    box: { color: colors.primaryLight, scale: 1 },
    hand: { duration: '0ms', easing: 'ease-in', opacity: 0, x: -18, y: 22 },
    label: 'default',
  },
  hover: {
    box: { color: colors.primary, scale: 1.1 },
    hand: { duration: '500ms', easing: 'ease-out', opacity: 1, x: 0, y: 0 },
    label: ':hover',
  },
  leave: {
    box: { color: colors.primary, scale: 1.1 },
    hand: { duration: '360ms', easing: 'ease-in', opacity: 0, x: 24, y: -34 },
    label: ':hover',
  },
} as const satisfies Record<Phase, PhaseConfig>;

// Other transition route cards animate on a 1500ms heartbeat (e.g.
// AnimatedPropertiesCard, RealWorldExamplesCard). Run a full cycle over 2 beats,
// anchored by a setInterval like theirs, so this card stays in sync. The press
// (`active`, at offset 0) lands on the beat where RealWorldExamplesCard's
// circular menu pops open; the hand enters during the prior cycle's tail.
const PERIOD = 3000;

const STEPS: Array<{ at: number; phase: Phase }> = [
  { at: 0, phase: 'active' },
  { at: 500, phase: 'hover' },
  { at: 1250, phase: 'leave' },
  { at: 1800, phase: 'default' },
  { at: 2350, phase: 'hover' },
];

// Press feedback: a translucent ring that expands from the fingertip and fades
// out, restarted on every press via the `pressKey` remount.
const ripple = css.keyframes({
  from: { opacity: 0.65, transform: [{ scale: 0.2 }] },
  to: { opacity: 0, transform: [{ scale: 1.9 }] },
});

const PseudoSelectorsCard: RouteCardComponent = (props) => (
  <RouteCard
    {...props}
    description="Animate views in response to **hover**, **press**, and **focus** events">
    <Showcase />
  </RouteCard>
);

function Showcase() {
  const [phase, setPhase] = useState<Phase>('default');
  const [pressKey, setPressKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const timeouts: Array<ReturnType<typeof setTimeout>> = [];
      const runCycle = () => {
        timeouts.forEach(clearTimeout);
        timeouts.length = 0;
        for (const { at, phase: next } of STEPS) {
          timeouts.push(
            setTimeout(() => {
              setPhase(next);
              if (next === 'active') {
                setPressKey((key) => key + 1);
              }
            }, at)
          );
        }
      };
      // Keep the first render in `default` (no press on mount): the hand eases
      // in with a hover 650ms before the first beat, then the interval drives
      // the synced cycle so `active` lands on the heartbeat rather than at mount.
      const leadIn = setTimeout(() => setPhase('hover'), PERIOD - 650);
      const interval = setInterval(runCycle, PERIOD);
      return () => {
        clearTimeout(leadIn);
        clearInterval(interval);
        timeouts.forEach(clearTimeout);
        // Rest in the default state while the screen isn't focused, so the card
        // always renders its default look when not actively animating.
        setPhase('default');
      };
    }, [])
  );

  const cfg = PHASES[phase];

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.square,
            {
              backgroundColor: cfg.box.color,
              transform: [{ scale: cfg.box.scale }],
              transitionDuration: '250ms',
              transitionTimingFunction: 'ease-in-out',
            },
          ]}
        />
        {phase === 'active' && (
          <Animated.View
            key={pressKey}
            style={[styles.ripple, { animationName: ripple }]}
          />
        )}
        <Animated.View
          style={[
            styles.pointer,
            {
              opacity: cfg.hand.opacity,
              transform: [
                { translateX: cfg.hand.x },
                { translateY: cfg.hand.y },
              ],
              transitionDuration: cfg.hand.duration,
              transitionTimingFunction: cfg.hand.easing,
            },
          ]}>
          {/* White fill (solid glyph) under a dark outline (regular glyph) so the
              hand stays legible on both the light and dark squares. */}
          <FontAwesomeIcon
            color={colors.white}
            icon={faHandPointerSolid}
            size={24}
            style={styles.handIcon}
          />
          <FontAwesomeIcon
            color={colors.primaryDark}
            icon={faHandPointerOutline}
            size={24}
            style={styles.handIcon}
          />
        </Animated.View>
      </View>
      <View style={styles.labelWrapper}>
        <LayoutAnimationConfig skipEntering skipExiting>
          <Animated.View
            entering={FadeInLeft}
            exiting={FadeOutRight}
            key={cfg.label}>
            <Text variant="code">{cfg.label}</Text>
          </Animated.View>
        </LayoutAnimationConfig>
      </View>
    </View>
  );
}

const styles = css.create({
  container: {
    alignItems: 'center',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  handIcon: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  labelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  pointer: {
    height: 24,
    left: 26,
    position: 'absolute',
    top: 18,
    width: 24,
  },
  ripple: {
    animationDuration: '420ms',
    animationFillMode: 'forwards',
    animationTimingFunction: 'ease-out',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    height: 18,
    left: 26,
    opacity: 0,
    position: 'absolute',
    top: 11,
    width: 18,
  },
  square: {
    borderRadius: radius.md,
    height: sizes.md,
    width: sizes.md,
  },
  stage: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 72,
  },
});

export default PseudoSelectorsCard;
