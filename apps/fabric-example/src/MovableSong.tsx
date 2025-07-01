import React, { useState } from 'react';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SONG_HEIGHT } from './config';
import { Song } from './Song';
import { ScrollDirection } from './types';
import { clamp, objectMove } from './utilities';

export function MovableSong({
  id,
  artist,
  cover,
  title,
  positions,
  containerHeight,
  lowerBound,
  autoScrollDirection,
  songsCount,
}: {
  id: string;
  artist: string;
  cover: string;
  title: string;
  containerHeight: number;
  positions: SharedValue<{ [id: string]: number }>;
  lowerBound: SharedValue<number>;
  autoScrollDirection: SharedValue<ScrollDirection>;
  songsCount: number;
}) {
  const [moving, setMoving] = useState(false);
  const positionY = useSharedValue(positions.value[id] * SONG_HEIGHT);
  const top = useSharedValue(positions.value[id] * SONG_HEIGHT);
  const upperBound = useDerivedValue(() => lowerBound.value + containerHeight);
  const targetLowerBound = useSharedValue(lowerBound.value);

  useAnimatedReaction(
    () => positionY.value,
    (positionYValue, previousValue) => {
      if (
        positionYValue !== null &&
        previousValue !== null &&
        positionYValue !== previousValue
      ) {
        console.log(
          `positionY changed. ${
            previousValue ?? ''
          } ${positionYValue} id: ${id}`
        );
        if (moving) {
          top.value = positionYValue;
          setPosition(positionYValue, songsCount, positions, id);
          setAutoScroll(
            positionYValue,
            lowerBound.value,
            upperBound.value,
            SONG_HEIGHT,
            autoScrollDirection
          );
        }
      }
    }
  );

  // If another item is moving and changes this ones position, move to new position.
  useAnimatedReaction(
    () => positions.value[id],
    (currentPosition, previousPosition) => {
      if (
        currentPosition !== null &&
        previousPosition !== null &&
        currentPosition !== previousPosition
      ) {
        console.log(
          `positions.value[id] changed. ${
            previousPosition ?? ''
          } ${currentPosition} id: ${id}`
        );
        if (!moving) {
          top.value = withSpring(currentPosition * SONG_HEIGHT);
        }
      }
    },
    [moving]
  );

  // If moving and scrolling, update position y.
  useAnimatedReaction(
    () => lowerBound.value,
    (currentLowerBound, previousLowerBound) => {
      if (
        currentLowerBound !== null &&
        previousLowerBound !== null &&
        currentLowerBound !== previousLowerBound &&
        moving
      ) {
        console.log(
          `lowerBound changed. ${
            previousLowerBound ?? ''
          } ${currentLowerBound} id: ${id}`
        );
        const diff = previousLowerBound - currentLowerBound;
        positionY.value -= diff;
      }
    },
    [moving]
  );

  // When the autoScrollDirection changes, set the target lower bound with timing.
  useAnimatedReaction(
    () => autoScrollDirection.value,
    (scrollDirection, previousValue) => {
      if (
        scrollDirection !== null &&
        previousValue !== null &&
        scrollDirection !== previousValue
      ) {
        console.log(
          `scrollDirection changed: ${
            previousValue ?? ''
          } ${scrollDirection} id: ${id}`
        );
        switch (scrollDirection) {
          case ScrollDirection.Up: {
            targetLowerBound.value = lowerBound.value;
            targetLowerBound.value = withTiming(0, { duration: 1500 });
            break;
          }
          case ScrollDirection.Down: {
            const contentHeight = songsCount * SONG_HEIGHT;
            const maxScroll = contentHeight - containerHeight;

            targetLowerBound.value = lowerBound.value;
            targetLowerBound.value = withTiming(maxScroll, { duration: 1500 });
            break;
          }
          case ScrollDirection.None: {
            targetLowerBound.value = lowerBound.value;
            break;
          }
        }
      }
    }
  );

  // When the target lower bound changes, update the lower bound value.
  useAnimatedReaction(
    () => targetLowerBound.value,
    (targetLowerBoundValue, previousValue) => {
      if (
        targetLowerBoundValue !== null &&
        previousValue !== null &&
        targetLowerBoundValue !== previousValue
      ) {
        console.log(
          `targetLowerBound changed. ${
            previousValue ?? ''
          } ${targetLowerBoundValue} id: ${id}`
        );
        if (moving) {
          lowerBound.value = targetLowerBoundValue;
        }
      }
    }
  );

  const gestureHandler = useAnimatedGestureHandler({
    onStart() {
      positionY.value = positions.value[id] * SONG_HEIGHT;
      runOnJS(setMoving)(true);
    },
    onActive(event) {
      positionY.value = event.absoluteY + lowerBound.value - SONG_HEIGHT;
    },
    onFinish() {
      const finishPosition = positions.value[id] * SONG_HEIGHT;
      top.value = withTiming(finishPosition);
      runOnJS(setMoving)(false);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: top.value,
      zIndex: moving ? 1 : 0,
      shadowColor: 'black',
      shadowOpacity: withSpring(moving ? 0.2 : 0),
      shadowRadius: 10,
    };
  }, [moving]);

  return (
    <Animated.View style={animatedStyle}>
      <View>
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={{ maxWidth: '80%' }}>
            <Song artist={artist} cover={cover} title={title} />
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Animated.View>
  );
}
function setPosition(
  positionY: number,
  songsCount: number,
  positions: SharedValue<{ [id: string]: number }>,
  id: string
) {
  'worklet';
  const newPosition = clamp(
    Math.floor(positionY / SONG_HEIGHT),
    0,
    songsCount - 1
  );

  if (newPosition !== positions.value[id]) {
    positions.value = objectMove(
      positions.value,
      positions.value[id],
      newPosition
    );
  }
}

function setAutoScroll(
  positionY: number,
  lowerBound: number,
  upperBound: number,
  scrollThreshold: number,
  autoScroll: SharedValue<ScrollDirection>
) {
  'worklet';
  if (positionY <= lowerBound + scrollThreshold) {
    autoScroll.value = ScrollDirection.Up;
  } else if (positionY >= upperBound - scrollThreshold) {
    autoScroll.value = ScrollDirection.Down;
  } else {
    autoScroll.value = ScrollDirection.None;
  }
}
