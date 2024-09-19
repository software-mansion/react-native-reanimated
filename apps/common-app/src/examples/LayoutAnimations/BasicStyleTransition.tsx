import Animated, { LinearStyleTransition } from 'react-native-reanimated';
import { Button, StyleSheet, View } from 'react-native';
import React from 'react';
import { SelectorRow } from '../commonComponents/RowButtonSelector';

export default function BasicLayoutAnimation() {
  const [currentStyleIdx, setCurrentStyleIdx] = React.useState(0);
  const [useLayout, setUseLayout] = React.useState(true);

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
  }

  const transitionProp = useLayout
    ? { layout: LinearStyleTransition.duration(1000) }
    : { styleTransition: LinearStyleTransition.duration(1000) };

  return (
    <View style={styles.container}>
      <SelectorRow
        firstButtonLabel="Layout Transition"
        secondButtonLabel=" Style Transition"
        selectedFirstButton={useLayout}
        setSelectedFirstButton={setUseLayout}
      />

      <Button onPress={incrementStyle} title="Update" />
      <Animated.View
        {...transitionProp}
        style={[styles.box, viewStyles[currentStyleIdx]]}
      />
      <View style={[styles.box, viewStyles[currentStyleIdx]]} />
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
    width: 150,
    height: 150,
    transform: [{ translateX: 40 }, { rotateZ: '45deg' }],
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
    transform: [{ rotateZ: '30deg' }, { translateX: 40 }],
  },
  squareFrame: {
    borderWidth: 40,
    borderColor: 'goldenrod',
    borderBlockColor: 'darkgoldenrod', // on Android this looks different than on IOS, both the transform and borders
    transform: [{ matrix: [1, 0.1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1] }],
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
    transform: [
      { matrix: [0.5, 5, 0, 0, -1, 0.5, 0, 0, 0, 0, 1, 0, 100, 100, 100, 4] },
    ],
  },

  container: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    width: 200,
    height: 200,
    opacity: 0.5,
    margin: 50,
  },
});
