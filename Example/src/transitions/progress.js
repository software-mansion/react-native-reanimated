import React, { useState, useRef } from 'react';
import { Text, View, StyleSheet, Button, StatusBar } from 'react-native';
import { Transitioning, Transition } from 'react-native-reanimated';

function Progress() {
  const transition = <Transition.Change interpolation="easeInOut" />;

  let [perc, setPerc] = useState(20);
  const ref = useRef();

  return (
    <Transitioning.View
      ref={ref}
      style={styles.centerAll}
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
