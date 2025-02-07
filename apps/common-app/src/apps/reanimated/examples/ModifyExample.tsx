import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import {
  runOnUI,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

export default function ModifyExample() {
  const sv = useSharedValue([1]);

  const handleModify = () => {
    sv.modify((value) => {
      'worklet';
      value.push(value.length + 1);
      return value;
    });
  };

  const handleModifyWithoutArgument = () => {
    sv.modify();
  };

  useDerivedValue(() => {
    console.log('useDerivedValue', sv.value);
  });

  const handleRead = () => {
    console.log('JS', sv.value);
    runOnUI(() => {
      console.log('UI', sv.value);
    })();
  };

  return (
    <View style={styles.container}>
      <Button title="Modify" onPress={handleModify} />
      <Button
        title="Modify without argument"
        onPress={handleModifyWithoutArgument}
      />
      <Button title="Read" onPress={handleRead} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
