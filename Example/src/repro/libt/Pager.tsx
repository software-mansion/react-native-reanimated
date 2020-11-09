import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import Animated, {
  useAnimatedStyle,
  withSpring,
  cancelAnimation,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import {
  Dimensions,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  PanGestureHandler,
  TapGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { useAnimatedGestureHandler } from './useAnimatedGestureHandler';
import {
  friction,
  fixGestureHandler,
  getShouldRender,
  workletNoop,
  useSharedValue,
  typedMemo,
} from './utils';

const dimensions = Dimensions.get('window');

const GUTTER_WIDTH = Math.round(dimensions.width / 14);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  pager: {
    flex: 1,
    flexDirection: 'row',
  },
});

type IGutterProps = {
  width: number;
};

const Gutter = typedMemo(function Gutter({ width }: IGutterProps) {
  return <View style={{ width }} />;
});

type PageRefs = [
  React.Ref<TapGestureHandler>,
  React.Ref<PanGestureHandler>,
];

export interface RenderPageProps<T> {
  index: number;
  pagerRefs: PageRefs;
  onPageStateChange: (value: boolean) => void;
  item: T;
  width: number;
  isPageActive: Animated.SharedValue<boolean>;
  isPagerInProgress: Animated.SharedValue<boolean>;
}

interface PageProps {
  item: any;
  pagerRefs: PageRefs;
  onPageStateChange: (value: boolean) => void;
  gutterWidth: number;
  index: number;
  length: number;
  renderPage: (
    props: RenderPageProps<any>,
    index: number,
  ) => JSX.Element;
  shouldRenderGutter: boolean;
  getPageTranslate: (index: number) => number;
  width: number;
  currentIndex: Animated.SharedValue<number>;
  isPagerInProgress: Animated.SharedValue<boolean>;
}

