import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

const SQUARE_SIZE = 80;

export default function App() {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scale = useSharedValue(1);
  const skewX = useSharedValue('0deg');
  const skewY = useSharedValue('0deg');
  const opacity = useSharedValue(1);
  const borderRadius = useSharedValue(0);

  // Animation functions
  const animateTranslateX = () => {
    translateX.value = withSpring(translateX.value === 0 ? 100 : 0);
  };

  const animateTranslateY = () => {
    translateY.value = withSpring(translateY.value === 0 ? -100 : 0);
  };

  const animateRotation = () => {
    rotateZ.value = withTiming(rotateZ.value + 360, { duration: 1000 });
  };

  const animateScale = () => {
    scale.value = withSequence(
      withTiming(1.5, { duration: 500 }),
      withTiming(1, { duration: 500 })
    );
  };

  const animateSkewX = () => {
    skewX.value = withSpring(skewX.value === '0deg' ? '30deg' : '0deg');
  };

  const animateSkewY = () => {
    skewY.value = withSpring(skewY.value === '0deg' ? '30deg' : '0deg');
  };

  const animateOpacity = () => {
    opacity.value = withSequence(
      withTiming(0.2, { duration: 500 }),
      withTiming(1, { duration: 500 })
    );
  };

  const animateBorderRadius = () => {
    borderRadius.value = withSpring(
      borderRadius.value === 0 ? SQUARE_SIZE / 2 : 0
    );
  };

  const animateSequence = () => {
    translateX.value = withSequence(
      withTiming(50, { duration: 500 }),
      withTiming(-50, { duration: 500 }),
      withTiming(0, { duration: 500 })
    );
    rotateZ.value = withSequence(
      withTiming(180, { duration: 500 }),
      withTiming(360, { duration: 500 }),
      withTiming(0, { duration: 500 })
    );
  };

  const animateElastic = () => {
    scale.value = withSpring(scale.value === 1 ? 1.3 : 1, {
      damping: 2,
      stiffness: 100,
    });
  };

  const animateBounce = () => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-50, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
      ),
      3,
      false
    );
  };

  const resetAll = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotateZ.value = withTiming(0, { duration: 500 });
    scale.value = withSpring(1);
    skewX.value = withSpring('0deg');
    skewY.value = withSpring('0deg');
    opacity.value = withTiming(1);
    borderRadius.value = withSpring(0);
  };

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotateZ.value}deg` },
        { scale: scale.value },
        { skewX: skewX.value },
        { skewY: skewY.value },
      ],
      opacity: opacity.value,
      borderRadius: borderRadius.value,
    };
  });

  const buttons = [
    { title: 'Translate X', onPress: animateTranslateX },
    { title: 'Translate Y', onPress: animateTranslateY },
    { title: 'Rotate', onPress: animateRotation },
    { title: 'Scale', onPress: animateScale },
    { title: 'Skew X', onPress: animateSkewX },
    { title: 'Skew Y', onPress: animateSkewY },
    { title: 'Opacity', onPress: animateOpacity },
    { title: 'Border Radius', onPress: animateBorderRadius },
    { title: 'Sequence', onPress: animateSequence },
    { title: 'Elastic', onPress: animateElastic },
    { title: 'Bounce', onPress: animateBounce },
    { title: 'Reset All', onPress: resetAll },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.square, animatedStyle]} />
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Reanimated Transform Examples</Text>
        <View style={styles.buttonGrid}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={styles.button}
              onPress={button.onPress}>
              <Text style={styles.buttonText}>{button.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
