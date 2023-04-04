import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedSensor,
  SensorType,
  withTiming,
} from 'react-native-reanimated';
import {
  View,
  StyleSheet,
  Text,
  Switch,
  TextInput,
  StatusBar,
} from 'react-native';
import React, { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';

const primaryColor = '#FFD61E';
const secondaryColor = '#f5f5f5';
const backgroundColor = '#232736';
const secondaryBackgroundColor = '#1B2445';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
Animated.addWhitelistedNativeProps({ text: true });

const AnimatedSlider = Animated.createAnimatedComponent(Slider);
Animated.addWhitelistedNativeProps({ value: true });

export default function VolumeExample() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLargeTitle: true,
      headerTransparent: false,
      headerTitle: 'Volume',
      headerStyle: {
        backgroundColor,
      },
      headerLargeTitleStyle: {
        color: '#f7f7ff',
        fontFamily: 'Poppins-Bold',
      },
    });
  }, [navigation]);

  const sv = useSharedValue(50);

  const animatedSensor = useAnimatedSensor(SensorType.GRAVITY);

  const animatedProps = useAnimatedProps(() => {
    const sensor = animatedSensor.sensor.value.x * 8 + 50;

    sv.value = sensor < 0 ? 0 : sensor > 100 ? 100 : sensor;

    return {
      text: String(Math.floor(sv.value)),
      value: withTiming(sensor, { duration: 100 }),
      // Here we use any because the text prop is not available in the type
    } as any;
  });

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor,
        padding: 20,
      }}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.valueContainer, styles.margin]}>
        {/* Thanks William, this is brilliant ✨ https://github.com/wcandillon/react-native-redash/blob/master/src/ReText.tsx ✨ */}
        <AnimatedTextInput
          style={styles.value}
          value={String(Math.round(sv.value))}
          editable={false}
          {...{ animatedProps }}
        />
      </View>
      <View style={[styles.row, styles.center, styles.margin]}>
        <Text style={styles.text}>0</Text>
        <AnimatedSlider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          minimumTrackTintColor={primaryColor}
          maximumTrackTintColor={secondaryColor}
          thumbImage={require('./assets/doge.png')}
          {...{ animatedProps }}
        />
        <Text style={styles.text}>100</Text>
      </View>
      <View style={[styles.row, styles.between, styles.margin]}>
        <Text style={styles.text}>Change with buttons</Text>
        <Switch
          trackColor={{ false: secondaryBackgroundColor, true: primaryColor }}
          thumbColor={secondaryColor}
          ios_backgroundColor={secondaryBackgroundColor}
          value={true}
        />
      </View>
      <View style={styles.divider} />
      <Text style={[styles.header, styles.margin]}>Streaming quality</Text>
      <Text style={styles.text}>Automatic</Text>
      <Text style={styles.text}>Low</Text>
      <Text style={styles.text}>Normal</Text>
      <Text style={styles.text}>High</Text>
      <Text style={styles.text}>Very high</Text>
      <View style={styles.margin} />
      <View style={[styles.row, styles.between, styles.margin]}>
        <Text style={styles.text}>Adjust audio quality</Text>
        <Switch
          trackColor={{ false: secondaryBackgroundColor, true: primaryColor }}
          thumbColor={secondaryColor}
          ios_backgroundColor={secondaryBackgroundColor}
          value={true}
        />
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    color: secondaryColor,
    fontSize: 16,
    padding: 4,
    fontFamily: 'Poppins-Regular',
  },
  row: {
    flexDirection: 'row',
  },
  margin: {
    marginBottom: 16,
  },
  between: {
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slider: {
    height: 40,
    alignSelf: 'center',
    flex: 1,
  },
  valueContainer: {
    backgroundColor: secondaryColor,
    borderRadius: 16,
    borderWidth: 1,
    width: 170,
    height: 120,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  value: {
    textAlign: 'center',
    // fontFamily: 'Poppins-Bold',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    fontSize: 70,
    color: backgroundColor,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: secondaryColor,
    marginTop: 16,
    marginBottom: 32,
  },
  header: {
    fontSize: 24,
    color: secondaryColor,
    fontFamily: 'Poppins-Bold',
  },
  subHeader: {
    fontSize: 24,
    color: secondaryColor,
    fontFamily: 'Poppins-Bold',
  },
});
