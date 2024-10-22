import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../theme';
import { typedMemo } from '../../utils';
import { Text } from '../core';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

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

  const gradient = useMemo(
    () => (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
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
          <Rect x="0" y="0" height="100%" width="100%" fill="url(#gradient)" />
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
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={({
          nativeEvent: {
            layout: { width },
          },
        }) => {
          containerWidth.value = width;
        }}>
        <Animated.View style={{ width: paddingBefore }} />
        <View style={styles.tabs}>
          {tabs.map((tab, index) => (
            <Tab
              key={tab}
              selected={tab === selectedTab}
              onPress={() => onSelectTab(tab)}
              onMeasure={runOnUI((width) => {
                tabWidths.value[index] = width;
                tabWidths.value = [...tabWidths.value];
              })}
              title={tab}
            />
          ))}
        </View>
        <Animated.View style={{ width: paddingAfter }} />
      </Animated.ScrollView>
      {gradient}
      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={() => onSelectTab(tabs[Math.max(activeTabIndex - 1, 0)])}
          disabled={prevDisabled}
          hitSlop={spacing.md}
          style={prevDisabled && styles.disabledButton}>
          <FontAwesomeIcon icon={faChevronLeft} color={colors.foreground3} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            onSelectTab(tabs[Math.min(activeTabIndex + 1, tabs.length - 1)])
          }
          disabled={nextDisabled}
          hitSlop={spacing.md}
          style={nextDisabled && styles.disabledButton}>
          <FontAwesomeIcon icon={faChevronRight} color={colors.foreground3} />
        </TouchableOpacity>
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

function Tab({ title, onPress, selected, onMeasure }: TabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, selected && styles.activeTab]}
      onLayout={({
        nativeEvent: {
          layout: { width },
        },
      }) => onMeasure(width)}>
      <Text variant="label2" style={selected && styles.activeTabText}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    gap: TABS_GAP,
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  activeTabText: {
    color: colors.white,
  },
  buttons: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default typedMemo(TabSelector);
