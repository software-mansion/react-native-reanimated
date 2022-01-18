import { View, Button, Text } from 'react-native';
import React, { useState, useEffect } from 'react';

function ChildA() {
  return (
    <View>
      <View collapsable={false}>
        <View collapsable={false}>
          <Text> Szymon </Text>
        </View>
      </View>
    </View>
  );
}

function SimpleView() {
  useEffect(() => {
    return () => {
      console.log('did unmount <SimpleView/>');
    };
  }, []);

  return (
    <View collapsable={false}>
      <View collapsable={false}>
        <Text> Turbo </Text>
      </View>
    </View>
  );
}

function ChildB() {
  useEffect(() => {
    return () => {
      console.log('did unmount <ChildB/>');
    };
  }, []);

  return (
    <View collapsable={false}>
      <SimpleView />
    </View>
  );
}

export default function TestRemovalOrder() {
  const [show1, setShow1] = useState(true);
  const [show2, setShow2] = useState(true);

  return (
    <View collapsable={false}>
      <Button
        title="remove 1"
        onPress={() => {
          setShow1((i) => !i);
        }}
      />
      <Button
        title="remove 2"
        onPress={() => {
          setShow2((i) => !i);
        }}
      />
      {show1 && <ChildA />}
      {show2 && <ChildB />}
    </View>
  );
}
