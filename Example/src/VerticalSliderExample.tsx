import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'; // we need this to make JSY compile
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  runOnUI,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import MaskedView from '@react-native-community/masked-view';
import { throttle } from 'lodash';
type ComponentType = {
  vertical?: boolean;
  containerStyle: ViewStyle;
  innerStyle: ViewStyle;
  animatedValue?: Animated.SharedValue<number>;
  maskStyle: ViewStyle;
  onChange: (value: number) => void;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
};

function updateValue(animatedWidth, animatedValue, value, min, max, height) {
  'worklet';
  if (animatedValue) {
    animatedValue.value = interpolate(value, [min, max], [0, 1]);
  }
  animatedWidth.value = height - ((value - min) / max) * height;
}

const useMeasure = (
  initialCb?: (size) => void
): [LayoutRectangle, (event: any) => void] => {
  const [size, setSize] = useState<LayoutRectangle>({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });

  const onLayout = useCallback(
    (event) => {
      const newSize = event.nativeEvent.layout;
      if (size.width === 0) {
        initialCb && initialCb(newSize);
      }
      setSize(newSize);
    },
    [initialCb, size.width]
  );

  return [size, onLayout];
};

const clamp = (value: number, lowerBound: number, upperBound: number) => {
  'worklet';
  return Math.min(Math.max(lowerBound, value), upperBound);
};

const toNearest = (value: number, step) => {
  'worklet';
  return Math.round(value * (1 / step)) / (1 / step);
};

const VerticalSlider: FunctionComponent<ComponentType> = ({
  containerStyle,
  innerStyle,
  maskStyle,
  onChange,
  value = 0,
  step = 1,
  min = 0,
  max = 100,
  animatedValue,
}) => {
  const $gesture = useSharedValue(false);
  const $size = useSharedValue(0);
  const $min = useSharedValue(min);
  const $step = useSharedValue(step);
  const $max = useSharedValue(max);
  const animatedHeight = useSharedValue(Number.MAX_SAFE_INTEGER);

  const [size, onLayout] = useMeasure((initialSize) => {
    $size.value = initialSize.height;
    animatedHeight.value = interpolate(
      value,
      [$min.value, $max.value],
      [initialSize.height, 0]
    );
    animatedValue.value = interpolate(value, [$min.value, $max.value], [0, 1]);
  });

  useEffect(() => {
    if (size.height) {
      if (!$gesture.value) {
        runOnUI(updateValue)(
          animatedHeight,
          animatedValue,
          value,
          min,
          max,
          size.height
        );
      }
    }
  }, [animatedHeight, $gesture.value, animatedValue, value, min, max, size]);

  const throttledOnChange = useRef(throttle(onChange, 20));

  const animatedHeightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animatedHeight.value }],
  }));

  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (event, ctx) => {
      ctx.offsetY = animatedHeight.value;
      $gesture.value = true;
    },
    onActive: (event, ctx) => {
      const val = clamp(ctx.offsetY + event.translationY, 0, $size.value);
      //
      animatedHeight.value = val;
      const value = interpolate(
        val,
        [0, $size.value],
        [$max.value, $min.value]
      );
      const rounded = toNearest(value, $step.value);
      if (animatedValue) {
        animatedValue.value = interpolate(
          value,
          [$min.value, $max.value],
          [0, 1]
        );
      }
      runOnJS(throttledOnChange.current)(rounded);
    },
    onEnd: () => {
      $gesture.value = false;
    },
  });
  return (
    <MaskedView
      style={{ flex: 1, height: '100%' }}
      maskElement={<View style={[styles.mask, maskStyle]} />}
    >
      {/* Shows behind the mask, you can put anything here, such as an image */}
      <PanGestureHandler {...{ onGestureEvent }}>
        <Animated.View
          onLayout={onLayout}
          style={[styles.outer, containerStyle]}
        >
          <Animated.View
            style={[styles.inner, innerStyle, animatedHeightStyle]}
          />
        </Animated.View>
      </PanGestureHandler>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'black',
  },
  mask: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white', // can't be transparent
  },
  inner: {
    width: '100%',
    height: '100%',
  },
});

type RenderProps = {
  value: any;
  setValue: (any) => void;
  animatedValue: Animated.SharedValue<number>;
};

type ComponentType2 = {
  defaultValue: any;
  children: (props: RenderProps) => any;
};

const WithSetValue: FunctionComponent<ComponentType2> = ({
  defaultValue,
  children,
}) => {
  const [value, setValue] = useState<any>(defaultValue);
  const animatedValue = useSharedValue(0);

  return children({
    value,
    setValue,
    animatedValue,
  });
};

type ComponentType3 = {
  animatedValue: Animated.SharedValue<number>;
  min?: number;
  max?: number;
};
const AnimationTester: FunctionComponent<ComponentType3> = ({
  animatedValue,
  min = 0,
  max = 1,
}) => {
  const $min = useSharedValue(min);
  const $max = useSharedValue(max);
  const style = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        animatedValue.value,
        [$min.value, $max.value],
        [0, 1]
      ),
      backgroundColor: interpolateColor(
        animatedValue.value,
        [min, max],
        ['#ff3884', '#38ffb3']
      ),
      transform: [
        {
          rotate:
            interpolate(
              animatedValue.value,
              [min, (max - min) / 2, max],
              [0, 180, 360]
            ) + 'deg',
        },
      ],
    };
  });
  return <Animated.View style={[styles3.box, style]} />;
};

const styles3 = StyleSheet.create({
  box: {
    width: 50,
    height: 50,
    position: 'absolute',
    right: 50,
    bottom: 50,
    backgroundColor: 'green',
  },
});

export default function VerticalSliderExample() {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: '#333',
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <WithSetValue defaultValue={90}>
        {({ value, setValue, animatedValue }) => (
          <>
            <View style={{ height: 200, width: 60 }}>
              <VerticalSlider
                min={0}
                animatedValue={animatedValue}
                max={100}
                onChange={setValue}
                step={10}
                value={value}
                innerStyle={{
                  backgroundColor: 'white',
                  width: 60,
                }}
                maskStyle={{ height: 200, width: 60, borderRadius: 16 }}
                containerStyle={{
                  backgroundColor: 'black',
                }}
              />
            </View>
            <AnimationTester animatedValue={animatedValue} />
            <Text>{value}</Text>
          </>
        )}
      </WithSetValue>
    </View>
  );
}
