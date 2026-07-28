'use strict';
import type { ComponentProps, ComponentRef } from 'react';
import { View } from 'react-native';

import {
  type AnimatedComponentType,
  createAnimatedComponent,
} from '../createAnimatedComponent';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
type AnimatedViewComplement = ComponentRef<typeof View> & {
  getNode(): ComponentRef<typeof View>;
};

// is-tree-shakable-suppress
export const AnimatedView: AnimatedComponentType<
  Readonly<ComponentProps<typeof View>>,
  ComponentRef<typeof View>
> = createAnimatedComponent(View);

export type AnimatedView = typeof AnimatedView & AnimatedViewComplement;
