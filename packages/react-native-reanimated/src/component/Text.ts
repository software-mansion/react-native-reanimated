'use strict';
import type { ComponentRef, ReactNode } from 'react';
import { createElement, forwardRef } from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { logger } from '../common';
import type { SharedValueDisableContravariance } from '../commonTypes';
import {
  type AnimatedComponentType,
  createAnimatedComponent,
} from '../createAnimatedComponent';
import { getStaticFeatureFlag } from '../featureFlags';
import type { AnimatedProps } from '../helperTypes';
import { isSharedValue } from '../isSharedValue';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
type AnimatedTextComplement = ComponentRef<typeof Text> & {
  getNode(): ComponentRef<typeof Text>;
};

type AnimatedTextChild =
  | ReactNode
  | SharedValueDisableContravariance<string | number | null | undefined>;

type AnimatedTextProps = Omit<AnimatedProps<TextProps>, 'children' | 'ref'> & {
  children?: AnimatedTextChild | AnimatedTextChild[];
};

// is-tree-shakable-suppress
const AnimatedTextBase = createAnimatedComponent(Text);

const sharedValueIds = new WeakMap<object, number>();
let nextSharedValueId = 0;

function getSharedValueId(sharedValue: object) {
  let id = sharedValueIds.get(sharedValue);
  if (id === undefined) {
    id = nextSharedValueId++;
    sharedValueIds.set(sharedValue, id);
  }
  return id;
}

// is-tree-shakable-suppress
const AnimatedTextWithRef = forwardRef<
  ComponentRef<typeof Text>,
  AnimatedTextProps
>(({ children, ...props }, ref) => {
  const content = (Array.isArray(children) ? children : [children]).map(
    (child, index) => {
      if (!isSharedValue(child)) {
        return child;
      }
      if (__DEV__ && getStaticFeatureFlag('USE_ANIMATION_BACKEND')) {
        logger.warnOnce(
          'Animated.Text does not update shared value children when the `USE_ANIMATION_BACKEND` static feature flag is enabled.',
          0
        );
      }
      return createElement(
        AnimatedTextBase,
        { key: `${getSharedValueId(child)}:${index}` },
        child as ReactNode
      );
    }
  );
  return createElement(
    AnimatedTextBase,
    { ...props, ref },
    ...(content as ReactNode[])
  );
});
AnimatedTextWithRef.displayName = 'AnimatedText';

/**
 * Animated version of the React Native `Text`. Its children can be shared
 * values, and the text follows them on the UI thread without re-rendering.
 *
 * Pass the shared value itself as a child. Don't read its `value` during
 * render: it is a side effect that blocks the JS thread until the value is
 * fetched from the UI thread, and the text becomes a static snapshot that never
 * updates.
 *
 * @example
 *   // Antipattern
 *   <Animated.Text>{sv.value}</Animated.Text>
 *
 *   // Correct
 *   <Animated.Text>{sv}</Animated.Text>
 */
// is-tree-shakable-suppress
export const AnimatedText = AnimatedTextWithRef as AnimatedComponentType<
  Readonly<Omit<TextProps, 'children'>>,
  ComponentRef<typeof Text>,
  { children?: AnimatedTextChild | AnimatedTextChild[] }
>;

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
