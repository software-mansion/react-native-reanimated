import {
  Children,
  cloneElement,
  type PropsWithChildren,
  type ReactElement,
  useMemo,
} from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/core';
import { colors, flex, radius, spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TabProps = PropsWithChildren<{
  name: string;
}>;

type TabPropsInternal = {
  index: number;
  selectedTabIndex: SharedValue<number>;
  onSelectTab: (index: number) => void;
} & Omit<TabProps, 'children'>;

function Tab({ index, name, onSelectTab, selectedTabIndex }: TabPropsInternal) {
  const progress = useDerivedValue(() =>
    withTiming(index === selectedTabIndex.value ? 1 : 0)
  );

  const animatedTabStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.background1, colors.background2]
    ),
  }));

  const animatedTabTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.primary, colors.primaryDark]
    ),
  }));

  return (
    <AnimatedPressable
      style={[styles.tab, animatedTabStyle]}
      onPress={() => onSelectTab(index)}>
      <Text variant="label1">
        <Animated.Text style={animatedTabTextStyle}>{name}</Animated.Text>
      </Text>
    </AnimatedPressable>
  );
}

type TabPanelComponent = {
  (props: TabPanelProps): ReactElement | null;
  Tab: React.FC<TabProps>;
};

type TabPanelProps = {
  onSelectTab: (index: number) => void;
  selectedTabIndex: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: Array<ReactElement<TabProps>> | ReactElement<TabProps>;
};

const TabPanel: TabPanelComponent = ({
  children,
  contentContainerStyle,
  onSelectTab,
  selectedTabIndex,
}: TabPanelProps) => {
  const childrenArray = useMemo(
    () => Children.toArray(children) as Array<ReactElement<TabProps>>,
    [children]
  );
  const tabContents = useMemo(
    () => childrenArray.map((child) => child.props.children),
    [childrenArray]
  );

  const animatedSelectedTabIndex = useDerivedValue(() => selectedTabIndex);

  return (
    <Animated.View layout={LinearTransition}>
      <View style={flex.row}>
        {childrenArray.map((child, index) =>
          cloneElement(child as ReactElement<TabPropsInternal>, {
            index,
            key: index,
            onSelectTab,
            selectedTabIndex: animatedSelectedTabIndex,
          })
        )}
      </View>
      <View
        style={[
          styles.outerContentContainer,
          selectedTabIndex === 0 && {
            borderTopLeftRadius: 0,
          },
        ]}>
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          key={selectedTabIndex}
          style={contentContainerStyle}>
          {tabContents[selectedTabIndex]}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContentContainer: {
    backgroundColor: colors.background2,
    borderRadius: radius.md,
  },
  tab: {
    backgroundColor: colors.background3,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});

TabPanel.Tab = Tab as unknown as React.FC<TabProps>;

export default TabPanel;
