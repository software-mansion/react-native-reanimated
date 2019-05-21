import React, { useState, useRef, useMemo } from 'react';
import { Text, View, StyleSheet, Button, StatusBar } from 'react-native';
import Animated, { Transitioning, Transition } from 'react-native-reanimated';
const { cond, pow } = Animated;
function Progress() {
  const input = useMemo(() => new Animated.Value(0), []);
  const output = useMemo(() => new Animated.Value(0), []);

  //output.__nativeInitialize()
  console.warn(output.__nodeID);

  const transition = (
    <Transition.Change
      interpolation="easeInOut"
      interpolationInput={input}
      interpolationOutput={pow(input, 3)}
    />
  );

  let [perc, setPerc] = useState(20);
  const ref = useRef();

  return (
    <Transitioning.View
      ref={ref}
      style={styles.centerAll}
      durationMs={10}
      transition={transition}>
      <Button
        title={perc + 20 <= 100 ? '+20%' : '-80%'}
        color="#FF5252"
        onPress={() => {
          ref.current.animateNextTransition();
          setPerc(perc + 20 <= 100 ? perc + 20 : 20);
        }}
      />
      <View style={styles.bar}>
        <Animated.Code exec={Animated.set(output, input)} />
        <View
          style={{ height: 5, width: `${perc}%`, backgroundColor: '#FF5252' }}
        />
      </View>
    </Transitioning.View>
  );
}

const styles = StyleSheet.create({
  centerAll: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100,
  },
  bar: {
    marginTop: 30,
    height: 5,
    width: '80%',
    backgroundColor: '#aaa',
  },
});

export default Progress;
