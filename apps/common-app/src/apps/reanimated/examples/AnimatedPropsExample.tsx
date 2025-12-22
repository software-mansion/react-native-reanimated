import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Shared constants
const ANIMATION_DURATION = 500;
const CIRCLE_SIZE = 100;
const CIRCLE_RADIUS = 40;
const INITIAL_X = CIRCLE_SIZE / 2; // 50 - top-left area
const INITIAL_Y = CIRCLE_SIZE / 2; // 50 - top-left area
const FINAL_X = 180; // 180 - bottom-right area (50 from right edge, matching 50 from left initially)
const FINAL_Y = 180; // 180 - bottom-right area (50 from bottom edge, matching 50 from top initially)
const SVG_SIZE = FINAL_X + CIRCLE_SIZE / 2; // 230
const PROPS_ATTACH_OFFSET = 50; // Offset applied when animated props are first attached

function TestSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string[];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.testSection}>
      <Text>{title}</Text>
      {description.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
      {children}
    </View>
  );
}

function AnimatedCircleWrapper({
  animatedProps,
  testID,
}: {
  animatedProps?: React.ComponentProps<typeof AnimatedCircle>['animatedProps'];
  testID?: string;
}) {
  return (
    <View style={styles.svgContainer} testID={testID}>
      <Svg height={SVG_SIZE} width={SVG_SIZE}>
        <AnimatedCircle
          cx={INITIAL_X}
          cy={INITIAL_Y}
          r={CIRCLE_RADIUS}
          fill="blue"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

function Test1SingleInitial() {
  const sv = useSharedValue(0);
  const [isAnimated, setIsAnimated] = useState(false);
  const animatedProps = useAnimatedProps(() => ({
    cx: INITIAL_X + sv.value * (FINAL_X - INITIAL_X),
    cy: INITIAL_Y + sv.value * (FINAL_Y - INITIAL_Y),
  }));

  return (
    <View style={styles.testContainer} testID="test-1-container">
      <AnimatedCircleWrapper
        animatedProps={animatedProps}
        testID="test-1-circle"
      />
      <Button
        title="Animate"
        disabled={isAnimated}
        testID="test-1-animate-button"
        onPress={() => {
          sv.value = withTiming(1, { duration: ANIMATION_DURATION });
          setIsAnimated(true);
        }}
      />
    </View>
  );
}

function Test2SingleDelayed() {
  const sv = useSharedValue(0);
  const [hasAnimatedProps, setHasAnimatedProps] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const animatedProps = useAnimatedProps(() => ({
    cx:
      INITIAL_X +
      PROPS_ATTACH_OFFSET +
      sv.value * (FINAL_X - INITIAL_X - PROPS_ATTACH_OFFSET),
    cy:
      INITIAL_Y +
      PROPS_ATTACH_OFFSET +
      sv.value * (FINAL_Y - INITIAL_Y - PROPS_ATTACH_OFFSET),
  }));

  return (
    <View style={styles.testContainer} testID="test-2-container">
      <AnimatedCircleWrapper
        animatedProps={hasAnimatedProps ? animatedProps : undefined}
        testID="test-2-circle"
      />
      <Button
        title="Attach Animated Props"
        disabled={hasAnimatedProps}
        testID="test-2-attach-button"
        onPress={() => setHasAnimatedProps(true)}
      />
      {hasAnimatedProps && (
        <Button
          title="Animate"
          disabled={isAnimated}
          testID="test-2-animate-button"
          onPress={() => {
            sv.value = withTiming(1, { duration: ANIMATION_DURATION });
            setIsAnimated(true);
          }}
        />
      )}
    </View>
  );
}

function Test3MultipleInitial() {
  const sv = useSharedValue(0);
  const [isAnimated, setIsAnimated] = useState(false);
  const animatedPropsCx = useAnimatedProps(() => ({
    cx: INITIAL_X + sv.value * (FINAL_X - INITIAL_X),
  }));
  const animatedPropsCy = useAnimatedProps(() => ({
    cy: INITIAL_Y + sv.value * (FINAL_Y - INITIAL_Y),
  }));

  return (
    <View style={styles.testContainer} testID="test-3-container">
      <AnimatedCircleWrapper
        animatedProps={[animatedPropsCx, animatedPropsCy]}
        testID="test-3-circle"
      />
      <Button
        title="Animate"
        disabled={isAnimated}
        testID="test-3-animate-button"
        onPress={() => {
          sv.value = withTiming(1, { duration: ANIMATION_DURATION });
          setIsAnimated(true);
        }}
      />
    </View>
  );
}

function Test4MultipleMixedTiming() {
  const svCx = useSharedValue(0);
  const svCy = useSharedValue(0);
  const [showCyProps, setShowCyProps] = useState(false);
  const [isCxAnimated, setIsCxAnimated] = useState(false);
  const [isCyAnimated, setIsCyAnimated] = useState(false);

  const animatedPropsCx = useAnimatedProps(() => ({
    cx: INITIAL_X + svCx.value * (FINAL_X - INITIAL_X),
  }));
  const animatedPropsCy = useAnimatedProps(() => ({
    cy:
      INITIAL_Y +
      PROPS_ATTACH_OFFSET +
      svCy.value * (FINAL_Y - INITIAL_Y - PROPS_ATTACH_OFFSET),
  }));

  return (
    <View style={styles.testContainer} testID="test-4-container">
      <AnimatedCircleWrapper
        animatedProps={
          showCyProps ? [animatedPropsCx, animatedPropsCy] : animatedPropsCx
        }
        testID="test-4-circle"
      />
      <Button
        title="Animate Horizontal"
        disabled={isCxAnimated}
        testID="test-4-animate-horizontal-button"
        onPress={() => {
          svCx.value = withTiming(1, { duration: ANIMATION_DURATION });
          setIsCxAnimated(true);
        }}
      />
      <Button
        title="Attach Vertical Props"
        disabled={showCyProps}
        testID="test-4-attach-vertical-button"
        onPress={() => setShowCyProps(true)}
      />
      {showCyProps && (
        <Button
          title="Animate Vertical"
          disabled={isCyAnimated}
          testID="test-4-animate-vertical-button"
          onPress={() => {
            svCy.value = withTiming(1, { duration: ANIMATION_DURATION });
            setIsCyAnimated(true);
          }}
        />
      )}
    </View>
  );
}

export default function EmptyExample() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TestSection
        title="Test 1: Single Animated Props (Initial)"
        description={[
          'Initial: Circle in top-left area of gray container',
          "Click 'Animate': Circle moves to bottom-right area",
        ]}>
        <Test1SingleInitial />
      </TestSection>

      <TestSection
        title="Test 2: Single Animated Props (Delayed)"
        description={[
          'Initial: Circle in top-left area without animated props',
          "Click 'Attach Animated Props': Circle moves slightly right and down (props attached)",
          "Click 'Animate': Circle moves to bottom-right area",
        ]}>
        <Test2SingleDelayed />
      </TestSection>

      <TestSection
        title="Test 3: Multiple Animated Props (Initial)"
        description={[
          'Initial: Circle in top-left area of gray container',
          "Click 'Animate': Circle moves to bottom-right area",
        ]}>
        <Test3MultipleInitial />
      </TestSection>

      <TestSection
        title="Test 4: Multiple Animated Props (Separate Objects)"
        description={[
          'Initial: Circle in top-left area of gray container',
          "Click 'Animate Horizontal': Circle moves to right side",
          "Click 'Attach Vertical Props': Circle moves slightly down (props attached)",
          "Click 'Animate Vertical': Circle moves to bottom-right area",
        ]}>
        <Test4MultipleMixedTiming />
      </TestSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  testSection: {
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
  },
  testContainer: {
    alignItems: 'center',
    gap: 15,
  },
  svgContainer: {
    backgroundColor: '#cccccc',
    padding: 10,
  },
});
