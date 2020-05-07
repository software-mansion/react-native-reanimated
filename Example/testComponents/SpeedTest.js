import React from 'react';
import { View, Dimensions } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  Worklet,
  useSharedValue,
  useWorklet,
} from 'react-native-reanimated';

const workletBody = new Worklet(function(x, width, duration) {
  'worklet';
  const memory = Reanimated.memory(this);
  const now = Date.now();
  if (this.justStarted) {
    memory.startTime = now;
  }
  let delta = now - memory.startTime;
  let shouldEnd = false;
  if (delta > duration.value) {
    shouldEnd = true;
    delta = duration.value;
  }
  x.set((delta / duration.value) * width.value - width.value);

  if (shouldEnd) {
    return true;
  }
});

const SpeedTest = () => {
  const worklets = [];
  const numberOfSquares = 10;
  const width = useSharedValue(Dimensions.get('window').width * 0.95);

  let currKey = 0;
  const createAnimatedSquare = (height, x) => {
    return (
      <Animated.View
        style={{
          width: width,
          height: height,
          backgroundColor: 'black',
          marginBottom: 1,
          transform: [{ translateX: x }],
        }}
      />
    );
  };

  let squares = [];

  const duration = useSharedValue(1200);

  for (var i = 0; i < numberOfSquares; ++i) {
    const x = useSharedValue(0);

    worklets.push(useWorklet(workletBody, [x, width, duration]));
    squares.push(
      createAnimatedSquare(
        Dimensions.get('window').height / (numberOfSquares * 1.5),
        x
      )
    );
  }

  useEffect(() => {
    for (let worklet of worklets) {
      worklet();
    }
  }, []);

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      {squares.map(item => (
        <View key={currKey++}>{item}</View>
      ))}
    </View>
  );
};

export default SpeedTest;
