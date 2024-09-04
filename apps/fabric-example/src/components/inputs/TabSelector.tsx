import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolateColor,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, flex, radius, spacing } from '../../theme';
import { typedMemo } from '../../utils';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

type TabSelectorProps<T extends string> = {
  tabs: Readonly<Array<T>>;
  selectedTab: T;
  onSelectTab: (tab: T) => void;
};

export default function TabSelector<T extends string>({
  onSelectTab,
  selectedTab,
  tabs,
}: TabSelectorProps<T>) {
  const tabWidth = useSharedValue(0);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    opacity: tabWidth.value > 0 ? 1 : 0,
    transform: [
      { translateX: withTiming(tabWidth.value * tabs.indexOf(selectedTab)) },
    ],
    width: tabWidth.value,
  }));

  const animatedTabStyle = useAnimatedStyle(() => ({
    width: tabWidth.value === 0 ? 'auto' : tabWidth.value,
  }));

  const handleMeasureWidth = useCallback(
    (width: number) => {
      runOnUI(() => {
        tabWidth.value = Math.max(tabWidth.value, width);
      })();
    },
    [tabWidth]
  );

  return (
    <View style={flex.center}>
      <View style={styles.tabBar}>
        <Animated.View
          style={[styles.selectedTabIndicator, animatedIndicatorStyle]}
        />
        {tabs.map((tab) => (
          <Tab
            isSelected={tab === selectedTab}
            key={tab}
            style={animatedTabStyle}
            tab={tab}
            onMeasureWidth={handleMeasureWidth}
            onSelectTab={onSelectTab}
          />
        ))}
      </View>
    </View>
  );
}

type TabProps<T> = {
  isSelected: boolean;
  tab: T;
  style: ViewStyle;
  onSelectTab: (tab: T) => void;
  onMeasureWidth: (width: number) => void;
};

const Tab = typedMemo(function Tab<T extends string>({
  isSelected,
  onMeasureWidth,
  onSelectTab,
  style,
  tab,
}: TabProps<T>) {
  const animationProgress = useDerivedValue(() => withTiming(+isSelected));

  const animatedTabTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      animationProgress.value,
      [0, 1],
      [colors.foreground1, colors.white]
    ),
  }));

  return (
    <AnimatedTouchableOpacity
      hitSlop={spacing.md}
      key={tab}
      style={[styles.tab, style]}
      onPress={() => onSelectTab(tab)}
      onLayout={({ nativeEvent: { layout } }) => {
        onMeasureWidth(layout.width);
      }}>
      <Animated.Text style={[styles.tabText, animatedTabTextStyle]}>
        {tab}
      </Animated.Text>
    </AnimatedTouchableOpacity>
  );
});

const styles = StyleSheet.create({
  selectedTabIndicator: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: '100%',
    position: 'absolute',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: colors.background1,
    borderRadius: radius.full,
    flexDirection: 'row',
  },
  tabText: {
    color: colors.foreground1,
    fontWeight: 'bold',
    padding: spacing.sm,
  },
});
