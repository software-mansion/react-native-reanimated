import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  EasingFunction,
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  backgroundColor?: string;
}

export interface SharedPair {
  tag: string;
  from: Box;
  to: Box;
  content?: React.ReactNode;
  fades?: boolean;
}

export interface FadeContent {
  fadeOutEnd: number;
  fadeInDuration: number;
}

export const CHANNELS = ['x', 'y', 'width', 'height', 'style'] as const;
export type Channel = (typeof CHANNELS)[number];

type OnDone = (finished: boolean) => void;
export type ChannelAnimation = (toValue: number, onDone: OnDone) => number;
export type FlightAnimations = Record<Channel, ChannelAnimation>;

export type ProgressStyle = (pair: SharedPair, progress: number) => ViewStyle;

export const DEFAULT_DURATION = 500;
export const DEFAULT_EASING = Easing.inOut(Easing.quad);
const FADE_IN_EASING = Easing.out(Easing.quad);

export function timing(
  duration = DEFAULT_DURATION,
  easing: EasingFunction = DEFAULT_EASING
): ChannelAnimation {
  return (toValue, onDone) =>
    withTiming(toValue, { duration, easing }, (finished) => {
      'worklet';
      scheduleOnRN(onDone, !!finished);
    });
}

export function spring(
  duration = DEFAULT_DURATION,
  dampingRatio?: number
): ChannelAnimation {
  const config =
    dampingRatio === undefined ? { duration } : { duration, dampingRatio };
  return (toValue, onDone) =>
    withSpring(toValue, config, (finished) => {
      'worklet';
      scheduleOnRN(onDone, !!finished);
    });
}

export function delayed(
  delay: number,
  animation: ChannelAnimation
): ChannelAnimation {
  return (toValue, onDone) => withDelay(delay, animation(toValue, onDone));
}

export function allChannels(animation: ChannelAnimation): FlightAnimations {
  return {
    x: animation,
    y: animation,
    width: animation,
    height: animation,
    style: animation,
  };
}

export interface Flight {
  pairs: SharedPair[];
  channels: Record<Channel, SharedValue<number>>;
  contentIn: SharedValue<number>;
  fadingTarget: SharedValue<string | null>;
  fadeContent: FadeContent | null;
  isFlying: (tag: string) => boolean;
  start: (options: StartOptions) => void;
  begin: (pairs: SharedPair[]) => void;
  release: (
    toValue: 0 | 1,
    animations: FlightAnimations,
    onSettle: (landed: boolean) => void
  ) => void;
}

interface StartOptions {
  pairs: SharedPair[];
  animations: FlightAnimations;
  fadeContent?: FadeContent | null;
  fadeTarget?: string;
  onLand?: () => void;
}

export function useFlight(): Flight {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const style = useSharedValue(0);
  const channels = { x, y, width, height, style };
  const contentIn = useSharedValue(1);
  const fadingTarget = useSharedValue<string | null>(null);
  const [pairs, setPairs] = useState<SharedPair[]>([]);
  const [fadeContent, setFadeContent] = useState<FadeContent | null>(null);
  const generation = useRef(0);

  const animateChannels = (
    toValue: number,
    animations: FlightAnimations,
    onAllDone: () => void
  ) => {
    const current = ++generation.current;
    let remaining = CHANNELS.length;
    const onDone = () => {
      remaining -= 1;
      if (remaining === 0 && current === generation.current) {
        onAllDone();
      }
    };
    CHANNELS.forEach((channel) => {
      channels[channel].value = animations[channel](toValue, onDone);
    });
  };

  const land = (fade: FadeContent | null) => {
    contentIn.value = fade
      ? withTiming(1, {
          duration: fade.fadeInDuration,
          easing: FADE_IN_EASING,
        })
      : 1;
    setPairs([]);
  };

  const begin = (newPairs: SharedPair[]) => {
    generation.current += 1;
    CHANNELS.forEach((channel) => {
      channels[channel].value = 0;
    });
    setFadeContent(null);
    fadingTarget.value = null;
    contentIn.value = 1;
    setPairs(newPairs);
  };

  return {
    pairs,
    channels,
    contentIn,
    fadingTarget,
    fadeContent,
    isFlying: (tag) => pairs.some((pair) => pair.tag === tag),
    start: ({
      pairs: newPairs,
      animations,
      fadeContent: fade = null,
      fadeTarget = null,
      onLand,
    }) => {
      begin(newPairs);
      setFadeContent(fade);
      if (fade && fadeTarget !== null) {
        fadingTarget.value = fadeTarget;
        contentIn.value = 0;
      }
      animateChannels(1, animations, () => {
        land(fade);
        onLand?.();
      });
    },
    begin,
    release: (toValue, animations, onSettle) => {
      animateChannels(toValue, animations, () => {
        if (toValue === 1) {
          land(null);
        } else {
          setPairs([]);
        }
        onSettle(toValue === 1);
      });
    },
  };
}

