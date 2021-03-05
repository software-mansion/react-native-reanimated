import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { View, Button, Text, ScrollView } from 'react-native';
import React, { useState } from 'react';

export default function AnimatedStyleUpdateExample(props) {
  const randomWidth = useSharedValue(10);

  const [counter, setCounter] = useState(0);
  const [counter2, setCounter2] = useState(1);
  const [itemList, setItemList] = useState([]);
  const [toggleState, setToggleState] = useState(false);

  const config = {
    duration: 1000,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    // console.log("pies", {
    //   width: withTiming(randomWidth.value, config),
    // })
    return {
      width: withTiming(randomWidth.value, config),
    };
  });

  // console.log(style)

  const staticObject = <Animated.View
    style={[
      { width: 100, height: 8, backgroundColor: 'black', margin: 1 },
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
            { width: 10, height: 8, backgroundColor: 'blue', margin: 1 },
            style,
          ]}
        />
      )
    }
    return output
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        flexDirection: 'column',
      }}>
      <Button
        title="animate"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
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
          // console.log(style)
          setCounter2(counter2 + 1)
          setItemList([...itemList, <Animated.View
            key={counter2 + 'b'}
            style={[
              { width: 100, height: 8, backgroundColor: 'green', margin: 1 },
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
      {/* <Animated.View
        style={[
          { width: 100, height: 8, backgroundColor: 'orange', margin: 1 },
          style,
        ]}
      /> */}
      {toggleState && <Animated.View
        style={[
          { width: 100, height: 8, backgroundColor: 'black', margin: 1 },
          style,
        ]}
      />}
      {toggleState && staticObject}
      {renderItems()}
      {itemList}
    </ScrollView>
  );
}