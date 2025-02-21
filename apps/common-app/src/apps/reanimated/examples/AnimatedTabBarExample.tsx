import * as shape from 'd3-shape';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const tabs = [
  {
    name: 'coffee',
    item: '☕️',
  },
  {
    name: 'list',
    item: '📝',
  },
  {
    name: 'reply',
    item: '🔁',
  },
  {
    name: 'trash',
    item: '🗑',
  },
  {
    name: 'user',
    item: '👤',
  },
];

const tabWidth = width / tabs.length;

const getPath = () => {
  const tab = shape.line().curve(shape.curveBasis)([
    [0, 0],
    [tabWidth / 4, 0],
    [tabWidth / 2, 8],
    [tabWidth, 80],
    [(tabWidth / 2) * 3, 8],
    [(tabWidth / 4) * 7, 0],
    [tabWidth * 2, 0],
  ]);
  return `${tab}`;
};
const d = getPath();

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
    zIndex: 2,
  },
  tabs: {
    position: 'absolute',
    left: -tabWidth,
  },
  activeIcon: {
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIcon: {
    position: 'absolute',
    width: tabWidth,
    top: -8,
    left: tabWidth / 2,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  emoji: {
    fontSize: 25,
  },
});

type ButtonProps = {
  item: string;
  index: number;
  activeIndex: Animated.SharedValue<number>;
  width: number;
  position: number;
  readonly indicatorPosition: Animated.SharedValue<number>;
};
function Button({
  item,
  index,
  activeIndex,
  width,
  position,
  indicatorPosition,
}: ButtonProps) {
  const staticIconStyle = useAnimatedStyle(() => {
    const visibility = interpolate(
      indicatorPosition.value,
      [
        position - width / 2,
        position - width / 8,
        position + width / 8,
        position + width / 2,
      ],
      [1, 0, 0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: visibility,
      transform: [{ translateY: 10 * (1 - visibility) }],
    };
  });

  return (
    <TouchableWithoutFeedback onPress={() => (activeIndex.value = index)}>
      <View style={styles.tab}>
        <Animated.View style={staticIconStyle}>
          <Text style={styles.emoji}>{item}</Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

type ActiveIconProps = {
  item: string;
  index: number;
  activeIndex: Animated.SharedValue<number>;
  width: number;
};
function ActiveIcon({ item, index, activeIndex }: ActiveIconProps) {
  const circleIconStyle = useAnimatedStyle(() => {
    const isActive = index === activeIndex.value;
    const yOffset = isActive ? 0 : 80;
    return {
      transform: [
        {
          translateY: withDelay(isActive ? 150 : 0, withTiming(yOffset)),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.circleIcon, circleIconStyle]}>
      <View style={styles.activeIcon}>
        <Text style={styles.emoji}>{item}</Text>
      </View>
    </Animated.View>
  );
}

function Bar() {
  const activeIndex = useSharedValue(0);

  const indicatorPosition = useDerivedValue(() => {
    return withTiming(activeIndex.value * tabWidth + tabWidth / 2, {
      duration: 500,
    });
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorPosition.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.tabs, indicatorStyle]}>
        {tabs.map((tab, index) => (
          <ActiveIcon
            index={index}
            activeIndex={activeIndex}
            item={tab.item}
            width={tabWidth}
            key={`fg-${index}`}
          />
        ))}
        <Svg width={tabWidth * 2} height={64}>
          <Path fill="red" {...{ d }} />
        </Svg>
      </Animated.View>
      {tabs.map((tab, index) => {
        const position = tabWidth * index + tabWidth / 2; // item center
        return (
          <Button
            index={index}
            activeIndex={activeIndex}
            item={tab.item}
            width={tabWidth}
            indicatorPosition={indicatorPosition}
            position={position}
            key={`bg-${index}`}
          />
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    width,
    height,
    flex: 1,
    backgroundColor: 'red',
  },
  dummyPusher: {
    flex: 1,
    height: 300,
  },
});

export default function AnimatedTabBarExample() {
  return (
    <View style={tabBarStyles.container}>
      <View style={tabBarStyles.dummyPusher} />
      <Bar />
    </View>
  );
}
