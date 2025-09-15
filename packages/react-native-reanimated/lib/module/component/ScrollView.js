'use strict';

import React from 'react';
import { ScrollView } from 'react-native';
import { createAnimatedComponent } from '../createAnimatedComponent';
import { useAnimatedRef, useScrollOffset } from '../hook';

// Since createAnimatedComponent return type is ComponentClass that has the props of the argument,
// but not things like NativeMethods, etc. we need to add them manually by extending the type.
import { jsx as _jsx } from "react/jsx-runtime";
const AnimatedScrollViewComponent = createAnimatedComponent(ScrollView);
export function AnimatedScrollView({
  scrollViewOffset,
  ref,
  ...restProps
}) {
  const animatedRef = ref === null ?
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useAnimatedRef() : ref;
  if (scrollViewOffset) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useScrollOffset(animatedRef, scrollViewOffset);
  }

  // Set default scrollEventThrottle, because user expects
  // to have continuous scroll events.
  // We set it to 1 so we have peace until
  // there are 960 fps screens.
  if (!('scrollEventThrottle' in restProps)) {
    restProps.scrollEventThrottle = 1;
  }
  return /*#__PURE__*/_jsx(AnimatedScrollViewComponent, {
    ref: animatedRef,
    ...restProps
  });
}
//# sourceMappingURL=ScrollView.js.map