import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions, findNodeHandle } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
const { width } = Dimensions.get('window');

const { cond, eq, add, call, set, Value, event, invoke, useCode } = Animated;

//const pipper = invoke((a, b, c)=>)

export default function E() {
  //const ref = React.useRef();
  const [h, setH] = React.useState(1);
  const x = useMemo(() => new Value(0));
  //useCode(pipper(findNodeHandle(h) || 1), [h]);
  useCode(
    call(
      [
        invoke({ module: 'UIManager', method: 'measureLayout' }, findNodeHandle(h) || 1, {}, { x })
      ],
      console.log
    ),
    [h]
  );

  return (
    <View style={{ flex: 1 }} collapsable={false} ref={(r) => setH(findNodeHandle(r))}>

    </View>
  );
}