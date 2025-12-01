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
  withRepeat,
  Easing,
} from 'react-native-reanimated';

const SQUARE_SIZE = 80;

interface Props {
  onBack: () => void;
}

export default function MarginAnimations({ onBack }: Props) {
  // Margin-specific animation values
  const margin = useSharedValue(0);
  const marginTop = useSharedValue(0);
  const marginBottom = useSharedValue(0);
  const marginLeft = useSharedValue(0);
  const marginRight = useSharedValue(0);
  const marginHorizontal = useSharedValue(0);
  const marginVertical = useSharedValue(0);

  // Padding animation values
  const padding = useSharedValue(10);
  const paddingTop = useSharedValue(10);
  const paddingBottom = useSharedValue(10);
  const paddingLeft = useSharedValue(10);
  const paddingRight = useSharedValue(10);

  // Animation functions
  const animateMargin = () => {
    margin.value = withSpring(margin.value === 0 ? 20 : 0);
  };

  const animateMarginTop = () => {
    marginTop.value = withSpring(marginTop.value === 0 ? 40 : 0);
  };

  const animateMarginBottom = () => {
    marginBottom.value = withSpring(marginBottom.value === 0 ? 40 : 0);
  };

  const animateMarginLeft = () => {
    marginLeft.value = withSpring(marginLeft.value === 0 ? 40 : 0);
  };

  const animateMarginRight = () => {
    marginRight.value = withSpring(marginRight.value === 0 ? 40 : 0);
  };

  const animateMarginHorizontal = () => {
    marginHorizontal.value = withSpring(marginHorizontal.value === 0 ? 30 : 0);
  };

  const animateMarginVertical = () => {
    marginVertical.value = withSpring(marginVertical.value === 0 ? 30 : 0);
  };

  const animatePadding = () => {
    padding.value = withSpring(padding.value === 10 ? 30 : 10);
  };

  const animatePaddingTop = () => {
    paddingTop.value = withSpring(paddingTop.value === 10 ? 30 : 10);
  };

  const animatePaddingBottom = () => {
    paddingBottom.value = withSpring(paddingBottom.value === 10 ? 30 : 10);
  };

  const animatePaddingLeft = () => {
    paddingLeft.value = withSpring(paddingLeft.value === 10 ? 30 : 10);
  };

  const animatePaddingRight = () => {
    paddingRight.value = withSpring(paddingRight.value === 10 ? 30 : 10);
  };

  const animateMarginWave = () => {
    marginTop.value = withSequence(
      withTiming(30, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
    marginRight.value = withSequence(
      withTiming(0, { duration: 300 }),
      withTiming(30, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
    marginBottom.value = withSequence(
      withTiming(0, { duration: 600 }),
      withTiming(30, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
    marginLeft.value = withSequence(
      withTiming(0, { duration: 900 }),
      withTiming(30, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
  };

  const animateBreathing = () => {
    const breathe = () => {
      padding.value = withSequence(
        withTiming(30, { duration: 1500, easing: Easing.inOut(Easing.sine) }),
        withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.sine) })
      );
    };

    padding.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 1500, easing: Easing.inOut(Easing.sine) }),
        withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.sine) })
      ),
      3,
      false
    );
  };

  const resetAll = () => {
    margin.value = withSpring(0);
    marginTop.value = withSpring(0);
    marginBottom.value = withSpring(0);
    marginLeft.value = withSpring(0);
    marginRight.value = withSpring(0);
    marginHorizontal.value = withSpring(0);
    marginVertical.value = withSpring(0);
    padding.value = withSpring(10);
    paddingTop.value = withSpring(10);
    paddingBottom.value = withSpring(10);
    paddingLeft.value = withSpring(10);
    paddingRight.value = withSpring(10);
  };

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      margin: margin.value,
      marginTop: marginTop.value,
      marginBottom: marginBottom.value,
      marginLeft: marginLeft.value,
      marginRight: marginRight.value,
      marginHorizontal: marginHorizontal.value,
      marginVertical: marginVertical.value,
      padding: padding.value,
      paddingTop: paddingTop.value,
      paddingBottom: paddingBottom.value,
      paddingLeft: paddingLeft.value,
      paddingRight: paddingRight.value,
    };
  });

  const buttons = [
    { title: 'Margin', onPress: animateMargin },
    { title: 'Margin Top', onPress: animateMarginTop },
    { title: 'Margin Bottom', onPress: animateMarginBottom },
    { title: 'Margin Left', onPress: animateMarginLeft },
    { title: 'Margin Right', onPress: animateMarginRight },
    { title: 'Margin H', onPress: animateMarginHorizontal },
    { title: 'Margin V', onPress: animateMarginVertical },
    { title: 'Padding', onPress: animatePadding },
    { title: 'Padding Top', onPress: animatePaddingTop },
    { title: 'Padding Bottom', onPress: animatePaddingBottom },
    { title: 'Padding Left', onPress: animatePaddingLeft },
    { title: 'Padding Right', onPress: animatePaddingRight },
    { title: 'Margin Wave', onPress: animateMarginWave },
    { title: 'Breathing', onPress: animateBreathing },
    { title: 'Reset All', onPress: resetAll },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <View style={styles.boundaryBox}>
          <Animated.View style={[styles.square, animatedStyle]} />
        </View>
      </View>

      <ScrollView
        style={styles.buttonsContainer}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Margin & Padding Animations</Text>
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
  boundaryBox: {
    width: 200,
    height: 200,
    backgroundColor: '#ecf0f1',
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  square: {
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
    backgroundColor: '#8e44ad',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
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
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
