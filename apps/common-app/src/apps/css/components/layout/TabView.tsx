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
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, flex, sizes, spacing } from '@/theme';
import { IS_WEB } from '@/utils';

import TabSelector from '../inputs/TabSelector';

const WINDOW_WIDTH = Dimensions.get('screen').width;

const SWIPE_ACTIVATION_DISTANCE = 15;
const SWIPE_FAIL_DISTANCE = 15;
const SWIPE_DISTANCE_THRESHOLD = WINDOW_WIDTH * 0.2;
const SWIPE_VELOCITY_THRESHOLD = 500;
const EDGE_RESISTANCE = 0.2;
const INACTIVE_TAB_SCALE = 0.9;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

type TabProps = PropsWithChildren<{
  name: string;
}>;

type TabPropsInternal = {
  index: number;
  rendered: boolean;
  tabProgress: SharedValue<number>;
} & TabProps;

const Tab = memo(function Tab({
  children,
  index,
  rendered,
  tabProgress,
}: TabPropsInternal): ReactElement {
  const animatedTabStyle = useAnimatedStyle(() => {
    // Clamped so tabs more than one screen away stay parked off-screen rather
    // than sliding arbitrarily far during multi-tab transitions.
    const distance = clamp(index - tabProgress.value, -1, 1);
    const offset = Math.abs(distance);

    return {
      opacity: 1 - offset,
      transform: [
        { translateX: distance * WINDOW_WIDTH },
        { translateY: -sizes.md * offset },
        { scale: 1 - (1 - INACTIVE_TAB_SCALE) * offset },
      ],
    };
  });

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

  // Committed integer index; drives the tab bar and the swipe decisions.
  const selectedTabIndex = useSharedValue(0);
  // Live fractional index every tab animation reads (timing on tap/release,
  // set directly while dragging).
  const tabProgress = useSharedValue(0);
  // Captured at drag start so an interrupted settle continues from where it is.
  const dragStartProgress = useSharedValue(0);

  const handleSelectTab = useCallback(
    (name: string) => {
      const index = tabNames.indexOf(name);
      selectedTabIndex.value = index;
      tabProgress.value = withTiming(index);
      setSelectedTabName(name);
    },
    [tabNames, selectedTabIndex, tabProgress]
  );

  const numberOfTabs = tabNames.length;

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(numberOfTabs > 1)
        .activeOffsetX([-SWIPE_ACTIVATION_DISTANCE, SWIPE_ACTIVATION_DISTANCE])
        .failOffsetY([-SWIPE_FAIL_DISTANCE, SWIPE_FAIL_DISTANCE])
        .onStart(() => {
          cancelAnimation(tabProgress);
          dragStartProgress.value = tabProgress.value;
        })
        .onUpdate((event) => {
          const lastIndex = numberOfTabs - 1;
          const raw =
            dragStartProgress.value - event.translationX / WINDOW_WIDTH;
          // Rubber-band past the first / last tab.
          if (raw < 0) {
            tabProgress.value = raw * EDGE_RESISTANCE;
          } else if (raw > lastIndex) {
            tabProgress.value = lastIndex + (raw - lastIndex) * EDGE_RESISTANCE;
          } else {
            tabProgress.value = raw;
          }
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
            selectedTabIndex.value = target;
            scheduleOnRN(setSelectedTabName, tabNames[target]);
          }
          tabProgress.value = withTiming(target);
        }),
    [numberOfTabs, tabNames, tabProgress, dragStartProgress, selectedTabIndex]
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
          tabProgress={tabProgress}
          tabs={tabNames}
          onSelectTab={handleSelectTab}
        />
      </View>
      <GestureDetector gesture={swipeGesture}>
        <View style={flex.fill}>
          {childrenArray.map((child, index) =>
            cloneElement(child, {
              index,
              key: index,
              rendered: index === 0 || screenTransitionFinished,
              tabProgress,
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
