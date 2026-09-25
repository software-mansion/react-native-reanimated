'use strict';
import type { ComponentRef, ReactNode } from 'react';
import { createElement, forwardRef } from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import type { SharedValue } from '../commonTypes';
import type { AnimatedComponentRef } from '../createAnimatedComponent';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AnimatedProps } from '../helperTypes';
import { isSharedValue } from '../isSharedValue';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
type AnimatedTextComplement = ComponentRef<typeof Text> & {
  getNode(): ComponentRef<typeof Text>;
};

type AnimatedTextChild = ReactNode | SharedValue<string> | SharedValue<number>;

type AnimatedTextProps = Omit<AnimatedProps<TextProps>, 'children' | 'ref'> & {
  children?: AnimatedTextChild | AnimatedTextChild[];
};

const AnimatedTextBase = createAnimatedComponent(Text);

// is-tree-shakable-suppress
export const AnimatedText = forwardRef<
  ComponentRef<typeof Text>,
  AnimatedTextProps
>(({ children, ...props }, ref) => {
  const content =
    Array.isArray(children) && children.some(isSharedValue)
      ? children.map((child) =>
          isSharedValue(child)
            ? createElement(AnimatedTextBase, null, child as ReactNode)
            : child
        )
      : [children];
  return createElement(
    AnimatedTextBase,
    { ...props, ref },
    ...(content as ReactNode[])
  );
}) as unknown as (
  props: AnimatedTextProps & {
    ref?: AnimatedComponentRef<typeof Text>;
  }
) => ReactNode;

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
