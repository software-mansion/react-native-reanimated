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
export const AnimatedText = forwardRef<
  ComponentRef<typeof Text>,
  AnimatedTextProps
>(({ children, ...props }, ref) => {
  const content = (Array.isArray(children) ? children : [children]).map(
    (child, index) =>
      isSharedValue(child)
        ? createElement(
            AnimatedTextBase,
            { key: `${getSharedValueId(child)}:${index}` },
            child as ReactNode
          )
        : child
  );
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
