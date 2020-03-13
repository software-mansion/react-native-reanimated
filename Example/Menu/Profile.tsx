import React from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { alpha, perspective } from './Constants';
import Content, { width } from './Content';

const MIN = -width * Math.tan(alpha);
const MAX = 0;
const PADDING = 100;

export default ({ close, scale, rotateY, translateX }) => {
  return (
    // <PanGestureHandler minDist={0} {...gestureHandler}>
    <Animated.View
      style={{
        opacity: 1,
        transform: [
          perspective,
          { translateX },
          { translateX: -width / 2 },
          { rotateY },
          { translateX: width / 2 },
          { scale },
        ],
      }}>
      <Content />
    </Animated.View>
    // </PanGestureHandler>
  );
};
