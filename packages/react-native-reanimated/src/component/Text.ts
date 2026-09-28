'use strict';
import type { ComponentRef, ReactNode } from 'react';
import { createElement, forwardRef, useEffect, useRef, useState } from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import type { SharedValue } from '../commonTypes';
import type { AnimatedComponentRef } from '../createAnimatedComponent';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AnimatedProps } from '../helperTypes';
import { isSharedValue } from '../isSharedValue';
import { startMapper, stopMapper } from '../mappers';
import { makeMutable } from '../mutables';

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

function toParts(children: AnimatedTextProps['children']): unknown[] {
  return Array.isArray(children) ? children : [children];
}

function joinParts(parts: unknown[]): string {
  'worklet';
  let text = '';
  for (const part of parts) {
    const value = isSharedValue(part) ? part.value : part;
    if (typeof value === 'string' || typeof value === 'number') {
      text += value;
    }
  }
  return text;
}

function useStableParts(parts: unknown[]): unknown[] {
  const ref = useRef(parts);
  const previous = ref.current;
  if (
    previous.length !== parts.length ||
    previous.some((part, index) => part !== parts[index])
  ) {
    ref.current = parts;
  }
  return ref.current;
}

// is-tree-shakable-suppress
export const AnimatedText = forwardRef<
  ComponentRef<typeof Text>,
  AnimatedTextProps
>(({ children, ...props }, ref) => {
  const parts = useStableParts(toParts(children));
  const hasSharedValue = parts.some(isSharedValue);
  const isAnimatedRef = useRef(hasSharedValue);
  if (hasSharedValue) {
    isAnimatedRef.current = true;
  }
  const isAnimated = isAnimatedRef.current;
  const [text] = useState(() => makeMutable(joinParts(parts)));

  useEffect(() => {
    if (!isAnimated) {
      return;
    }
    if (!hasSharedValue) {
      text.value = joinParts(parts);
      return;
    }
    const mapperId = startMapper(
      () => {
        'worklet';
        text.value = joinParts(parts);
      },
      parts.filter(isSharedValue),
      [text as SharedValue<unknown>]
    );
    return () => stopMapper(mapperId);
  }, [isAnimated, hasSharedValue, parts, text]);

  return createElement(
    AnimatedTextBase,
    { ...props, ref },
    (isAnimated ? text : children) as ReactNode
  );
}) as unknown as (
  props: AnimatedTextProps & {
    ref?: AnimatedComponentRef<typeof Text>;
  }
) => ReactNode;

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
