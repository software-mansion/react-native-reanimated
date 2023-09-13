import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { runOnUI } from 'react-native-reanimated';

function shortOffender() {
  'worklet';
  let I = 'am';
  let a = 'very';
  let complicated = 'function.';
  I = a;
  a = complicated;
  complicated = I;
}

function longOffender() {
  'worklet';
  let a =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor. Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur.';
  let b = 'what a waste';
  a = b;
  b = a;
}

export default function BabelVersionCheckExample() {
  const handlePress1 = () => {
    // @ts-ignore this is fine
    shortOffender.__initData.version = undefined;
    runOnUI(shortOffender)();
  };

  const handlePress2 = () => {
    // @ts-ignore this is fine
    longOffender.__initData.version = undefined;
    runOnUI(longOffender)();
  };

  const handlePress3 = () => {
    // @ts-ignore this is fine
    shortOffender.__initData.version = 'x.y.z';
    runOnUI(shortOffender)();
  };

  const handlePress4 = () => {
    // @ts-ignore this is fine
    longOffender.__initData.version = 'x.y.z';
    runOnUI(longOffender)();
  };

  return (
    <View style={styles.container}>
      <Button onPress={handlePress1} title="Unknown version short worklet" />
      <Button onPress={handlePress2} title="Unknown version long worklet" />
      <Button onPress={handlePress3} title="Wrong version short worklet" />
      <Button onPress={handlePress4} title="Wrong version long worklet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
