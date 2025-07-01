import React from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SONG_HEIGHT } from './config';
import { SONGS } from './data';
import { MovableSong } from './MovableSong';
import { ScrollDirection } from './types';
import { listToObject } from './utilities';

export default function SortableList() {
  const positions = useSharedValue(listToObject(SONGS));
  const scrollY = useSharedValue(0);
  const autoScroll = useSharedValue(ScrollDirection.None);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useAnimatedReaction(
    () => scrollY.value,
    (scrolling) => {
      scrollTo(scrollViewRef, 0, scrolling, false);
    }
  );

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const containerHeight = dimensions.height - insets.top - insets.bottom;
  const contentHeight = SONGS.length * SONG_HEIGHT;

  return (
    <>
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: 'white',
        }}
        contentContainerStyle={{
          height: contentHeight,
        }}>
        {SONGS.map((song) => (
          <MovableSong
            key={song.id}
            id={song.id}
            artist={song.artist}
            cover={song.cover}
            title={song.title}
            positions={positions}
            lowerBound={scrollY}
            autoScrollDirection={autoScroll}
            songsCount={SONGS.length}
            containerHeight={containerHeight}
          />
        ))}
      </Animated.ScrollView>
    </>
  );
}