const Page = typedMemo(
  ({
    pagerRefs,
    item,
    onPageStateChange,
    gutterWidth,
    index,
    length,
    renderPage,
    shouldRenderGutter,
    getPageTranslate,
    width,
    currentIndex,
    isPagerInProgress,
  }: PageProps) => {
    const isPageActive = useDerivedValue(() => {
      return currentIndex.value === index;
    }, []);

    return (
      <View
        style={{
          flex: 1,
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: -getPageTranslate(index),
        }}
      >
        <View
          style={[
            {
              flex: 1,
              width,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          {renderPage(
            {
              index,
              pagerRefs,
              onPageStateChange,
              item,
              width,
              isPageActive,
              isPagerInProgress,
            },
            index,
          )}
        </View>

        {index !== length - 1 && shouldRenderGutter && (
          <Gutter width={gutterWidth} />
        )}
      </View>
    );
  },
);

export interface PagerReusableProps<T> {
  numToRender?: number;
  initialDiffValue?: number;
  gutterWidth?: number;
  onIndexChange?: (nextIndex: number) => void;
  renderPage: (
    props: RenderPageProps<T>,
    index: number,
  ) => JSX.Element;
  onPagerTranslateChange?: (translateX: number) => void;
  onGesture?: (
    event: PanGestureHandlerGestureEvent['nativeEvent'],
    isActive: Animated.SharedValue<boolean>,
  ) => void;
}

type UnpackItemT<T> = T extends Array<infer ItemT>
  ? ItemT
  : T extends ReadonlyArray<infer ItemT>
  ? ItemT
  : T extends Map<any, infer ItemT>
  ? ItemT
  : T extends Set<infer ItemT>
  ? ItemT
  : T extends {
      [key: string]: infer ItemT;
    }
  ? ItemT
  : any;

export interface PagerProps<T, ItemT>
  extends PagerReusableProps<ItemT> {
  totalCount: number;
  initialIndex: number;
  pages: T;
  width?: number;
  shouldRenderGutter?: boolean;
  keyExtractor: (item: ItemT, index: number) => string;
  getItem?: (data: T, index: number) => ItemT | undefined;
  pagerWrapperStyles?: any;
  springConfig?: Omit<Animated.WithSpringConfig, 'velocity'>;

  shouldHandleGestureEvent?: (
    event: PanGestureHandlerGestureEvent['nativeEvent'],
  ) => boolean;
  outerGestureHandlerRefs?: React.Ref<any>[];
  verticallyEnabled?: boolean;
}

function workletNoopTrue() {
  'worklet';

  return true;
}

export const Pager = typedMemo(function Pager<
  TPages,
  ItemT = UnpackItemT<TPages>
>({
  pages,
  initialIndex,
  totalCount,
  numToRender = 2,
  onIndexChange,
  renderPage,
  width = dimensions.width,
  gutterWidth = GUTTER_WIDTH,
  shouldRenderGutter = true,
  keyExtractor,
  pagerWrapperStyles = {},
  getItem,
  springConfig,
  onPagerTranslateChange = workletNoop,
  onGesture = workletNoop,
  shouldHandleGestureEvent = workletNoopTrue,
  initialDiffValue = 0,
  outerGestureHandlerRefs = [],
  verticallyEnabled = true,
}: PagerProps<TPages, ItemT>) {
  fixGestureHandler();

  // make sure to not calculate translate with gutter
  // if we don't want to render it
  if (!shouldRenderGutter) {
    gutterWidth = 0;
  }

  const getPageTranslate = (i: number) => {
    'worklet';

    const t = i * width;
    const g = gutterWidth * i;
    return -(t + g);
  };

  const pagerRef = useRef(null);
  const tapRef = useRef(null);

  const isActive = useSharedValue(true);

  function onPageStateChange(value: boolean) {
    'worklet';

    isActive.value = value;
  }

  const velocity = useSharedValue(0);

  const [diffValue, setDiffValue] = useState(initialDiffValue);
  useEffect(() => {
    setDiffValue(numToRender);
  }, [numToRender]);

  // S2: Pager related stuff
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const index = useSharedValue(initialIndex);
  const length = useSharedValue(totalCount);
  const pagerX = useSharedValue(0);
  const toValueAnimation = useSharedValue(
    getPageTranslate(initialIndex),
  );

  const offsetX = useSharedValue(getPageTranslate(initialIndex));

  const totalWidth = useDerivedValue(() => {
    return length.value * width + gutterWidth * length.value - 2;
  }, []);

  const onIndexChangeCb = useCallback((nextIndex: number) => {
    'worklet';

    if (onIndexChange) {
     // onIndexChange(nextIndex);
    }

    runOnJS(setActiveIndex)(nextIndex);
  }, []);

  useEffect(() => {
    offsetX.value = getPageTranslate(initialIndex);
    index.value = initialIndex;
    onIndexChangeCb(initialIndex);
  }, [initialIndex]);

  const onChangePageAnimation = (noVelocity?: boolean) => {
    'worklet';

    function stiffnessFromTension(oValue: number) {
      return (oValue - 30) * 3.62 + 194;
    }

    function dampingFromFriction(oValue: number) {
      return (oValue - 8) * 3 + 25;
    }

    const configToUse =
      typeof springConfig !== 'undefined'
        ? springConfig
        : {
            stiffness: stiffnessFromTension(400),
            damping: dampingFromFriction(50),
            mass: 5,
            overshootClamping: true,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 0.01,
          };

    // @ts-ignore
    // cannot use merge and spread here :(
    configToUse.velocity = noVelocity ? 0 : velocity.value;

    if (offsetX.value === toValueAnimation.value) {
      return;
    }

    offsetX.value = withSpring(
      toValueAnimation.value,
      configToUse as Animated.WithSpringConfig,
      (isCanceled) => {
        if (!isCanceled) {
          velocity.value = 0;
        }
      },
    );
  };

  // S3 Pager
  function getCanSwipe(currentTranslate: number = 0) {
    'worklet';

    const nextTranslate = offsetX.value + currentTranslate;

    if (nextTranslate > 0) {
      return false;
    }

    const totalTranslate =
      width * (length.value - 1) + gutterWidth * (length.value - 1);

    if (Math.abs(nextTranslate) >= totalTranslate) {
      return false;
    }

    return true;
  }

  const getNextIndex = (v: number) => {
    'worklet';

    const currentTranslate = Math.abs(getPageTranslate(index.value));
    const currentIndex = index.value;
    const currentOffset = Math.abs(offsetX.value);

    const nextIndex = v < 0 ? currentIndex + 1 : currentIndex - 1;

    if (
      nextIndex < currentIndex &&
      currentOffset > currentTranslate
    ) {
      return currentIndex;
    }

    if (
      nextIndex > currentIndex &&
      currentOffset < currentTranslate
    ) {
      return currentIndex;
    }

    if (nextIndex > length.value - 1 || nextIndex < 0) {
      return currentIndex;
    }

    return nextIndex;
  };

  const isPagerInProgress = useDerivedValue(() => {
    return (
      Math.floor(Math.abs(getPageTranslate(index.value))) !==
      Math.floor(Math.abs(offsetX.value + pagerX.value))
    );
  }, []);

  const onPan = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    {
      pagerActive: boolean;
    }
  >({
    onGesture: (evt) => {
      onGesture(evt, isActive);
    },

    shouldHandleEvent: (evt) => {
      return (
        evt.numberOfPointers === 1 &&
        isActive.value &&
        Math.abs(evt.velocityX) > Math.abs(evt.velocityY) &&
        shouldHandleGestureEvent(evt)
      );
    },

    onEvent: (evt) => {
      velocity.value = evt.velocityX;
    },

    onActive: (evt) => {
      const canSwipe = getCanSwipe(evt.translationX);
      pagerX.value = canSwipe
        ? evt.translationX
        : friction(evt.translationX);
    },

    onEnd: (evt) => {
      offsetX.value += pagerX.value;
      pagerX.value = 0;

      const canSwipe = getCanSwipe();

      const nextIndex = getNextIndex(evt.velocityX);

      const vx = Math.abs(evt.velocityX);

      const translation = Math.abs(evt.translationX);
      const isHalf = width / 2 < translation;

      const shouldMoveToNextPage = (vx > 10 || isHalf) && canSwipe;

      // we invert the value since the translationY is left to right
      toValueAnimation.value = -(shouldMoveToNextPage
        ? -getPageTranslate(nextIndex)
        : -getPageTranslate(index.value));

      console.log('on end');

      onChangePageAnimation(!shouldMoveToNextPage);

      if (shouldMoveToNextPage) {
        index.value = nextIndex;
        onIndexChangeCb(nextIndex);
      }
    },
  });

  const onTap = useAnimatedGestureHandler({
    shouldHandleEvent: (evt) => {
      return evt.numberOfPointers === 1 && isActive.value;
    },

    onStart: () => {
      cancelAnimation(offsetX);
    },

    onEnd: () => {
      onChangePageAnimation(true);
    },
  });

  const pagerStyles = useAnimatedStyle<ViewStyle>(() => {
    const translateX = pagerX.value + offsetX.value;

    onPagerTranslateChange(translateX);

    return {
      width: totalWidth.value,
      transform: [
        {
          translateX,
        },
      ],
    };
  }, []);



  const pagerRefs = useMemo<PageRefs>(() => [pagerRef, tapRef], []);

  const pagesToRender = useMemo(() => {
    const temp = [];

    for (let i = 0; i < totalCount; i += 1) {
      let itemToUse;

      if (typeof getItem === 'function') {
        itemToUse = getItem(pages, i);
      } else if (Array.isArray(pages)) {
        itemToUse = pages[i];
      } else {
        throw new Error(
          'Pager: items either should be an array of getItem should be defined',
        );
      }

      const shouldRender = getShouldRender(i, activeIndex, diffValue);

      if (!shouldRender) {
        temp.push(null);
      } else {
        temp.push(
          <Page
            key={keyExtractor(itemToUse, i)}
            item={itemToUse}
            currentIndex={index}
            pagerRefs={pagerRefs}
            onPageStateChange={onPageStateChange}
            index={i}
            length={totalCount}
            gutterWidth={gutterWidth}
            renderPage={renderPage}
            getPageTranslate={getPageTranslate}
            width={width}
            isPagerInProgress={isPagerInProgress}
            shouldRenderGutter={shouldRenderGutter}
          />,
        );
      }
    }

    return temp;
  }, [
    keyExtractor,
    getItem,
    totalCount,
    pages,
    getShouldRender,
    index,
    pagerRefs,
    onPageStateChange,
    gutterWidth,
    renderPage,
    getPageTranslate,
    width,
    isPagerInProgress,
    shouldRenderGutter,
  ]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[StyleSheet.absoluteFill]}>
        <PanGestureHandler
          ref={pagerRef}
          activeOffsetX={[-4, 4]}
          activeOffsetY={verticallyEnabled ? [-4, 4] : undefined}
          simultaneousHandlers={[tapRef, ...outerGestureHandlerRefs]}
          onGestureEvent={onPan}
        >
          <Animated.View style={StyleSheet.absoluteFill}>
            <TapGestureHandler
              ref={tapRef}
              maxDeltaX={10}
              maxDeltaY={10}
              simultaneousHandlers={pagerRef}
              onGestureEvent={onTap}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, pagerWrapperStyles]}
              >
                <Animated.View style={StyleSheet.absoluteFill}>
                  <Animated.View style={[styles.pager, pagerStyles]}>
                    {pagesToRender}
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </TapGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </View>
  );
});
