import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedRef,
  getRelativeCoords,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import useThemedTextStyle from '@site/src/hooks/useThemedTextStyle';

const RelativeCoords = () => {
  const animatedRef = useAnimatedRef();
  const textColor = useThemedTextStyle();
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const tapGesture = Gesture.Tap().onEnd((event) => {
    const relativeCoords = getRelativeCoords(
      animatedRef,
      event.absoluteX,
      event.absoluteY
    );
    if (relativeCoords) {
      setCoords(relativeCoords);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.coordsData, textColor]}>
        Relative coordinates to parent:
      </Text>
      <Text style={[styles.coordsData, styles.coords, textColor]}>
        x={coords.x.toFixed()} y=
        {coords.y.toFixed()}
      </Text>
      <GestureDetector gesture={tapGesture}>
        <Animated.View ref={animatedRef} style={styles.innerView}>
          <Text style={styles.text}>Tap anywhere inside.</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerView: {
    width: 300,
    height: 300,
    backgroundColor: 'var(--swm-purple-light-80)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    cursor: 'pointer',
  },
  coordsData: {
    fontSize: 20,
    fontFamily: 'Aeonik',
    color: 'var(--swm-navy-light-100)',
  },
  coords: {
    marginBottom: 16,
    fontWeight: '500',
  },
  text: {
    color: 'var(--swm-off-white)',
    fontFamily: 'Aeonik',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RelativeCoords;
