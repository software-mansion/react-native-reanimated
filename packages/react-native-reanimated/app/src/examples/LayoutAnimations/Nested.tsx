import Animated, { FadeOut } from 'react-native-reanimated';
import { Button, View, StyleSheet } from 'react-native';
import React, { useState } from 'react';

const levelOne = {
  width: 100,
  backgroundColor: 'black',
  margin: 10,
};

const levelTwo = {
  width: 80,
  backgroundColor: 'red',
  margin: 10,
};

const levelThree = {
  width: 40,
  height: 40,
  backgroundColor: 'yellow',
  margin: 20,
};

export default function NestedTest() {
  const [toggle, setToggle] = useState(false);

  return (
    <View style={styles.container}>
      <Button title="toggle" onPress={() => setToggle((current) => !current)} />
      <View style={styles.wrap}>
        {
          // when toggled off, in this column:
          toggle && (
            <Animated.View style={levelOne}>
              {/* the first red rectangle should disappear immediately */}
              <View style={levelTwo}>
                <View style={levelThree} />
                <View style={levelThree} />
              </View>
              {/* in the second, the first yellow square should disappear immediately
                        and the rectangle should disappear as soon as the second yellow square
                        finishes animating */}
              <View style={levelTwo}>
                <View style={levelThree} />
                <Animated.View
                  style={levelThree}
                  exiting={FadeOut.duration(1000)}
                />
              </View>
              {/* the third should animate its exit, and the entire column should disappear
                        when its animation finishes */}
              <Animated.View style={levelTwo} exiting={FadeOut.duration(3000)}>
                <View style={levelThree} />
                <View style={levelThree} />
              </Animated.View>
            </Animated.View>
          )
        }
        {
          // similarly as before, but the first red rectangle should not disappear
          // since it's inside an animated component (the black column)
          toggle && (
            <Animated.View
              style={levelOne}
              exiting={FadeOut.delay(1000).duration(2000)}>
              <View style={levelTwo}>
                <View style={levelThree} />
                <View style={levelThree} />
              </View>
              <View style={levelTwo}>
                <View style={levelThree} />
                <Animated.View
                  style={levelThree}
                  exiting={FadeOut.duration(1000)}
                />
              </View>
              <Animated.View style={levelTwo} exiting={FadeOut.duration(3000)}>
                <View style={levelThree} />
                <View style={levelThree} />
              </Animated.View>
            </Animated.View>
          )
        }
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
  wrap: {
    flexWrap: 'wrap',
  },
});
