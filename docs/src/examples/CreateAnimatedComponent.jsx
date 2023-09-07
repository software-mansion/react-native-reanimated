import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

const MyView = React.forwardRef((props, ref) => {
  // some additional logic
  return <View ref={ref} {...props} />;
});

// highlight-next-line
const MyAnimatedView = Animated.createAnimatedComponent(MyView);

export default function App() {
  const width = useSharedValue(100);

  const handlePress = () => {
    width.value = withSpring(width.value + 50);
  };

  return (
    <View style={styles.container}>
      <MyAnimatedView style={{ ...styles.box, width }} />
      <Button onPress={handlePress} title="Click me" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
    marginVertical: 64,
  },
});
