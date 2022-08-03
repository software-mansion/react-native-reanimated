import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { View, Button, StyleSheet } from 'react-native';
import React, { useState } from 'react';

export default function AnimatedSharedStyleExample() {
  const randomWidth = useSharedValue(100);

  const [blueCounter, setBlueCounter] = useState<number>(0);
  const [greenCounter, setGreenCounter] = useState<number>(0);
  const [itemList, setItemList] = useState<any>([]);
  const [toggleState, setToggleState] = useState<boolean>(false);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      width: withTiming(randomWidth.value, config),
    };
  });

  const scopeObject = (
    <Animated.View
      style={[{ backgroundColor: 'black' }, styles.block, style]}
    />
  );

  const renderItems = () => {
    const output = [];
    for (let i = 0; i < blueCounter; i++) {
      output.push(
        <Animated.View
          key={i + 'a'}
          style={[{ backgroundColor: 'blue' }, styles.block, style]}
        />
      );
    }
    return output;
  };

  return (
    <View
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
          setBlueCounter(blueCounter + 1);
        }}
      />
      <Button
        title="add item to static lists"
        onPress={() => {
          setGreenCounter(greenCounter + 1);
          setItemList([
            ...itemList,
            <Animated.View
              key={greenCounter + 'b'}
              style={[{ backgroundColor: 'green' }, styles.block, style]}
            />,
          ]);
        }}
      />
      <Button
        title="toggle state"
        onPress={() => {
          setToggleState(!toggleState);
        }}
      />
      <Animated.View
        style={[{ backgroundColor: 'orange' }, styles.block, style]}
      />
      {toggleState && (
        <Animated.View
          style={[{ backgroundColor: 'black' }, styles.block, style]}
        />
      )}
      {toggleState && scopeObject}
      {renderItems()}
      {itemList}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: 100,
    height: 3,
    margin: 1,
  },
});
