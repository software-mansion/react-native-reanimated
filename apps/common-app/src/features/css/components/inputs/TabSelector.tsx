import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

import { colors, radius, spacing } from '@/theme';
import { typedMemo } from '@/utils';

import Text from '../core/Text';

const TABS_GAP = spacing.xxxs;

type TabSelectorProps<T extends string> = {
  tabs: Readonly<Array<T>>;
  selectedTab: T;
  onSelectTab: (tab: T) => void;
};

function TabSelector<T extends string>({
  onSelectTab,
  selectedTab,
  tabs,
}: TabSelectorProps<T>) {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

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

  const activeTabIndex = useMemo(
    () => tabs.indexOf(selectedTab),
    [tabs, selectedTab]
  );

  useEffect(() => {
    runOnUI(() => {
      const offset = tabWidths.value
        .slice(0, activeTabIndex)
        .reduce(
          (acc, width, index) =>
            acc + (width + (tabWidths.value[index + 1] ?? 0)) / 2 + TABS_GAP,
          0
        );
      scrollTo(scrollViewRef, offset, 0, true);
    })();
  }, [activeTabIndex, scrollViewRef, tabWidths]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(+(containerWidth.value > 0)),
  }));

  const paddingBeforeAnimatedStyle = useAnimatedStyle(() => ({
    width: paddingBefore.value,
  }));

  const paddingAfterAnimatedStyle = useAnimatedStyle(() => ({
    width: paddingAfter.value,
  }));

  const gradient = useMemo(
    () => (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg>
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
          {tabs.map((tab, index) => (
            <Tab
              key={tab}
              selected={tab === selectedTab}
              title={tab}
              onPress={() => onSelectTab(tab)}
              onMeasure={runOnUI((width) => {
                tabWidths.value[index] = width;
                tabWidths.value = [...tabWidths.value];
              })}
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
  selected: boolean;
  onPress: () => void;
  onMeasure: (width: number) => void;
};

function Tab({ onMeasure, onPress, selected, title }: TabProps) {
  return (
    <Pressable
      style={[styles.tab, selected && styles.activeTab]}
      onPress={onPress}
      onLayout={({
        nativeEvent: {
          layout: { width },
        },
      }) => onMeasure(width)}>
      <Text style={selected && styles.activeTabText} variant="label2">
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: colors.primary,
  },
  activeTabText: {
    color: colors.white,
  },
  buttons: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  disabledButton: {
    opacity: 0.5,
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
