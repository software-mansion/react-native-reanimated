'use strict';
import { View } from 'react-native';
import { createAnimatedComponent } from '../../createAnimatedComponent';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedViewComplement extends View {
  getNode(): View;
}

export const AnimatedView = createAnimatedComponent(View);

export type AnimatedView = typeof AnimatedView & AnimatedViewComplement;
