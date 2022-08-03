import { View, Button, Platform, UIManager } from 'react-native';
import React, { useState } from 'react';
import Animated, { FadeOut } from 'react-native-reanimated';
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

function IndexOrder(): React.ReactElement {
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);
  const [showC, setShowC] = useState(true);

  return (
    <View style={{ paddingTop: 30, marginTop: 30 }} testID="ExitingAnimation">
      <Button
        title="toogle A"
        onPress={() => {
          setShowA(!showA);
        }}
        testID="buttonA"
      />
      <Button
        title="toogle B"
        onPress={() => setShowB(!showB)}
        testID="buttonB"
      />
      <Button
        title="toogle C"
        onPress={() => setShowC(!showC)}
        testID="buttonC"
      />

      {showA && (
        <Animated.Text
          exiting={FadeOut.duration(10000)}
          style={{ height: 40, margin: 10, fontSize: 30 }}
          testID="componentA">
          component A
        </Animated.Text>
      )}
      {showB && (
        <Animated.Text
          style={{ height: 40, margin: 10, fontSize: 30 }}
          testID="componentB">
          component B
        </Animated.Text>
      )}
      {showC && (
        <Animated.Text
          style={{ height: 40, margin: 10, fontSize: 30 }}
          testID="componentC">
          component C
        </Animated.Text>
      )}
    </View>
  );
}
export default IndexOrder;
