'use strict';

import { View } from 'react-native';
import { createAnimatedComponent } from "../createAnimatedComponent/index.js";

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.

export const AnimatedView = createAnimatedComponent(View);
//# sourceMappingURL=View.js.map