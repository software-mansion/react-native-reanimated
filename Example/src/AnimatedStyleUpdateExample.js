import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  spawnThread,
  runOnUI,
  runOnJS,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React from 'react';

export default function App() {
  const sv = useSharedValue(0);

  console.log('here 1');
  // for(let i=0;i<3000000000;++i) {}
  console.log('here 2');
  /* * /
  useAnimatedStyle(() => {
    sv;
    console.log('siema', _WORKLET)
    return {};
  })
/*
  runOnUI(() => {
    'worklet';
    sv.value = 1;
    console.log('> run on ui #1 begin', _WORKLET);
    // for(let i=0;i<3000000000;++i) {}
    console.log('> run on ui #1 end', _WORKLET);
  })();

  console.log('here 3');
/* */
/* */
  // thread 1
  const vvv = 99;
  spawnThread(() => {
    'worklet';
    _log('> spawn thread #1 start ' + vvv);
    sv.value = 1;
    // vvv;// nie ma krasha
    // sv.value; // jest krasz
    // po prostu shared value nie jest przystosowane do innych watkow niz js/ui najwyrazniej...
    // vvv;
    for (let i = 0; i < 3000000000; ++i) {}
    sv.value = 2;
    _log('> spawn thread #1 end');
    return Math.random() * 100;
  });
  // thread 2
  /* * /
  spawnThread(() => {
    'worklet';
    _log('> spawn thread #2 start');
    // sv.value = 3;
    for (let i = 0; i < 3000000000; ++i) {}
    _log('> spawn thread #2 end');
    return Math.random() * 100;
  });
  */
  //

  setTimeout(() => {
    console.log('here timeout');
  }, 100);

  console.log('here 4');
/* */
  return (
    <View>
      <Button
        title="read sv"
        onPress={() => {
          console.log(sv.value)
        }}
      />
    </View>
  );
}
