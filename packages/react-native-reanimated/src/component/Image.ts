'use strict';
import type { ComponentRef } from 'react';
import { Image } from 'react-native';

import { createAnimatedComponent } from '../createAnimatedComponent';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
type AnimatedImageComplement = ComponentRef<typeof Image> & {
  getNode(): ComponentRef<typeof Image>;
};

// is-tree-shakable-suppress
export const AnimatedImage = createAnimatedComponent(Image);

export type AnimatedImage = typeof AnimatedImage & AnimatedImageComplement;
