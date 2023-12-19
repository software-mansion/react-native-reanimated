import React from 'react';
import { Svg, Ellipse } from 'react-native-svg';
import Animated, {
  createAnimatedPropAdapter,
  processColor,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// highlight-next-line
const adapter = createAnimatedPropAdapter(
  (props) => {
    if (Object.keys(props).includes('fill')) {
      props.fill = { type: 0, payload: processColor(props.fill) };
    }
    if (Object.keys(props).includes('stroke')) {
      props.stroke = { type: 0, payload: processColor(props.stroke) };
    }
  },
  ['fill', 'stroke']
  // highlight-next-line
);

export default function App() {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1), -1, true);
  }, []);

  const ellipseAnimatedProps = useAnimatedProps(
    () => {
      const coordinates = { cx: 50, cy: 50, rx: 40, ry: 40 };

      return {
        cx: coordinates.cx,
        cy: coordinates.cy,
        rx: coordinates.rx,
        ry: coordinates.ry,
        stroke: 'rgb(255,0,0)',
        fill: 'yellow',
        opacity: opacity.value,
        strokeWidth: 2,
      };
    },
    [],
    // highlight-next-line
    adapter
  );

  return (
    <Svg width="100%" height="100%">
      <AnimatedEllipse animatedProps={ellipseAnimatedProps} />
    </Svg>
  );
}
