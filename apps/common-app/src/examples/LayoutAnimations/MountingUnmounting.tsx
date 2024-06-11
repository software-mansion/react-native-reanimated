import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
} from 'react-native-reanimated';
import { Button, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';

const AnimatedText = Animated.createAnimatedComponent(Text);

function SWMLogo() {
  return (
    <View>
      <Animated.View
        entering={SlideInRight.delay(300)}
        exiting={SlideOutLeft.delay(300)}
        style={styles.left}
      />
      <Animated.View
        entering={SlideInDown}
        exiting={SlideOutUp}
        style={styles.top}
      />
      <Animated.View
        entering={SlideInLeft}
        exiting={SlideOutRight}
        style={styles.animatedView}>
        <AnimatedText
          entering={FadeIn.delay(600).duration(3000)}
          exiting={FadeOut.duration(3000)}>
          SWM
        </AnimatedText>
      </Animated.View>
    </View>
  );
}

export default function MountingUnmounting() {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.columnReverse}>
      <Button
        title="toggle"
        onPress={() => {
          setShow((last) => !last);
        }}
      />
      <View style={styles.logoContainer}>
        {show && <SWMLogo key={Math.random().toString()} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columnReverse: {
    flexDirection: 'column-reverse',
  },
  logoContainer: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedView: {
    height: 100,
    width: 200,
    borderWidth: 3,
    borderColor: '#001a72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    height: 100,
    width: 50,
    borderWidth: 3,
    borderColor: '#001a72',
    borderRightWidth: 0,
    transform: [
      { translateX: -50 },
      { translateY: 100 },
      { skewY: '45deg' },
      { translateY: 25 },
    ],
  },
  top: {
    height: 50,
    width: 200,
    borderWidth: 3,
    borderColor: '#001a72',
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    transform: [{ skewX: '45deg' }, { translateX: -25 }],
  },
});
