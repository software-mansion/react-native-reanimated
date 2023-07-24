import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { runOnUI } from 'react-native-reanimated';

function offender() {
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
  version?: string;
  long?: boolean;
}

function EvilButton({ version, long }: EvilButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  function onPressOut() {
    setPressed(false);
    if (long) {
      // @ts-ignore this is fine
      longOffender.__initData.version = version;
      runOnUI(longOffender)();
    } else {
      // @ts-ignore this is fine
      offender.__initData.version = version;
      runOnUI(offender)();
    }
  }

  return (
    <Pressable
      style={[styles.button, pressed && { backgroundColor: '#3366dd' }]}
      onPressIn={() => setPressed(true)}
      onPressOut={onPressOut}>
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

export default function BabelVersioningExample() {
  return (
    <View style={styles.container}>
      <EvilButton />
      <EvilButton version="wrong version" />
      <EvilButton long={true} />
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
