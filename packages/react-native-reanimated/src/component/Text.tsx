'use strict';
import type { ReactNode } from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import type { SharedValue } from '../commonTypes';
import type { AnimatedComponentRef } from '../createAnimatedComponent';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AddArrayPropertyType } from '../css/types';
import type { AnimatedProps } from '../helperTypes';
import { useAnimatedProps } from '../hook';
import { isSharedValue } from '../isSharedValue';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedTextComplement extends Text {
  getNode(): Text;
}

type BaseAnimatedTextProps = Omit<
  AnimatedProps<TextProps>,
  'animatedProps' | 'ref'
>;

type BaseAnimatedProps = Partial<AnimatedProps<TextProps>>;

type AnimatedTextProps =
  | (Omit<BaseAnimatedTextProps, 'children'> & {
      animatedProps?: AddArrayPropertyType<
        BaseAnimatedProps & { text?: string | number }
      >;
      text?: SharedValue<string> | SharedValue<number>;
      children?: never;
    })
  | (BaseAnimatedTextProps & {
      animatedProps?: AddArrayPropertyType<BaseAnimatedProps>;
    });

type PublicAnimatedTextProps = AnimatedTextProps & {
  ref?: AnimatedComponentRef<typeof Text>;
};

// is-tree-shakable-suppress
const AnimatedTextComponent = createAnimatedComponent(Text) as (
  props: PublicAnimatedTextProps
) => ReactNode;

type AnimatedTextWithTextPropProps = Omit<BaseAnimatedTextProps, 'children'> & {
  animatedProps?: AddArrayPropertyType<
    BaseAnimatedProps & { text?: string | number }
  >;
  text: SharedValue<string> | SharedValue<number>;
  children?: never;
  ref?: AnimatedComponentRef<typeof Text>;
};

// The inline `text` prop is just sugar for an animated prop - this way `text`
// updates take the same path as `useAnimatedProps` and the committed children
// (RawText shadow node) stay stable across re-renders and fast refresh.
function AnimatedTextWithTextProp({
  text,
  animatedProps,
  ...rest
}: AnimatedTextWithTextPropProps) {
  const textAnimatedProps = useAnimatedProps(
    () => ({ text: text.value }),
    [text]
  );
  return (
    <AnimatedTextComponent
      {...rest}
      animatedProps={
        animatedProps
          ? [
              textAnimatedProps,
              ...(Array.isArray(animatedProps)
                ? animatedProps
                : [animatedProps]),
            ]
          : textAnimatedProps
      }
    />
  );
}

export const AnimatedText = (props: PublicAnimatedTextProps): ReactNode =>
  'text' in props && isSharedValue(props.text) ? (
    <AnimatedTextWithTextProp {...(props as AnimatedTextWithTextPropProps)} />
  ) : (
    <AnimatedTextComponent {...props} />
  );

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
