import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const SIZE = 180;

export default function App() {
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  const onLayout = (event) => {
    width.value = event.nativeEvent.layout.width;
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      offset.value += event.changeX;
    })
    .onFinalize((event) => {
      offset.value = withDecay({
        velocity: event.velocityX,
        rubberBandEffect: true,
        clamp: [-(width.value / 2) + SIZE / 2, width.value / 2 - SIZE / 2],
      });
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <View onLayout={onLayout} style={styles.wrapper}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.grab, animatedStyles]}>
            <Train />
          </Animated.View>
        </GestureDetector>
        <TrainTracks />
      </View>
    </GestureHandlerRootView>
  );
}

function TrainTracks() {
  return (
    <View style={{ flexDirection: 'column' }}>
      <View style={styles.rail} />
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: 20 }).map((_, i) => {
          return <View key={i} style={styles.track} />;
        })}
      </View>
    </View>
  );
}

function Train() {
  return (
    <View style={styles.column}>
      <View style={styles.row}>
        <View style={styles.back} />
        <View style={styles.chimney} />
      </View>
      <View style={styles.row}>
        <View style={styles.body} />
        <View style={styles.front} />
      </View>
      <View style={styles.stripe} />
      <View style={styles.underbody} />
      <View style={styles.row}>
        <View style={styles.wheel} />
        <View style={styles.wheel} />
        <View style={styles.wheel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  wrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grab: {
    cursor: 'grab',
  },
  text: {
    color: 'white',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  wheel: {
    height: 50,
    width: 50,
    backgroundColor: '#537FE7',
    borderRadius: 50,
    marginHorizontal: 5,
  },
  underbody: {
    width: SIZE,
    height: 30,
    backgroundColor: 'black',
    top: 30,
  },
  stripe: {
    width: SIZE,
    height: 10,
    backgroundColor: 'red',
    top: 30,
  },
  front: {
    width: 50,
    height: 50,
    backgroundColor: 'black',
    top: 30,
  },
  body: {
    width: 130,
    height: 50,
    backgroundColor: '#537FE7',
    top: 30,
  },
  chimney: {
    width: 20,
    height: 30,
    backgroundColor: 'black',
    top: 30,
    right: 15,
    marginLeft: 'auto',
  },
  back: {
    width: 50,
    height: 15,
    backgroundColor: '#537FE7',
    top: 30 + 15,
  },
  track: {
    height: 10,
    width: 20,
    backgroundColor: '#B8621B',
    marginHorizontal: 15,
  },
  rail: {
    width: '100%',
    height: 10,
    backgroundColor: 'gray',
  },
});
