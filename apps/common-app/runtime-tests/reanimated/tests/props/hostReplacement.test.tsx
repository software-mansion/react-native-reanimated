import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import type { AnimatedProps } from 'react-native-reanimated';
import Animated, {
  css,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const BOX_SIZE = 100;
const WIDTH_ANIMATION_MS = 400;
const TRANSITION_MS = 2000;

type InnerView = React.ComponentRef<typeof View>;
type InnerRef = React.RefObject<InnerView | null>;
type HostProps = ViewProps & { hostKey?: number; innerRef: InnerRef };
type ScrollHandle = { getNativeScrollRef: () => InnerView | null };

// Lets a test drive a wrapped component from the inside, without an update of
// the animated component above it.
const controls: {
  replaceInnerView?: () => void;
  rerenderInner?: () => void;
  setOpacity?: (value: number) => void;
} = {};

// Keeps its instance while the view returned from `getAnimatableRef` is
// replaced through `hostKey`.
class AnimatableRefHost extends React.Component<HostProps> {
  hostView: InnerView | null = null;

  getAnimatableRef() {
    return this.hostView;
  }

  render() {
    const { hostKey, innerRef, ...viewProps } = this.props;
    return (
      <View
        key={hostKey}
        ref={(view) => {
          this.hostView = view;
          innerRef.current = view;
        }}
        {...viewProps}
      />
    );
  }
}

// Forwards the ref to its view and replaces that view from its own state, so
// only the ref callback tells the animated component about the new host.
function ForwardedRefHost({
  ref,
  hostKey: _hostKey,
  innerRef,
  ...viewProps
}: HostProps & { ref?: React.Ref<InnerView> }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    controls.replaceInnerView = () => setKey((value) => value + 1);
  }, []);

  const setRefs = useCallback(
    (view: InnerView | null) => {
      innerRef.current = view;
      if (typeof ref === 'function') {
        ref(view);
      } else if (ref) {
        ref.current = view;
      }
    },
    [innerRef, ref]
  );

  return <View key={key} ref={setRefs} {...viewProps} />;
}

// Hands React a new handle on every render while its view stays the same.
function FreshHandleHost({
  ref,
  hostKey: _hostKey,
  innerRef,
  ...viewProps
}: HostProps & { ref?: React.Ref<ScrollHandle> }) {
  const viewRef = useRef<InnerView>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    controls.rerenderInner = () => setTick((value) => value + 1);
  }, []);

  // No deps on purpose: the handle object changes on every render.
  useImperativeHandle(ref, () => ({
    getNativeScrollRef: () => viewRef.current,
  }));

  return (
    <View
      ref={(view) => {
        viewRef.current = view;
        innerRef.current = view;
      }}
      {...viewProps}
    />
  );
}

// Exposes methods instead of a view, so the animated component has to find
// the view itself.
function ImperativeHandleHost({
  ref,
  hostKey: _hostKey,
  innerRef,
  ...viewProps
}: HostProps & { ref?: React.Ref<{ ping: () => void }> }) {
  useImperativeHandle(ref, () => ({ ping: () => undefined }));

  return <View ref={innerRef} {...viewProps} />;
}

const AnimatedAnimatableRefHost =
  Animated.createAnimatedComponent(AnimatableRefHost);
const AnimatedForwardedRefHost =
  Animated.createAnimatedComponent(ForwardedRefHost);
const AnimatedFreshHandleHost =
  Animated.createAnimatedComponent(FreshHandleHost);
const AnimatedImperativeHandleHost =
  Animated.createAnimatedComponent(ImperativeHandleHost);

type HostComponent = React.ComponentType<AnimatedProps<HostProps>>;

