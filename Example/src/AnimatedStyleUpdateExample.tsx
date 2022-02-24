import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState } from 'react';

export default function AnimatedStyleUpdateExample(props:any) {
  const randomWidth = useSharedValue(10);
  const color = useSharedValue(0);

  const [counter, setCounter] = useState(0);
  const [counter2, setCounter2] = useState(0);
  const [itemList, setItemList] = useState([]);
  const [toggleState, setToggleState] = useState(false);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
      // backgroundColor: withTiming(color.value ? '#123123' : '#acbacb', config)
    };
  });

  const staticObject = <Animated.View
    style={[
      { width: 100, height: 3, backgroundColor: 'black', margin: 1 },
      style,
    ]}
  />

  const renderItems = () => {
    let output = []
    for(let i = 0; i < counter; i++) {
      output.push(
        <Animated.View
        key={i + 'a'}
          style={[
            { width: 100, height: 3, backgroundColor: 'blue', margin: 1 },
            style,
          ]}
        />
      )
    }
    return output
  }

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        marginTop: 30
      }}>
      <Button
        title="animate"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
          // color.value = color.value ? 0 : 1;
        }}
      />
      <Button
        title="increment counter"
        onPress={() => {
          setCounter(counter + 1)
        }}
      />
      <Button
        title="add item to static lists"
        onPress={() => {
          setCounter2(counter2 + 1)
          setItemList([...itemList, <Animated.View
            key={counter2 + 'b'}
            style={[
              { width: 100, height: 3, backgroundColor: 'green', margin: 1 },
              style,
            ]}
          />])
        }}
      />
      <Button
        title="toggle state"
        onPress={() => {
          setToggleState(!toggleState)
        }}
      />
      <Animated.View
        style={[
          { width: 100, height: 3, backgroundColor: 'orange', margin: 1 },
          style,
        ]}
      />
      {toggleState && <Animated.View
        style={[
          { width: 100, height: 3, backgroundColor: 'black', margin: 1 },
          style,
        ]}
      />}
      {toggleState && staticObject}
      {renderItems()}
      {itemList}
    </View>
  );
}
