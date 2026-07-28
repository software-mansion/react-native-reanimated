'use strict';
import type { ComponentProps, ComponentRef } from 'react';
import { Text } from 'react-native';

import {
  type AnimatedComponentType,
  createAnimatedComponent,
} from '../createAnimatedComponent';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
type AnimatedTextComplement = ComponentRef<typeof Text> & {
  getNode(): ComponentRef<typeof Text>;
};

// is-tree-shakable-suppress
export const AnimatedText: AnimatedComponentType<
  Readonly<ComponentProps<typeof Text>>,
  ComponentRef<typeof Text>
> = createAnimatedComponent(Text);

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
