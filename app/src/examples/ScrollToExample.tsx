import Animated, {
  runOnUI,
  scrollTo,
  useAnimatedRef,
} from 'react-native-reanimated';
import { Button, StyleSheet, Switch, Text, View } from 'react-native';

import React from 'react';

export default function ScrollToExample() {
  const [animated, setAnimated] = React.useState(true);

  const aref = useAnimatedRef<Animated.ScrollView>();

  const scrollFromJS = () => {
    console.log(_WORKLET);
    aref.current?.scrollTo({ y: Math.random() * 2000, animated });
  };

  const scrollFromUI = () => {
    runOnUI(() => {
      console.log(_WORKLET);
      scrollTo(aref, 0, Math.random() * 2000, animated);
    })();
  };

  return (
    <>
      <View style={styles.buttons}>
        <Switch
          value={animated}
          onValueChange={setAnimated}
          style={styles.switch}
        />
        <Button onPress={scrollFromJS} title="Scroll from JS" />
        <Button onPress={scrollFromUI} title="Scroll from UI" />
      </View>
      <Animated.ScrollView ref={aref} style={styles.scrollView}>
        {[...Array(100)].map((_, i) => (
          <Text key={i} style={styles.text}>
            {i}
          </Text>
        ))}
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  switch: {
    marginBottom: 10,
  },
  buttons: {
    marginTop: 80,
    marginBottom: 40,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: 50,
    textAlign: 'center',
  },
});
