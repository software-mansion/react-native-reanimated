import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  useAnimatedReaction,
  withRepeat,
  withDelay,
  withSequence,
  withSpring,
  withDecay,
} from 'react-native-reanimated';
import { View, Button, ScrollView, Text } from 'react-native';
import React, { useMemo, useState, useEffect } from 'react';

function ChildA() {
  return (
    <AnimatedLayout>
      <View collapsable={false}> 
        <View collapsable={false}>
          <Text> Szymon </Text>
        </View>
      </View>
    </AnimatedLayout>
  );
}

function SimpleView() {

  useEffect(() => {
    return () => {
      console.log("did unmount <SimpleView/>");
    }
  }, [])

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
      console.log("did unmount <ChildB/>");
    }
  }, [])

  return (
    <View collapsable={false}> 
      <SimpleView/>
    </View>
  );
}

export default function TestRemovalOrder(props) {
  const [show1, setShow1] = useState(true);
  const [show2, setShow2] = useState(true);

  return (
    <View collapsable={false}>
      <Button title="remove 1" onPress={() => {setShow1((i)=> !i)}}/>
      <Button title="remove 2" onPress={() => {setShow2((i)=> !i)}}/>
      {show1 && <ChildA/>}
      {show2 && <ChildB/>}
    </View>
  );
}
