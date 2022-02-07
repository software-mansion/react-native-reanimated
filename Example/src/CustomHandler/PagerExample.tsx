import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import PagerView, { PageScrollState } from 'react-native-pager-view';

import { AnimatedText } from './AnimatedText';
import { Pagination } from './Pagination';
import {
  useAnimatedPagerScrollHandler,
  useAnimatedPagerScrollStateHandler,
  useAnimatedPagerSelectedPageHandler,
} from './useAnimatedPagerHandler';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const SLIDES = [
  { color: 'red', key: 1 },
  { color: 'blue', key: 2 },
  { color: 'yellow', key: 3 },
  { color: 'green', key: 4 },
  { color: 'pink', key: 5 },
];

export function PagerExample(): React.ReactElement {
  const scrollPosition = useSharedValue(0);
  const scrollState = useSharedValue<PageScrollState>('idle');
  const currentPage = useSharedValue(0);
  const stringifiedCurrentPage = useDerivedValue(() => {
    return `${currentPage.value + 1}`;
  });
  const scrollHandler = useAnimatedPagerScrollHandler({
    onPageScroll: (e) => {
      'worklet';
      scrollPosition.value = e.offset + e.position;
    },
  });
  const scrollStateHandler = useAnimatedPagerScrollStateHandler({
    onPageScrollStateChanged: (e) => {
      'worklet';
      scrollState.value = e.pageScrollState;
    },
  });
  const selectedPageHandler = useAnimatedPagerSelectedPageHandler({
    onPageSelected: (e) => {
      'worklet';
      currentPage.value = e.position;
    },
  });
  return (
    <View style={styles.container}>
      <Pagination numberOfSlides={SLIDES.length} position={scrollPosition} />
      <View style={styles.pagerDetails}>
        <AnimatedText
          style={styles.pagerDetailsText}
          text={stringifiedCurrentPage}
        />
        <AnimatedText style={styles.pagerDetailsText} text={scrollState} />
      </View>
      <AnimatedPagerView
        initialPage={0}
        onPageScroll={scrollHandler}
        onPageScrollStateChanged={scrollStateHandler}
        onPageSelected={selectedPageHandler}
        orientation="horizontal"
        style={styles.pager}>
        {SLIDES.map((slide) => (
          <View
            key={slide.key}
            collapsable={false}
            style={[styles.slide, { backgroundColor: slide.color }]}>
            <Text style={styles.slideText}>{slide.key}</Text>
          </View>
        ))}
      </AnimatedPagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  pager: {
    alignSelf: 'stretch',
    flex: 1,
  },
  pagerDetails: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  pagerDetailsText: {
    color: 'black',
    fontSize: 20,
  },
  slide: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  slideText: {
    color: 'white',
    fontSize: 24,
  },
});
