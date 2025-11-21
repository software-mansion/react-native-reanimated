'use strict';
import { Text, TextProps } from 'react-native';

import { createAnimatedComponent } from '../createAnimatedComponent';
import type { SharedValue } from '../commonTypes';
import { ComponentType } from 'react';

type AnimatedTextProps = TextProps & {
  text?: SharedValue<string>;
};

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedTextComplement extends Text {
  getNode(): Text;
}

export const AnimatedText =
  createAnimatedComponent<ComponentType<AnimatedTextProps>>(Text);

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
