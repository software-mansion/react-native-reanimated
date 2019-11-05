import React, { useMemo } from 'react';
import { StyleSheet, Dimensions, findNodeHandle, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
const { width } = Dimensions.get('window');

const { cond, eq, add, call, set, Value, event, invoke, useCode, Code, map, callback, neq, createAnimatedComponent, View, ScrollView } = Animated;

//const pipper = invoke((a, b, c)=>)
const P = createAnimatedComponent(PanGestureHandler)

export default function E() {
  //const ref = React.useRef();
  const [h, setH] = React.useState(-1);
  const x = useMemo(() => new Value(0));
  const translationX = useMemo(() => new Value(0));
  //useCode(pipper(findNodeHandle(h) || 1), [h]);
  useCode(
    cond(
      neq(h, -1),
      call(
        [
          invoke({ module: 'UIManager', method: 'playTouchSound' }, findNodeHandle(h) || 1, callback([]), callback({ x })),
          //invoke({ module: 'RCTScrollView', command: 'scrollToEnd' }, findNodeHandle(h), 1),
          invoke({ module: 'RCTScrollView', command: 'flashScrollIndicators' }, findNodeHandle(h)),
          invoke({ module: 'RCTScrollView', command: 'scrollTo' }, findNodeHandle(h), 50, 100, 1),
          //invoke({ module: 'ShareModule', method: 'share' }, findNodeHandle(h)),
          //invoke({ module: 'RCTScrollView', command: 'scrollToEnd' }, findNodeHandle(h) || 1, map({animated: 1}))
          translationX
        ],
        (a) => console.log('invoke: ', a)
      )
    ),
    [h, translationX]
  );

  console.log('tag', h)

  
  /*
  return (
    <P
      onHandlerStateChange={event([{ nativeEvent: { translationX } }])}
    >
      <Image source={require('../imageViewer/grid.png')} ref={(r) => setH(findNodeHandle(r))} />
    </P>
  );
  */
  return (
    <ScrollView style={{ flex: 1 }} collapsable={false} ref={(r) => setH(findNodeHandle(r))}>
      <Image source={require('../imageViewer/grid.png')} />
    </ScrollView>
  );
}