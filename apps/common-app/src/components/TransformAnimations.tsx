import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

const SQUARE_SIZE = 80;

interface Props {
  onBack: () => void;
}

export default function TransformAnimations({ onBack }: Props) {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scale = useSharedValue(1);
  const skewX = useSharedValue('0deg');
  const skewY = useSharedValue('0deg');
  const opacity = useSharedValue(1);

  // Additional animation values
  const backgroundColor = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.25);
  const width = useSharedValue(SQUARE_SIZE);

  // React Native Animated API value
  const rnBorderRadius = useRef(new RNAnimated.Value(0)).current;
  const [rnBorderRadiusToggle, setRnBorderRadiusToggle] = useState(false);

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

  // New essential animations
  const animateBackgroundColor = () => {
    backgroundColor.value = withTiming(backgroundColor.value === 0 ? 1 : 0, {
      duration: 800,
    });
  };

  const animateShadow = () => {
    shadowOpacity.value = withSpring(shadowOpacity.value === 0.25 ? 0.8 : 0.25);
  };

  const animateWidth = () => {
    width.value = withSpring(
      width.value === SQUARE_SIZE ? SQUARE_SIZE * 1.5 : SQUARE_SIZE
    );
  };

  // React Native Animated API animation
  const animateRNBorderRadius = () => {
    const toValue = rnBorderRadiusToggle ? 0 : 40;
    setRnBorderRadiusToggle(!rnBorderRadiusToggle);
    RNAnimated.timing(rnBorderRadius, {
      toValue,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const resetAll = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotateZ.value = withTiming(0, { duration: 500 });
    scale.value = withSpring(1);
    skewX.value = withSpring('0deg');
    skewY.value = withSpring('0deg');
    opacity.value = withTiming(1);
    backgroundColor.value = withTiming(0);
    shadowOpacity.value = withSpring(0.25);
    width.value = withSpring(SQUARE_SIZE);
    // Reset RN Animated value
    rnBorderRadius.setValue(0);
    setRnBorderRadiusToggle(false);
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
      backgroundColor: interpolateColor(
        backgroundColor.value,
        [0, 1],
        ['#3498db', '#e74c3c']
      ),
      shadowOpacity: shadowOpacity.value,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      shadowColor: '#000',
      width: width.value,
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
    { title: 'Background', onPress: animateBackgroundColor },
    { title: 'Shadow', onPress: animateShadow },
    { title: 'Width', onPress: animateWidth },
    { title: 'Sequence', onPress: animateSequence },
    { title: 'Elastic', onPress: animateElastic },
    { title: 'Bounce', onPress: animateBounce },
    { title: 'Reset All', onPress: resetAll },
  ];

  // Red button for RN Animated
  const rnButton = {
    title: 'RN Border Radius',
    onPress: animateRNBorderRadius,
  };

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.View style={[styles.square, animatedStyle]} />
        <RNAnimated.View
          style={[styles.rnSquare, { borderRadius: rnBorderRadius }]}
        />
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transform & Basic Animations</Text>
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

        <Text style={styles.sectionTitle}>React Native Animated API</Text>
        <TouchableOpacity
          style={[styles.button, styles.redButton]}
          onPress={rnButton.onPress}>
          <Text style={styles.buttonText}>{rnButton.title}</Text>
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  rnSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: '#9b59b6',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
    color: '#2c3e50',
  },
  backButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  redButton: {
    backgroundColor: '#e74c3c',
    width: '100%',
  },
});
