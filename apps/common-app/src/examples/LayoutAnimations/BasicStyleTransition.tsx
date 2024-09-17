import Animated, { LinearStyleTransition } from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';

import React from 'react';

export default function BasicLayoutAnimation() {
  const [currentStyleIdx, setCurrentStyleIdx] = React.useState(0);
  const [state, setState] = React.useState(false);

  const viewStyles = [
    styles.googleColors,
    styles.rainDrop,
    styles.leaf,
    styles.squareFrame,
    styles.arcFrame,
  ];

  function incrementStyle() {
    let newStyleIdx = currentStyleIdx + 1;
    if (newStyleIdx >= viewStyles.length) {
      newStyleIdx = 0;
    }
    setCurrentStyleIdx(newStyleIdx);
    setState(!state);
  }

  return (
    <View style={styles.container}>
      <Button onPress={incrementStyle} title="Update" />
      <Animated.View
        layout={LinearStyleTransition.duration(1000)}
        style={[
          styles.box,
          viewStyles[currentStyleIdx],
          {
            marginLeft: state ? 100 : 0,
          },
        ]}
      />
      <View
        style={[
          styles.box,
          viewStyles[currentStyleIdx],
          {
            marginLeft: state ? 100 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  googleColors: {
    borderTopColor: 'orangered',
    borderLeftColor: 'gold',
    borderBottomColor: 'green',
    borderRightColor: 'dodgerblue',
    borderRadius: 100,
    borderWidth: 40,
  },
  rainDrop: {
    borderWidth: 60,
    borderTopWidth: 40,
    borderLeftWidth: 40,
    borderRadius: 100,
    borderTopLeftRadius: 0,
    borderColor: 'deepskyblue',
    backgroundColor: 'skyblue',
  },
  leaf: {
    borderWidth: 60,
    borderTopWidth: 50,
    borderLeftWidth: 50,
    borderTopLeftRadius: 90,
    borderBottomRightRadius: 100,
    borderColor: 'darkgreen',
    borderBottomColor: 'green', // on Android this is overwritten with borderColor
    borderRightColor: 'green',
    backgroundColor: 'lime',
  },
  squareFrame: {
    borderWidth: 40,
    borderColor: 'goldenrod',
    borderBlockColor: 'darkgoldenrod', // on Android this looks different than on IOS
  },
  arcFrame: {
    borderRadius: 20,
    borderTopRightRadius: 80,
    borderTopLeftRadius: 80,
    borderWidth: 40,
    borderBottomWidth: 60,
    borderTopWidth: 10,
    borderColor: 'goldenrod',
    borderBlockEndColor: 'darkgoldenrod',
    borderBlockStartColor: 'darkgoldenrod',
  },

  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
  },
  box: {
    width: 200,
    height: 200,
    opacity: 0.5,
    margin: 50,
  },
});
