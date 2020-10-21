import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  ImageRequireSource,
  ViewStyle,
  Dimensions,
} from 'react-native';
import Animated, {
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import * as vec from './vectors';
import { useAnimatedGestureHandler } from './useAnimatedGestureHandler';
import {
  fixGestureHandler,
  clamp,
  workletNoop,
  useSharedValue,
  normalizeDimensions,
} from './utils';

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  container: {
    flex: 1,
  },
});

const defaultTimingConfig = {
  duration: 250,
  easing: Easing.bezier(0.33, 0.01, 0, 1),
};

export interface RenderScalableImageProps {
  width: number;
  height: number;
  source: { uri: string } | ImageRequireSource;
  onLoad: () => void;
}

export interface ScalableImageReusableProps {
  renderImage?: (props: RenderScalableImageProps) => JSX.Element;
  MAX_SCALE?: number;
  MIN_SCALE?: number;
}

export interface ScalableImageProps
  extends ScalableImageReusableProps {
  outerGestureHandlerRefs?: React.Ref<any>[];
  source?: ImageRequireSource | string;
  width: number;
  height: number;
  canvasDimensions?: {
    width: number;
    height: number;
  };
  onStateChange?: (isActive: boolean) => void;
  onScale?: (scale: number) => void;

  onGestureStart?: () => void;
  onGestureRelease?: () => void;
  onEnd?: () => void;

  outerGestureHandlerActive?: Animated.SharedValue<boolean>;

  timingConfig?: Animated.WithTimingConfig;
  style?: ViewStyle;
  enabled?: boolean;
}

const AnimatedImageComponent = Animated.createAnimatedComponent(
  Image,
);

export const ScalableImage = React.memo<ScalableImageProps>(
  ({
    outerGestureHandlerRefs = [],
    source,
    width,
    height,
    onStateChange = workletNoop,
    renderImage,

    canvasDimensions,
    outerGestureHandlerActive,

    style,
    onScale = workletNoop,
    onGestureRelease = workletNoop,
    onGestureStart = workletNoop,
    onEnd = workletNoop,

    MAX_SCALE = 3,
    MIN_SCALE = 1,
    timingConfig = defaultTimingConfig,

    enabled = true,
  }) => {
    fixGestureHandler();

    if (typeof source === 'undefined') {
      throw new Error(
        'ScalableImage: either source or uri should be passed to display an image',
      );
    }

    const imageSource =
      typeof source === 'string'
        ? {
            uri: source,
          }
        : source;

    const interactionsEnabled = useSharedValue(false);
    const setInteractionsEnabled = useCallback((value: boolean) => {
      interactionsEnabled.value = value;
    }, []);
    const onLoadImageSuccess = useCallback(() => {
      setInteractionsEnabled(true);
    }, []);

    const pinchRef = useRef(null);

    const scale = useSharedValue(1);
    const scaleOffset = useSharedValue(1);
    const scaleTranslation = vec.useSharedVector(0, 0);

    const { targetWidth, targetHeight } = normalizeDimensions(
      {
        width,
        height,
      },
      canvasDimensions?.width ?? Dimensions.get('window').width,
    );

    const canvas = vec.create(
      canvasDimensions?.width ?? targetWidth,
      canvasDimensions?.height ?? targetHeight,
    );

    const onScaleEvent = useAnimatedGestureHandler<
      PinchGestureHandlerGestureEvent,
      {
        origin: vec.Vector<number>;
        adjustFocal: vec.Vector<number>;
        gestureScale: number;
        nextScale: number;
      }
    >({
      onInit: (_, ctx) => {
        ctx.origin = vec.create(0, 0);
        ctx.gestureScale = 1;
      },

      shouldHandleEvent: (evt) => {
        return (
          evt.numberOfPointers === 2 &&
          scale.value === 1 &&
          interactionsEnabled.value &&
          (typeof outerGestureHandlerActive !== 'undefined'
            ? !outerGestureHandlerActive.value
            : true)
        );
      },

      beforeEach: (evt, ctx) => {
        // calculate the overall scale value
        // also limits this.event.scale
        ctx.nextScale = clamp(
          evt.scale * scaleOffset.value,
          MIN_SCALE,
          MAX_SCALE,
        );

        if (ctx.nextScale > MIN_SCALE && ctx.nextScale < MAX_SCALE) {
          ctx.gestureScale = evt.scale;
        }

        // this is just to be able to use with vectors
        const focal = vec.create(evt.focalX, evt.focalY);
        const CENTER = vec.divide(canvas, 2);

        // it alow us to scale into different point even then we pan the image
        ctx.adjustFocal = vec.sub(focal, CENTER);
      },

      afterEach: (evt, ctx) => {
        if (evt.state === 5) {
          return;
        }

        scale.value = ctx.nextScale;
      },

      onStart: (_, ctx) => {
        vec.set(ctx.origin, ctx.adjustFocal);

        onGestureStart();
      },

      onActive: (_, ctx) => {
        const pinch = vec.sub(ctx.adjustFocal, ctx.origin);

        const nextTranslation = vec.add(
          pinch,
          ctx.origin,
          vec.multiply(-1, ctx.gestureScale, ctx.origin),
        );

        vec.set(scaleTranslation, nextTranslation);
      },

      onEnd: (_, ctx) => {
        onGestureRelease();
        // reset gestureScale value
        ctx.gestureScale = 1;

        // store scale value
        scale.value = withTiming(1, timingConfig, () => {
          onEnd();
        });
        vec.set(scaleTranslation, () => withTiming(0, timingConfig));
      },
    });

    const animatedStyles = useAnimatedStyle<ViewStyle>(() => {
      const noScaleTranslation =
        scaleTranslation.x.value === 0 &&
        scaleTranslation.y.value === 0;

      const isInactive = scale.value === 1 && noScaleTranslation;

      onStateChange(isInactive);

      onScale(scale.value);

      return {
        transform: [
          {
            translateX: scaleTranslation.x.value,
          },
          {
            translateY: scaleTranslation.y.value,
          },
          { scale: scale.value },
        ],
      };
    }, []);

    return (
      <Animated.View
        style={[{ width: targetWidth, height: targetHeight }, style]}
      >
        <PinchGestureHandler
          enabled={enabled}
          ref={pinchRef}
          onGestureEvent={onScaleEvent}
          simultaneousHandlers={[...outerGestureHandlerRefs]}
        >
          <Animated.View style={styles.wrapper}>
            <Animated.View style={animatedStyles}>
              {typeof renderImage === 'function' ? (
                renderImage({
                  source: imageSource,
                  width: targetWidth,
                  height: targetHeight,
                  onLoad: onLoadImageSuccess,
                })
              ) : (
                <AnimatedImageComponent
                  onLoad={onLoadImageSuccess}
                  source={imageSource}
                  style={{
                    width: targetWidth,
                    height: targetHeight,
                  }}
                />
              )}
            </Animated.View>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    );
  },
);
