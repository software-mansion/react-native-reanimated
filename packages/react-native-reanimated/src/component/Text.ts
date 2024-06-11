'use strict';
import { Text } from 'react-native';
import { createAnimatedComponent } from '../createAnimatedComponent';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
interface AnimatedTextComplement extends Text {
  getNode(): Text;
}

export const AnimatedText = createAnimatedComponent(Text);

export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
