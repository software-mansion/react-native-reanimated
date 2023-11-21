import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeInDown,
  FadeOut,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  FadeOutDown,
} from 'react-native-reanimated';

const DELAY = 500;

const fadeAnimation = [
  {
    enteringName: 'FadeIn',
    enteringAnimation: FadeIn,
    exitingName: 'FadeOut',
    exitingAnimation: FadeOut,
  },
  {
    enteringName: 'FadeInLeft',
    enteringAnimation: FadeInLeft,
    exitingName: 'FadeOutLeft',
    exitingAnimation: FadeOutLeft,
  },
  {
    enteringName: 'FadeInRight',
    enteringAnimation: FadeInRight,
    exitingName: 'FadeOutRight',
    exitingAnimation: FadeOutRight,
  },
  {
    enteringName: 'FadeInUp',
    enteringAnimation: FadeInUp,
    exitingName: 'FadeOutUp',
    exitingAnimation: FadeOutUp,
  },
  {
    enteringName: 'FadeInDown',
    enteringAnimation: FadeInDown,
    exitingName: 'FadeOutDown',
    exitingAnimation: FadeOutDown,
  },
];

export default function App() {
  const [showExiting, setShowExiting] = React.useState(false);

  React.useEffect(() => {
    const interval = setTimeout(() => {
      setShowExiting(!showExiting);
    }, DELAY * fadeAnimation.length);
    return () => clearInterval(interval);
  }, [showExiting]);

  return (
    <View style={[styles.container, { height: 55 * fadeAnimation.length }]}>
      {showExiting
        ? fadeAnimation.map((animation) => (
            <View
              style={[styles.box, styles.exitingBox]}
              key={animation.exitingName}>
              <Text style={styles.exitingText}>{animation.exitingName}</Text>
            </View>
          ))
        : fadeAnimation.map((animation, i) => (
            <Animated.View
              entering={animation.enteringAnimation.delay(DELAY * i)}
              exiting={animation.exitingAnimation.delay(DELAY * i)}
              key={animation.enteringName}
              style={[styles.box, styles.enteringBox]}>
              <Text style={styles.enteringText}>{animation.enteringName}</Text>
            </Animated.View>
          ))}
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
    height: 48,
    width: 250,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enteringBox: {
    backgroundColor: '#b58df1',
  },
  enteringText: {
    fontSize: 16,
    color: 'white',
  },
  exitingBox: {
    borderColor: '#b58df1',
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  exitingText: {
    fontSize: 16,
    color: '#b58df1',
  },
});
