import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
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

interface EvilButtonProps {
  version: string | undefined;
  long: boolean;
}

function EvilButton({ version, long }: EvilButtonProps) {
  function onPressOut() {
    if (long) {
      // @ts-ignore this is fine
      longOffender.__initData.version = version;
      runOnUI(longOffender)();
    } else {
      // @ts-ignore this is fine
      shortOffender.__initData.version = version;
      runOnUI(shortOffender)();
    }
  }

  return (
    <Pressable style={styles.button} onPressOut={onPressOut}>
      <Text style={styles.text}>
        {long
          ? 'long worklet check'
          : version
          ? 'wrong version check'
          : 'undefined version check'}
      </Text>
    </Pressable>
  );
}

export default function BabelVersionCheckExample() {
  return (
    <View style={styles.container}>
      <EvilButton version={undefined} long={false} />
      <EvilButton version="wrong version" long={false} />
      <EvilButton version={undefined} long={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4488dd',
    padding: 10,
    borderRadius: 50,
    margin: 10,
    height: 80,
    width: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
});
