
import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnUI,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TouchableOpacity, ScrollView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: Dimensions.get('window').width,
  },
  card: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    flex: 1,
    elevation: 4,
  },
  header: {
    height: 50 + 20,
    paddingTop: 20,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
});

function AnimatedStyleUpdateExample(props) {
 const randomWidth = useSharedValue(10);

  const config = {
    duration: 500,
    easing: Easing.bezier(0.5, 0.01, 0, 1),
  };

  const style = useAnimatedStyle(() => {
    return {
      //width: randomWidth.value, // this works
      width: withTiming(randomWidth.value, config), // this drops frames
    };
  });

  return (
    <View
      style={{
        // flex: 1,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomWidth.value = Math.random() * 350;
        }}
      />
    </View>
  );
}

function Button({ title, onPress }) {
  return (
    <TouchableOpacity onPress={(onPress)}>
      <Text style={{ color: 'black', fontSize: 18 }}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function KindaNavigation() {
  const [show, setShow] = useState(false);

  function handleNavigate() {
    setShow(true);
  }

  function onBach() {
    setShow(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Navigate" onPress={handleNavigate} />

      {show && <Screen onBack={onBach} />}
    </View>
  );
}

function runTiming(sharedValue, toValue, callback) {
  return runOnUI(() => {
    'worklet';

    //console.log('navigate');

    sharedValue.value = withTiming(
      toValue,
      {
        duration: 450,
      },
      callback
    );
  })();
}

function Screen({ onBack }) {
  const translateX = useSharedValue(width);
  const [show, setState] = useState(false);

  if (!show) {
    runTiming(translateX, 0);
  }

  setTimeout(() => {
    setState(true);
    console.log('render');
  }, 100);

  function handleBack() {
    runTiming(translateX, width, onBack);
  }

  const styles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: translateX.value,
        },
      ],
    };
  });

  return (
    <View style={s.container}>
      <Animated.View style={[styles, s.card]}>
        <View style={s.header}>
          <Button title="Back" onPress={handleBack} />
        </View>
        <ScrollView>
          {show && (
            <>
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
              <AnimatedStyleUpdateExample />
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

