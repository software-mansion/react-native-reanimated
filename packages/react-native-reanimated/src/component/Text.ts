'use strict';
import type { ReactNode } from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import type { SharedValue } from '../commonTypes';
import type { AnimatedComponentRef } from '../createAnimatedComponent';
import { createAnimatedComponent } from '../createAnimatedComponent';
import type { AddArrayPropertyType } from '../css/types';
import type { AnimatedProps } from '../helperTypes';

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

export const AnimatedText = createAnimatedComponent(Text) as (
  props: AnimatedTextProps & {
    ref?: AnimatedComponentRef<typeof Text>;
  }
) => ReactNode;

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
