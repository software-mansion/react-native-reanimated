import React, { useEffect } from 'react';
import { DynamicColorIOS, StyleSheet, Text, View } from 'react-native';
import Animated, {
  DynamicColorIOSAnimated,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const LIGHT_COLORS = ['#38acdd', '#57b495'];
const DARK_COLORS = ['#b58df1', '#ff6259'];

const Swatches = ({ colors, label }: { colors: any; label: string }) => {
  return (
    <>
      <Text style={styles.paragraph}>{label}</Text>
      <View style={styles.swatchesContainer}>
        <View style={[styles.swatch, { backgroundColor: colors[0] }]} />
        <View style={[styles.swatch, { backgroundColor: colors[1] }]} />
      </View>
    </>
  );
};

const Description = () => {
  return (
    <>
      <Text style={styles.header}>What is DynamicColorIOS?</Text>
      <Text style={styles.paragraph}>
        DynamicColorIOS is a way to define colors that automatically adapt to
        light and dark mode on iOS.{' '}
      </Text>
      <Text style={styles.header}>What this example does?</Text>
      <Text style={styles.paragraph}>
        This example should interpolate between two colors. After toggling
        appearance of the phone the two interpolated colors should change to
        adequate dark version. The interpolate should not affect other
        animations.
      </Text>
    </>
  );
};

export default function DynamicColorIOSExample() {
  const progress = useSharedValue(0);
  const width = useSharedValue(100);
  const backgroundColor = DynamicColorIOS({
    light: '#E3E6EA',
    dark: '#2a2a2a',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      progress.value = withTiming(progress.value === 0 ? 1 : 0);
      width.value = withTiming(width.value === 100 ? 200 : 100);
    }, 2000);
    return () => clearInterval(interval);
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => {
    const lightColor = interpolateColor(progress.value, [0, 1], LIGHT_COLORS);
    const darkColor = interpolateColor(progress.value, [0, 1], DARK_COLORS);

    return {
      width: width.value,
      backgroundColor: DynamicColorIOSAnimated({
        light: lightColor,
        dark: darkColor,
      }),
    };
  });

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: backgroundColor,
      }}>
      <View style={styles.contentContainer}>
        <Description />
        <Swatches colors={LIGHT_COLORS} label={'Light mode colors'} />
        <Swatches colors={DARK_COLORS} label={'Dark mode colors'} />
      </View>
      <View>
        <Animated.View style={[styles.box, animatedStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: DynamicColorIOS({ light: '#001a72', dark: '#f8f9ff' }),
    fontFamily: 'Poppins',
  },
  paragraph: {
    color: DynamicColorIOS({ light: '#001a72', dark: '#f8f9ff' }),
    marginBottom: 10,
    fontFamily: 'Poppins',
  },
  swatchesContainer: {
    flexDirection: 'row',
    gap: '10',
    width: '100%',
  },
  swatch: {
    height: 30,
    width: 30,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DynamicColorIOS({ light: 'white', dark: '#35427C' }),
    padding: 16,
    borderRadius: 10,
  },
  box: {
    height: 100,
    width: 100,
  },
});
