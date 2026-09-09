import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const CASES = [
  'linear color stops',
  'linear direction',
  'linear stop positions',
  'radial color stops',
  'radial position',
  'radial size',
  'multiple layers',
] as const;

type Case = (typeof CASES)[number];

const getBackgroundImage = (value: number, testCase: Case) => {
  'worklet';
  const from = interpolateColor(value, [0, 1], ['#ff0000', '#00ff00']);
  const to = interpolateColor(value, [0, 1], ['#0000ff', '#ffe600']);
  const offset = `${interpolate(value, [0, 1], [10, 90])}%`;

  switch (testCase) {
    case 'linear color stops':
      return [
        {
          type: 'linear-gradient',
          direction: 'to right',
          colorStops: [{ color: from }, { color: to }],
        },
      ] as const;
    case 'linear direction':
      return [
        {
          type: 'linear-gradient',
          direction: `${interpolate(value, [0, 1], [0, 360])}deg`,
          colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
        },
      ] as const;
    case 'linear stop positions':
      return [
        {
          type: 'linear-gradient',
          direction: 'to right',
          colorStops: [
            { color: '#ff0000', positions: ['0%'] },
            { color: '#0000ff', positions: [offset] },
            { color: '#ffe600', positions: ['100%'] },
          ],
        },
      ] as const;
    case 'radial color stops':
      return [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-corner',
          position: { top: '50%', left: '50%' },
          colorStops: [{ color: from }, { color: to }],
        },
      ] as const;
    case 'radial position':
      return [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-side',
          position: { top: '50%', left: offset },
          colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
        },
      ] as const;
    case 'radial size':
      return [
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: { x: offset, y: '50%' },
          position: { top: '50%', left: '50%' },
          colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
        },
      ] as const;
    case 'multiple layers':
      return [
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'closest-side',
          position: { top: '50%', left: offset },
          colorStops: [{ color: '#ffffff' }, { color: 'transparent' }],
        },
        {
          type: 'linear-gradient',
          direction: 'to bottom',
          colorStops: [{ color: from }, { color: to }],
        },
      ] as const;
  }
};

function BackgroundImageItem({
  progress,
  testCase,
}: {
  progress: SharedValue<number>;
  testCase: Case;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundImage: getBackgroundImage(progress.value, testCase),
  }));

  return (
    <View style={styles.item}>
      <Text style={styles.itemTitle}>{testCase}</Text>
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

export default function BackgroundImageExample() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);

  return (
    <ScrollView contentContainerStyle={styles.contentContainer}>
      {CASES.map((testCase) => (
        <BackgroundImageItem
          key={testCase}
          progress={progress}
          testCase={testCase}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 25,
    gap: 8,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#001a72',
    fontSize: 14,
    marginTop: 15,
  },
  box: {
    width: 220,
    height: 70,
    borderRadius: 10,
  },
});
