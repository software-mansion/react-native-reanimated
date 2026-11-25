import { useEffect, useRef, useState } from 'react';
import type { TextInputProps } from 'react-native';
import { TextInput, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  css,
  getViewProp,
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';

import { Button, ScrollScreen, Text } from '@/apps/css/components';
import { colors, radius, sizes, spacing, text } from '@/theme';
import { IS_WEB } from '@/utils';

const POLL_INTERVAL_MS = 100;
const INITIAL_OPACITY_LABEL = 'Committed opacity: -';
const INITIAL_COUNT_LABEL = 'Frames committed while hidden: 0';

const DESCRIPTION = `The box runs an infinite CSS animation. **Hide** sets \`display: 'none'\` on its parent. The readout polls the opacity committed to the view every ${POLL_INTERVAL_MS} ms.`;
const EXPECTED_BEHAVIOR =
  'Expected: while the box is hidden, Reanimated commits no frames, so the value stays the same. After **Show**, the animation continues where its timeline is now.';

type AnimatedViewRef = React.ComponentRef<typeof Animated.View>;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function readOpacity(view: AnimatedViewRef): Promise<string> {
  if (IS_WEB) {
    const element = view as unknown as HTMLElement;
    return Promise.resolve(window.getComputedStyle(element).opacity);
  }
  // The value of the shadow tree, so it changes only when a new frame is committed.
  return getViewProp<string>(-1, 'opacity', view);
}

// Updates its text from the UI thread. A React state update would commit the React tree,
// and every React commit carries the current animated styles, so the readout would change
// the value that it measures.
function Readout({
  initialText,
  value,
}: {
  initialText: string;
  value: SharedValue<string>;
}) {
  const animatedProps = useAnimatedProps(
    () => ({ text: value.value }) as TextInputProps
  );
  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      defaultValue={initialText}
      editable={false}
      style={styles.readoutText}
      underlineColorAndroid="transparent"
    />
  );
}

export default function HiddenAnimations() {
  const [hidden, setHidden] = useState(false);
  const opacityLabel = useSharedValue(INITIAL_OPACITY_LABEL);
  const countLabel = useSharedValue(INITIAL_COUNT_LABEL);
  const viewRef = useRef<AnimatedViewRef>(null);
  const hiddenRef = useRef(hidden);
  // Readings are compared only within one visibility interval. Each Hide or Show starts a new
  // interval, so the frames committed before the switch never count as frames while hidden.
  const intervalRef = useRef(0);
  const lastValueRef = useRef<string | null>(null);
  const countRef = useRef(0);

  useEffect(() => {
    hiddenRef.current = hidden;
    intervalRef.current += 1;
    lastValueRef.current = null;
    countRef.current = 0;
    countLabel.value = INITIAL_COUNT_LABEL;
  }, [countLabel, hidden]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!viewRef.current) {
        return;
      }
      const readInterval = intervalRef.current;
      readOpacity(viewRef.current)
        .then((value) => {
          if (readInterval !== intervalRef.current) {
            return;
          }
          const formatted = Number(value).toFixed(3);
          const lastValue = lastValueRef.current;
          if (
            hiddenRef.current &&
            lastValue !== null &&
            formatted !== lastValue
          ) {
            countRef.current += 1;
            countLabel.value = `Frames committed while hidden: ${countRef.current}`;
          }
          lastValueRef.current = formatted;
          opacityLabel.value = `Committed opacity: ${formatted}`;
        })
        .catch(() => {
          opacityLabel.value = 'Committed opacity: error';
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [countLabel, opacityLabel]);

  const toggle = () => setHidden((value) => !value);

  return (
    <ScrollScreen contentContainerStyle={styles.container}>
      <Text variant="heading3">CSS animation in a hidden subtree</Text>
      <Text>{DESCRIPTION}</Text>
      <Text>{EXPECTED_BEHAVIOR}</Text>

      <Button title={hidden ? 'Show' : 'Hide'} onPress={toggle} />

      <View style={styles.stage}>
        <View style={hidden ? styles.hidden : undefined}>
          <Animated.View ref={viewRef} style={styles.box} />
        </View>
      </View>

      <View style={styles.readout}>
        <Text variant="label2">State: {hidden ? 'hidden' : 'visible'}</Text>
        <Readout initialText={INITIAL_OPACITY_LABEL} value={opacityLabel} />
        <Readout initialText={INITIAL_COUNT_LABEL} value={countLabel} />
      </View>
    </ScrollScreen>
  );
}

const pulse = css.keyframes({
  from: {
    opacity: 1,
    transform: [{ translateX: -100 }],
  },
  to: {
    opacity: 0.2,
    transform: [{ translateX: 100 }],
  },
});

const styles = css.create({
  box: {
    animationDirection: 'alternate',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: pulse,
    animationTimingFunction: 'linear',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: sizes.md,
    width: sizes.md,
  },
  container: {
    gap: spacing.md,
    padding: spacing.md,
  },
  hidden: {
    display: 'none',
  },
  readout: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  readoutText: {
    ...text.label2,
    color: colors.foreground1,
    padding: 0,
  },
  stage: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    height: sizes.xl,
    justifyContent: 'center',
  },
});
