import React, { useEffect } from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
  ReduceMotion,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

interface Props {
  options: {
    numberOfReps: number;
    reverse: boolean;
    reduceMotion: ReduceMotion;
  };
}

export default function App({ options }: Props) {
  const offset = useSharedValue(0);
  const [running, setRunning] = React.useState(false);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: offset.value }],
    };
  });

  useEffect(() => {
    cancelAnimation(offset);
    offset.value = 0;
  }, [options]);

  const handlePress = () => {
    if (running) {
      cancelAnimation(offset);
      setRunning(false);
      return;
    }

    setRunning(true);
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(200, { duration: 1000 }),
      options.numberOfReps,
      options.reverse,
      () => setRunning(false),
      options.reduceMotion
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.wrapper]}>
        <Animated.View style={[styles.box, animatedStyles]} />
      </View>
      <View style={styles.buttonWrapper}>
        <Button onPress={handlePress} title={running ? 'Stop' : 'Start'} />
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
    marginTop: 64,
    marginBottom: 34,
  },
  wrapper: {
    flex: 1,
    width: 300,
  },
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    cursor: 'grab',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
