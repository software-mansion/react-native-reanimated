import { View, Button, LayoutAnimation, Text, Platform, UIManager } from 'react-native';
import React from 'react';
import { useState } from 'react';
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
    <View style={{paddingTop: 30, marginTop: 30}}>
      <Button title="toogle A" onPress={() => {
        setShowA(!showA);
        // setTimeout(() => setShowC(!showC), 50);
      }} />
      <Button title="toogle B" onPress={() => setShowB(!showB)} />
      <Button title="toogle C" onPress={() => setShowC(!showC)} />
      
      {showA && <Animated.Text exiting={FadeOut.duration(10000)} style={{ height: 40, margin: 10, fontSize: 30 }}>component A</Animated.Text>}
      {showB && <Animated.Text style={{ height: 40, margin: 10, fontSize: 30 }}>component B</Animated.Text>}
      {showC && <Animated.Text style={{ height: 40, margin: 10, fontSize: 30 }}>component C</Animated.Text>}
      
    </View>
  );
}
export default IndexOrder;