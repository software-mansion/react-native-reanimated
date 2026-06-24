import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { ComponentRef } from 'react';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  interpolateColor,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { scheduleOnUI } from 'react-native-worklets';

import { colors, radius, spacing } from '@/theme';
import { typedMemo } from '@/utils';

import Text from '../core/Text';

const TABS_GAP = spacing.xxxs;
// Extra horizontal stretch applied to the selection pill mid-travel (peaks
// halfway between two tabs, settles back to 1 when resting on a tab).
const PILL_SQUASH = 0.12;

type TabSelectorProps<T extends string> = {
  tabs: Readonly<Array<T>>;
  selectedTab: T;
  // Live, fractional tab index driving the sliding selection pill.
  tabProgress: SharedValue<number>;
  onSelectTab: (tab: T) => void;
};

function TabSelector<T extends string>({
  onSelectTab,
  selectedTab,
  tabProgress,
  tabs,
}: TabSelectorProps<T>) {
  const scrollViewRef = useAnimatedRef<ComponentRef<Animated.ScrollView>>();

  const containerWidth = useSharedValue(0);
  const tabWidths = useSharedValue<Array<number>>([]);
  const paddingBefore = useDerivedValue(
    () => (containerWidth.value - (tabWidths.value[0] ?? 0)) / 2
  );
  const paddingAfter = useDerivedValue(
    () =>
      (containerWidth.value -
        (tabWidths.value[tabWidths.value.length - 1] ?? 0)) /
      2
  );

  const tabCount = tabs.length;
  // True once every tab has reported its width, so the pill can be positioned.
  const widthsReady = useDerivedValue(
    () =>
      tabWidths.value.length === tabCount &&
      tabWidths.value.every((width) => width > 0)
  );

  const activeTabIndex = useMemo(
    () => tabs.indexOf(selectedTab),
    [tabs, selectedTab]
  );

  useEffect(() => {
    scheduleOnUI(() => {
      const offset = tabWidths.value
        .slice(0, activeTabIndex)
        .reduce(
          (acc, width, index) =>
            acc + (width + (tabWidths.value[index + 1] ?? 0)) / 2 + TABS_GAP,
          0
        );
      scrollTo(scrollViewRef, offset, 0, true);
    });
  }, [activeTabIndex, scrollViewRef, tabWidths]);

  // Keep the whole selector hidden until the tabs are measured, so the active
  // label never flashes white-on-white before the pill behind it can render.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(+(containerWidth.value > 0 && widthsReady.value)),
  }));

  const paddingBeforeAnimatedStyle = useAnimatedStyle(() => ({
    width: paddingBefore.value,
  }));

  const paddingAfterAnimatedStyle = useAnimatedStyle(() => ({
    width: paddingAfter.value,
  }));

  const pillAnimatedStyle = useAnimatedStyle(() => {
    // Always return the same set of keys so a not-ready -> ready (or back)
    // transition can never leave a stale width / transform applied.
    if (!widthsReady.value) {
      return {
        opacity: 0,
        transform: [{ translateX: 0 }, { scaleX: 1 }],
        width: 0,
      };
    }
    const widths = tabWidths.value;

    const lastIndex = tabCount - 1;
    // Geometry stays within the valid tab range while the content rubber-bands.
    const progress = Math.min(Math.max(tabProgress.value, 0), lastIndex);
    const from = Math.floor(progress);
    const to = Math.min(from + 1, lastIndex);
    const fraction = progress - from;

    let offsetFrom = 0;
    for (let index = 0; index < from; index++) {
      offsetFrom += widths[index] + TABS_GAP;
    }
    const offsetTo =
      from === to ? offsetFrom : offsetFrom + widths[from] + TABS_GAP;

    const centerFrom = offsetFrom + widths[from] / 2;
    const centerTo = offsetTo + widths[to] / 2;
    const center = centerFrom + (centerTo - centerFrom) * fraction;
    const width = widths[from] + (widths[to] - widths[from]) * fraction;

    // 0 when resting on a tab, 1 at the midpoint between two tabs.
    const transit = 1 - Math.abs(2 * fraction - 1);

    return {
      opacity: 1,
      transform: [
        { translateX: center - width / 2 },
        { scaleX: 1 + PILL_SQUASH * transit },
      ],
      width,
    };
  });

  const gradient = useMemo(
    () => (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg>
          {/* TODO: Fix me */}
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801 */}
          <Defs>
            <LinearGradient id="tab-selector" x1="0" x2="1" y1="0" y2="0">
              <Stop
                offset="0.05"
                stopColor={colors.background1}
                stopOpacity="1"
              />
              <Stop
                offset="0.15"
                stopColor={colors.background1}
                stopOpacity="0"
              />
              <Stop
                offset="0.85"
                stopColor={colors.background1}
                stopOpacity="0"
              />
              <Stop
                offset="0.95"
                stopColor={colors.background1}
                stopOpacity="1"
              />
            </LinearGradient>
          </Defs>
          <Rect
            fill="url(#tab-selector)"
            height="100%"
            width="100%"
            x="0"
            y="0"
          />
        </Svg>
      </View>
    ),
    []
  );

  const prevDisabled = activeTabIndex === 0;
  const nextDisabled = activeTabIndex === tabs.length - 1;

  return (
    <Animated.View style={animatedStyle}>
      <Animated.ScrollView
        ref={scrollViewRef}
        showsHorizontalScrollIndicator={false}
        horizontal
        onLayout={({
          nativeEvent: {
            layout: { width },
          },
        }) => {
          containerWidth.value = width;
        }}>
        <Animated.View style={paddingBeforeAnimatedStyle} />
        <View style={styles.tabs}>
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, pillAnimatedStyle]}
          />
          {tabs.map((tab, index) => (
            <Tab
              index={index}
              key={tab}
              tabProgress={tabProgress}
              title={tab}
              onPress={() => onSelectTab(tab)}
              onMeasure={(widthArg) =>
                scheduleOnUI((width) => {
                  tabWidths.value[index] = width;
                  tabWidths.value = [...tabWidths.value];
                }, widthArg)
              }
            />
          ))}
        </View>
        <Animated.View style={paddingAfterAnimatedStyle} />
      </Animated.ScrollView>
      {gradient}
      <View style={styles.buttons}>
        <Pressable
          disabled={prevDisabled}
          hitSlop={spacing.md}
          style={prevDisabled && styles.disabledButton}
          onPress={() => onSelectTab(tabs[Math.max(activeTabIndex - 1, 0)])}>
          <FontAwesomeIcon color={colors.foreground3} icon={faChevronLeft} />
        </Pressable>
        <Pressable
          disabled={nextDisabled}
          hitSlop={spacing.md}
          style={nextDisabled && styles.disabledButton}
          onPress={() =>
            onSelectTab(tabs[Math.min(activeTabIndex + 1, tabs.length - 1)])
          }>
          <FontAwesomeIcon color={colors.foreground3} icon={faChevronRight} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

type TabProps = {
  title: string;
  index: number;
  tabProgress: SharedValue<number>;
  onPress: () => void;
  onMeasure: (width: number) => void;
};

function Tab({ index, onMeasure, onPress, tabProgress, title }: TabProps) {
  const animatedTextStyle = useAnimatedStyle(() => {
    // 1 when the pill fully covers this tab, 0 once a full tab away.
    const coverage = Math.min(
      Math.max(1 - Math.abs(index - tabProgress.value), 0),
      1
    );
    return {
      color: interpolateColor(
        coverage,
        [0, 1],
        [colors.foreground2, colors.white]
      ),
    };
  });

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onLayout={({
        nativeEvent: {
          layout: { width },
        },
      }) => onMeasure(width)}>
      <Text variant="label2">
        <Animated.Text style={animatedTextStyle}>{title}</Animated.Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttons: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  tab: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    gap: TABS_GAP,
  },
});

export default typedMemo(TabSelector);
