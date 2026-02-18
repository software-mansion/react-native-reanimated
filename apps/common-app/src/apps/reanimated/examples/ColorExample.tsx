import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

function makeColor(x: number) {
  'worklet';
  return `hsl(${Math.round(x * 240)}, 100%, 50%)`;
}

export default function ColorExample() {
  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const animatedBgColor = useAnimatedStyle(() => {
    return { backgroundColor: makeColor(sv.value) };
  });

  const animatedBorderColor = useAnimatedStyle(() => {
    return { borderColor: makeColor(sv.value) };
  });

  const animatedTextColor = useAnimatedStyle(() => {
    return { color: makeColor(sv.value) };
  });

  const animatedBoxShadow = useAnimatedStyle(() => {
    return {
      boxShadow: '20px 20px 5px 0px ' + makeColor(sv.value),
    };
  });

  const animatedTintColor = useAnimatedStyle(() => {
    return { tintColor: makeColor(sv.value) };
  });

  const animatedTextShadowColor = useAnimatedStyle(() => {
    return { textShadowColor: makeColor(sv.value) };
  });

  const animatedTextDecorationColor = useAnimatedStyle(() => {
    return { textDecorationColor: makeColor(sv.value) };
  });

  // TODO: overlayColor
  
  const handleToggle = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1500 });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box, animatedBgColor]} />
      <Animated.View style={[styles.box, styles.borderBox, animatedBorderColor]} />
      <Animated.Text style={[styles.bigText, animatedTextColor]}>Reanimated</Animated.Text>
      <Animated.View style={[styles.box, styles.shadowBox, animatedBoxShadow]} />
      <Animated.Image
        style={[styles.image, animatedTintColor]}
        source={require('./assets/logo.png')}
      />
       <Animated.Text style={[styles.textShadowStyle, animatedTextShadowColor]}>
        Text Shadow
      </Animated.Text>
      <Animated.Text style={[styles.textDecorationStyle, animatedTextDecorationColor]}>
        Text Decoration
      </Animated.Text>
      <View style={styles.buttons}>
        <Button onPress={handleToggle} title="Toggle shared value" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'black',
    marginBottom: 20,
  },
  borderBox: {
    borderWidth: 10,
    borderColor: 'black',
  },
  bigText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
  },
  shadowBox: {
    backgroundColor: 'lightgray',
    shadowOffset: {
      width: 20,
      height: 20,
    },
    shadowRadius: 5,
    shadowOpacity: 1,
    shadowColor: 'black',
    elevation: 20,
    marginBottom: 50,
  },
  image: {
    width: 150,
    height: 120,
  },
  textShadowStyle: {
    fontSize: 30,
    fontWeight: '600',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 2,
    marginBottom: 20,
  },
  textDecorationStyle: {
    fontSize: 30,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  buttons: {
    marginTop: 20,
  },
});