function Example(props: {
  Host: HostComponent;
  hostKey?: number;
  highlighted?: boolean;
}) {
  const { hostKey = 0, highlighted = false } = props;
  const innerRef = useTestRef('box');
  const width = useSharedValue(BOX_SIZE);
  const opacity = useSharedValue(1);

  useEffect(() => {
    width.value = withRepeat(
      withTiming(BOX_SIZE * 1.5, { duration: WIDTH_ANIMATION_MS }),
      -1,
      true
    );
    controls.setOpacity = (value) => {
      opacity.value = value;
    };
  }, [width, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <props.Host
      hostKey={hostKey}
      innerRef={innerRef}
      style={[
        styles.box,
        animatedStyle,
        { opacity, backgroundColor: highlighted ? 'blue' : 'red' },
      ]}
    />
  );
}

const styles = css.create({
  box: {
    height: BOX_SIZE,
    transitionDuration: TRANSITION_MS,
    transitionProperty: 'backgroundColor',
    transitionTimingFunction: 'linear',
    width: BOX_SIZE,
  },
});

function redChannel(hexColor: string) {
  return parseInt(hexColor.slice(1, 3), 16);
}

// The animated style and the inline prop have to reach the view behind the
// test ref without any update of the animated component.
async function expectBindingsOnCurrentHost() {
  const box = getTestComponent('box');

  const width = (await box.getMountedViewProps())?.width;
  await expectEventually(
    async () => (await box.getMountedViewProps())?.width
  ).not.toBe(width, ComparisonMode.PIXEL);

  controls.setOpacity?.(0.3);
  await expectEventually(
    async () => (await box.getMountedViewProps())?.opacity
  ).toBeWithinRange(0.25, 0.35);
  controls.setOpacity?.(1);
}

// A CSS manager left on the previous view would let the colour change at once.
async function expectTransitionOnCurrentHost(
  Host: HostComponent,
  hostKey?: number
) {
  await render(<Example Host={Host} hostKey={hostKey} highlighted />);
  await wait(TRANSITION_MS / 2);

  const presented = await getTestComponent('box').getPresentedViewProps();
  expect(redChannel(presented?.backgroundColor ?? '')).toBeWithinRange(40, 215);
}

describe('Host replacement', () => {
  describe('getAnimatableRef() returns a new view', () => {
    test('moves the bindings on update', async () => {
      await render(<Example Host={AnimatedAnimatableRefHost} hostKey={0} />);
      await waitForFrames();
      await render(<Example Host={AnimatedAnimatableRefHost} hostKey={1} />);
      await waitForFrames();

      await expectBindingsOnCurrentHost();
      await expectTransitionOnCurrentHost(AnimatedAnimatableRefHost, 1);
    });

    test('survives repeated replacements', async () => {
      await render(<Example Host={AnimatedAnimatableRefHost} hostKey={0} />);
      await waitForFrames();
      for (let hostKey = 1; hostKey <= 3; hostKey++) {
        await render(
          <Example Host={AnimatedAnimatableRefHost} hostKey={hostKey} />
        );
        await waitForFrames();
      }

      await expectBindingsOnCurrentHost();
      await expectTransitionOnCurrentHost(AnimatedAnimatableRefHost, 3);
    });
  });

  describe('the wrapped component replaces its view on its own', () => {
    test('moves the bindings from the ref callback', async () => {
      await render(<Example Host={AnimatedForwardedRefHost} />);
      await waitForFrames();
      const previousTag = getTestComponent('box').getTag();

      controls.replaceInnerView?.();
      await waitForFrames(3);
      expect(getTestComponent('box').getTag()).not.toBe(previousTag);

      await expectBindingsOnCurrentHost();
      await expectTransitionOnCurrentHost(AnimatedForwardedRefHost);
    });
  });

  describe('a new ref resolves to the same view', () => {
    test('keeps the bindings', async () => {
      await render(<Example Host={AnimatedFreshHandleHost} />);
      await waitForFrames();
      const tag = getTestComponent('box').getTag();

      controls.rerenderInner?.();
      await waitForFrames(3);
      expect(getTestComponent('box').getTag()).toBe(tag);

      await expectBindingsOnCurrentHost();
      await expectTransitionOnCurrentHost(AnimatedFreshHandleHost);
    });
  });

  describe('the ref is an imperative handle', () => {
    test('binds to the view the component renders', async () => {
      await render(<Example Host={AnimatedImperativeHandleHost} />);
      await waitForFrames();

      await expectBindingsOnCurrentHost();
      await expectTransitionOnCurrentHost(AnimatedImperativeHandleHost);
    });
  });
});
