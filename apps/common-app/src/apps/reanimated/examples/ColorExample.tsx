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

  const style1 = useAnimatedStyle(() => {
    return { backgroundColor: makeColor(sv.value) };
  });

  const style2 = useAnimatedStyle(() => {
    return { borderColor: makeColor(sv.value) };
  });

  const style3 = useAnimatedStyle(() => {
    return { color: makeColor(sv.value) };
  });

  const style4 = useAnimatedStyle(() => {
    return {
      boxShadow: '20px 20px 5px 0px ' + makeColor(sv.value),
    };
  });

  const style5 = useAnimatedStyle(() => {
    return { tintColor: makeColor(sv.value) };
  });

  const styleTextShadow = useAnimatedStyle(() => {
    return {
      textShadowColor: makeColor(sv.value),
      textShadowOffset: { width: 3, height: 3 },
      textShadowRadius: 2,
    };
  });

  const styleTextDecoration = useAnimatedStyle(() => {
    return {
      textDecorationLine: 'underline',
      textDecorationColor: makeColor(sv.value),
      fontSize: 30,
      fontWeight: '600',
    };
  });


  // TODO: overlayColor
  
  const handleToggle = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1500 });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.box1, style1]} />
      <Animated.View style={[styles.box2, style2]} />
      <Animated.Text style={[styles.text3, style3]}>Reanimated</Animated.Text>
      <Animated.View style={[styles.box4, style4]} />
      <Animated.Image
        style={[styles.image5, style5]}
        source={require('./assets/logo.png')}
      />
       <Animated.Text style={[styleTextShadow]}>
        Text Shadow
      </Animated.Text>
      <Animated.Text style={[styleTextDecoration]}>
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
  box1: {
    width: 100,
    height: 100,
    backgroundColor: 'black',
    marginBottom: 20,
  },
  box2: {
    width: 100,
    height: 100,
    borderWidth: 10,
    borderColor: 'black',
    marginBottom: 20,
  },
  text3: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
  },
  box4: {
    width: 100,
    height: 100,
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
  image5: {
    width: 150,
    height: 120,
  },
  buttons: {
    marginTop: 20,
  },
});
