import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Button, View, StyleSheet } from 'react-native';
import React, { useState } from 'react';

const style = {
  width: 100,
  height: 50,
  backgroundColor: 'black',
  margin: 10,
};

/*
  In this test, when toggling, all views should enter and leave at the same time.
  Entering and Layout animations should combine.
  Exiting should stop the layout animation, and begin playing the exiting animation
  from the component's current location.
*/
export default function CombinedTest() {
  const [toggle, setToggle] = useState(false);
  const [height, setHeight] = useState(6 * 70);

  const timeout = React.useCallback(() => {
    setHeight((current) => Math.max(140, (current % (6 * 70)) + 70));
  }, [setHeight]);

  React.useEffect(() => {
    const interval = setInterval(timeout, 1000);
    return () => clearInterval(interval);
  }, [timeout]);

  return (
    <View style={styles.container}>
      <Button title="toggle" onPress={() => setToggle((current) => !current)} />
      <View style={[{ height }, styles.flexWrap]}>
        {toggle && (
          <View collapsable={false}>
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              layout={Layout.springify()}
              style={style}
            />
          </View>
        )}
        {toggle && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            layout={Layout.springify()}
            style={style}
          />
        )}
        {toggle && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            layout={Layout.springify()}>
            <Animated.View style={style} />
          </Animated.View>
        )}
        {toggle && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            layout={Layout.springify()}>
            <Animated.View entering={FadeIn} exiting={FadeOut} style={style} />
          </Animated.View>
        )}
        {toggle && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut.duration(2000)}
            layout={Layout.springify()}>
            <Animated.View entering={FadeIn} exiting={FadeOut} style={style} />
          </Animated.View>
        )}
        {toggle && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            layout={Layout.springify()}>
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut.duration(2000)}
              style={style}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    marginTop: 60,
  },
  flexWrap: {
    flexWrap: 'wrap',
  },
});