interface FlightLayerProps {
  flight: Flight;
  progressStyle?: ProgressStyle;
}

export function FlightLayer({ flight, progressStyle }: FlightLayerProps) {
  return (
    <>
      {flight.pairs.map((pair) => (
        <Flyer
          key={pair.tag}
          pair={pair}
          channels={flight.channels}
          fadeOutEnd={
            pair.fades === false ? undefined : flight.fadeContent?.fadeOutEnd
          }
          progressStyle={progressStyle}
        />
      ))}
    </>
  );
}

interface FlyerProps {
  pair: SharedPair;
  channels: Record<Channel, SharedValue<number>>;
  fadeOutEnd?: number;
  progressStyle?: ProgressStyle;
}

function Flyer({ pair, channels, fadeOutEnd, progressStyle }: FlyerProps) {
  const { from, to } = pair;
  const fromColor = from.backgroundColor ?? 'transparent';
  const toColor = to.backgroundColor ?? fromColor;

  const frameStyle = useAnimatedStyle(() => {
    const s = channels.style.value;
    const frame = {
      left: lerp(from.x, to.x, channels.x.value),
      top: lerp(from.y, to.y, channels.y.value),
      width: Math.max(0, lerp(from.width, to.width, channels.width.value)),
      height: Math.max(0, lerp(from.height, to.height, channels.height.value)),
      borderRadius: Math.max(
        0,
        lerp(from.borderRadius ?? 0, to.borderRadius ?? 0, s)
      ),
      backgroundColor:
        fromColor === toColor
          ? fromColor
          : interpolateColor(s, [0, 1], [fromColor, toColor]),
    };
    return progressStyle
      ? { ...frame, ...progressStyle(pair, channels.x.value) }
      : frame;
  });

  const contentStyle = useAnimatedStyle(() => {
    if (fadeOutEnd === undefined) {
      return { opacity: 1 };
    }
    const moved = Math.min(1, Math.max(0, channels.style.value));
    return { opacity: Math.max(0, 1 - moved / fadeOutEnd) };
  });

  return (
    <Animated.View style={[styles.flyer, frameStyle]}>
      <Animated.View style={[styles.fill, contentStyle]}>
        {pair.content}
      </Animated.View>
    </Animated.View>
  );
}

interface SharedContentProps {
  flight: Flight;
  fadeKey: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SharedContent({
  flight,
  fadeKey,
  children,
  style,
}: SharedContentProps) {
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: flight.fadingTarget.value === fadeKey ? flight.contentIn.value : 1,
  }));
  return (
    <Animated.View style={[styles.fill, style, fadeStyle]}>
      {children}
    </Animated.View>
  );
}

interface FrameOutlineProps {
  box: Box;
  color: string;
  label: string;
  labelBelow?: boolean;
}

export function FrameOutline({
  box,
  color,
  label,
  labelBelow,
}: FrameOutlineProps) {
  return (
    <View
      style={[
        styles.outline,
        {
          left: box.x - 2,
          top: box.y - 2,
          width: box.width + 4,
          height: box.height + 4,
          borderRadius: (box.borderRadius ?? 0) + 2,
          borderColor: color,
        },
      ]}>
      <View
        style={[
          styles.outlineLabel,
          labelBelow ? styles.outlineLabelBelow : styles.outlineLabelAbove,
          { backgroundColor: color },
        ]}>
        <Text style={styles.outlineText}>{label}</Text>
      </View>
    </View>
  );
}

export function lerp(from: number, to: number, progress: number) {
  'worklet';
  return from + (to - from) * progress;
}

const styles = StyleSheet.create({
  flyer: {
    position: 'absolute',
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 50,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  outline: {
    position: 'absolute',
    pointerEvents: 'none',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    zIndex: 60,
  },
  outlineLabel: {
    position: 'absolute',
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  outlineLabelAbove: {
    top: -9,
  },
  outlineLabelBelow: {
    bottom: -9,
  },
  outlineText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
