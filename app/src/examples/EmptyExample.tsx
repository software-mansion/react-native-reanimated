import React, { useState } from 'react';
import { StyleSheet, View, Button, Text } from 'react-native';
import Animated from 'react-native-reanimated';

// export default function EmptyExample() {
//   const [toggle1, setToggle1] = useState(false);
//   const [toggle2, setToggle2] = useState(false);
//   return (
//     <View style={styles.container}>
//       <Button title="Toggle1" onPress={() => setToggle1(!toggle1)} />
//       <Button title="Toggle2" onPress={() => setToggle2(!toggle2)} />
//       <Animated.View style={styles.box} sharedTransitionTag='test' />
//       {toggle1 && <Animated.View style={styles.box2} sharedTransitionTag='test' />}
//       {toggle2 && <Animated.View style={styles.box3} sharedTransitionTag='test' />}
//     </View>
//   );
// }

export default function EmptyExample() {
  const [toggle, setToggle] = useState(false);
  const [counter, setCounter] = useState(0);
  return (
    <View style={styles.container}>
      {/* <Button title="Toggle" onPress={() => setToggle(!toggle)} />
      <Animated.View style={styles.box} sharedTransitionTag='test' />
      {toggle && <Animated.View style={styles.box2} sharedTransitionTag='test' />} */}

      <Button title="Replace" onPress={() => setCounter(counter + 1)} />
      <Text>Counter: {counter}</Text>
      <Text>Counter: {counter}</Text>
      {counter % 2 == 0 && <Animated.View style={styles.box3} sharedTransitionTag='test1' />}
      <Text>Counter: {counter}</Text>
      <Text>Counter: {counter}</Text>
      {counter % 2 == 1 && <Animated.View style={styles.box4} sharedTransitionTag='test1' />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'green',
  },
  box2: {
    width: 200,
    height: 100,
    backgroundColor: 'blue',
  },
  box3: {
    width: 150,
    height: 250,
    backgroundColor: 'red',
  },
  box4: {
    width: 200,
    height: 300,
    backgroundColor: 'black',
  },
});
