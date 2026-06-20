import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PropsWithChildren, ReactElement } from 'react';
import {
  Children,
  cloneElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, flex, sizes, spacing } from '@/theme';
import { IS_WEB } from '@/utils';

import TabSelector from '../inputs/TabSelector';

const WINDOW_WIDTH = Dimensions.get('screen').width;

// Horizontal finger travel before the swipe takes over the touch (keeps taps
// and the inner vertical scroll working).
const SWIPE_ACTIVATION_DISTANCE = 15;
// Vertical finger travel that hands the touch back to the inner scroll view.
const SWIPE_FAIL_DISTANCE = 15;
// How far / fast a swipe must be on release to commit to the neighbouring tab.
const SWIPE_DISTANCE_THRESHOLD = WINDOW_WIDTH * 0.2;
const SWIPE_VELOCITY_THRESHOLD = 500;
// Rubber-band factor applied when dragging past the first / last tab.
const EDGE_RESISTANCE = 0.2;

type TabProps = PropsWithChildren<{
  name: string;
}>;

type TabPropsInternal = {
  index: number;
  rendered: boolean;
  selectedTabIndex: SharedValue<number>;
  previousSelectedTabIndex: SharedValue<number>;
  dragTranslateX: SharedValue<number>;
} & TabProps;

const Tab = memo(function Tab({
  children,
  dragTranslateX,
  index,
  previousSelectedTabIndex,
  rendered,
  selectedTabIndex,
}: TabPropsInternal): ReactElement {
  const animatedTabStyle = useAnimatedStyle(() => ({
    opacity:
      index === selectedTabIndex.value ||
      index === previousSelectedTabIndex.value ||
      // While swiping, also reveal the neighbour the finger is dragging towards.
      (dragTranslateX.value !== 0 &&
        Math.abs(index - selectedTabIndex.value) === 1)
        ? 1
        : 0,
    transform: [
      {
        translateX:
          withTiming(Math.sign(index - selectedTabIndex.value) * WINDOW_WIDTH) +
          dragTranslateX.value,
      },
      {
        translateY: withTiming(-sizes.md * +(index !== selectedTabIndex.value)),
      },
      {
        scale: withTiming(index === selectedTabIndex.value ? 1 : 0.9),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.tab, animatedTabStyle]}>
      {rendered ? children : null}
    </Animated.View>
  );
});

type TabViewComponent = {
  (props: TabViewProps): ReactElement | null;
  Tab: React.FC<TabProps>;
};

type TabViewProps = {
  children: Array<ReactElement<TabProps>> | ReactElement<TabProps>;
};

const TabView: TabViewComponent = ({ children }: TabViewProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const childrenArray = useMemo(
    () => Children.toArray(children) as Array<ReactElement<TabPropsInternal>>,
    [children]
  );
  const tabNames = useMemo(
    () => childrenArray.map((child) => child.props.name),
    [childrenArray]
  );

  const [selectedTabName, setSelectedTabName] = useState(tabNames[0]);
  // This is used to delay rendering of other tabs until the screen transition is finished
  // (thanks to this, the screen which uses a tab view will render quicker)
  const [screenTransitionFinished, setScreenTransitionFinished] =
    useState(IS_WEB);

  const previousSelectedTabIndex = useSharedValue(0);
  const selectedTabIndex = useSharedValue(0);
  // Live horizontal offset of the finger while swiping between tabs.
  const dragTranslateX = useSharedValue(0);

  const handleSelectTab = useCallback(
    (name: string) => {
      previousSelectedTabIndex.value = selectedTabIndex.value;
      selectedTabIndex.value = tabNames.indexOf(name);
      setSelectedTabName(name);
    },
    [tabNames, previousSelectedTabIndex, selectedTabIndex]
  );

  const numberOfTabs = tabNames.length;

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(numberOfTabs > 1)
        .activeOffsetX([-SWIPE_ACTIVATION_DISTANCE, SWIPE_ACTIVATION_DISTANCE])
        .failOffsetY([-SWIPE_FAIL_DISTANCE, SWIPE_FAIL_DISTANCE])
        .onUpdate((event) => {
          const atStart = selectedTabIndex.value === 0;
          const atEnd = selectedTabIndex.value === numberOfTabs - 1;
          const overscrolling =
            (atStart && event.translationX > 0) ||
            (atEnd && event.translationX < 0);
          dragTranslateX.value = overscrolling
            ? event.translationX * EDGE_RESISTANCE
            : event.translationX;
        })
        .onEnd((event) => {
          const current = selectedTabIndex.value;
          const goNext =
            (-event.translationX > SWIPE_DISTANCE_THRESHOLD ||
              -event.velocityX > SWIPE_VELOCITY_THRESHOLD) &&
            current < numberOfTabs - 1;
          const goPrev =
            (event.translationX > SWIPE_DISTANCE_THRESHOLD ||
              event.velocityX > SWIPE_VELOCITY_THRESHOLD) &&
            current > 0;

          const target = goNext ? current + 1 : goPrev ? current - 1 : current;

          if (target !== current) {
            // Retarget the slide on the UI thread so it continues seamlessly
            // from the finger position, then sync the React state.
            previousSelectedTabIndex.value = current;
            selectedTabIndex.value = target;
            scheduleOnRN(setSelectedTabName, tabNames[target]);
          }
          dragTranslateX.value = withTiming(0);
        }),
    [
      numberOfTabs,
      tabNames,
      dragTranslateX,
      previousSelectedTabIndex,
      selectedTabIndex,
    ]
  );

  useEffect(() => {
    if (IS_WEB) {
      return;
    }
    return navigation.addListener('transitionEnd', () => {
      setScreenTransitionFinished(true);
    });
  }, [navigation]);

  return (
    <>
      <View style={styles.tabBar}>
        <TabSelector
          selectedTab={selectedTabName}
          tabs={tabNames}
          onSelectTab={handleSelectTab}
        />
      </View>
      <GestureDetector gesture={swipeGesture}>
        <View style={flex.fill}>
          {childrenArray.map((child, index) =>
            cloneElement(child, {
              dragTranslateX,
              index,
              key: index,
              previousSelectedTabIndex,
              rendered: index === 0 || screenTransitionFinished,
              selectedTabIndex,
            })
          )}
        </View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  tab: {
    ...(StyleSheet.absoluteFill as object),
  },
  tabBar: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { height: spacing.xs, width: 0 },
    shadowOpacity: 0.05,
    zIndex: 1,
  },
});

TabView.Tab = Tab as unknown as React.FC<TabProps>;

export default TabView;
