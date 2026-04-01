/**
 * Core Animation Prototype Examples
 *
 * Tests CSS animations routing through Core Animation on iOS.
 * All animations here use Tier A/B properties (opacity, transform,
 * backgroundColor, cornerRadius) which should be driven by CA
 * instead of per-frame C++ interpolation.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { createCSSAnimatedComponent, css } from 'react-native-reanimated';

const AnimatedView = createCSSAnimatedComponent(View);

// Example 1: Simple opacity fade (CABasicAnimation — 2 keyframes)
function OpacityFade() {
  return (
    <View style={localStyles.section}>
      <Text style={localStyles.label}>Opacity Fade (2kf, ease-in-out)</Text>
      <AnimatedView style={animStyles.opacityFade} />
    </View>
  );
}

// Example 2: Opacity pulse with 3 keyframes (CAKeyframeAnimation)
function OpacityPulse() {
  return (
    <View style={localStyles.section}>
      <Text style={localStyles.label}>Opacity Pulse (3kf, linear)</Text>
      <AnimatedView style={animStyles.opacityPulse} />
    </View>
  );
}

// Example 3: Background color animation (Tier B)
function BackgroundColorAnim() {
  return (
    <View style={localStyles.section}>
      <Text style={localStyles.label}>Background Color</Text>
      <AnimatedView style={animStyles.bgColor} />
    </View>
  );
}

// Example 4: Mixed — opacity (CA) + width (C++ loop) in same animation
function MixedAnimation() {
  return (
    <View style={localStyles.section}>
      <Text style={localStyles.label}>Mixed: opacity(CA) + width(loop)</Text>
      <AnimatedView style={animStyles.mixed} />
    </View>
  );
}

// Example 5: Opacity with fill-mode forwards
function OpacityFillForwards() {
  return (
    <View style={localStyles.section}>
      <Text style={localStyles.label}>Opacity fill-forwards (stops at 0.2)</Text>
      <AnimatedView style={animStyles.opacityFillForwards} />
    </View>
  );
}

// Example 6: Multiple opacity boxes with different easings
function OpacityEasings() {
  return (
    <View style={localStyles.section}>
      <Text style={localStyles.label}>Opacity Easings Comparison</Text>
      <View style={localStyles.row}>
        <View style={localStyles.easingBox}>
          <Text style={localStyles.easingLabel}>linear</Text>
          <AnimatedView style={animStyles.opacityLinear} />
        </View>
        <View style={localStyles.easingBox}>
          <Text style={localStyles.easingLabel}>ease</Text>
          <AnimatedView style={animStyles.opacityEase} />
        </View>
        <View style={localStyles.easingBox}>
          <Text style={localStyles.easingLabel}>ease-in</Text>
          <AnimatedView style={animStyles.opacityEaseIn} />
        </View>
        <View style={localStyles.easingBox}>
          <Text style={localStyles.easingLabel}>ease-out</Text>
          <AnimatedView style={animStyles.opacityEaseOut} />
        </View>
      </View>
    </View>
  );
}

export default function EmptyExample() {
  return (
    <ScrollView
      contentContainerStyle={localStyles.container}
      showsVerticalScrollIndicator={false}>
      <Text style={localStyles.title}>Core Animation Prototype</Text>
      <OpacityFade />
      <OpacityPulse />
      <BackgroundColorAnim />
      <MixedAnimation />
      <OpacityFillForwards />
      <OpacityEasings />
    </ScrollView>
  );
}

const animStyles = css.create({
  opacityFade: {
    width: 80,
    height: 80,
    backgroundColor: 'dodgerblue',
    animationName: css.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0.1 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  opacityPulse: {
    width: 80,
    height: 80,
    backgroundColor: 'tomato',
    animationName: css.keyframes({
      0: { opacity: 1 },
      0.5: { opacity: 0.2 },
      1: { opacity: 1 },
    }),
    animationDuration: '1.5s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  bgColor: {
    width: 80,
    height: 80,
    animationName: css.keyframes({
      0: { backgroundColor: 'red' },
      0.33: { backgroundColor: 'green' },
      0.66: { backgroundColor: 'blue' },
      1: { backgroundColor: 'red' },
    }),
    animationDuration: '3s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  mixed: {
    height: 80,
    backgroundColor: 'mediumpurple',
    animationName: css.keyframes({
      from: { opacity: 1, width: 80 },
      to: { opacity: 0.3, width: 200 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  opacityFillForwards: {
    width: 80,
    height: 80,
    backgroundColor: 'seagreen',
    animationName: css.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0.2 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'ease-out',
    animationIterationCount: 1,
    animationFillMode: 'forwards',
  },
  opacityLinear: {
    width: 50,
    height: 50,
    backgroundColor: 'coral',
    animationName: css.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0.1 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  opacityEase: {
    width: 50,
    height: 50,
    backgroundColor: 'coral',
    animationName: css.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0.1 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'ease',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  opacityEaseIn: {
    width: 50,
    height: 50,
    backgroundColor: 'coral',
    animationName: css.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0.1 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'ease-in',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  opacityEaseOut: {
    width: 50,
    height: 50,
    backgroundColor: 'coral',
    animationName: css.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0.1 },
    }),
    animationDuration: '2s',
    animationTimingFunction: 'ease-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
});

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  easingBox: {
    alignItems: 'center',
  },
  easingLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
});
