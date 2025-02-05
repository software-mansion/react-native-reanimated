import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { describe, expect, getTestComponent, render, test, useTestRef, wait } from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const COMPONENT_REF_ARRAY = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const allDerivedFunctions: Array<(x: number) => number> = [
  x => {
    'worklet';
    return 2 * x + 50;
  },
  x => {
    'worklet';
    return 100 + 50 * Math.cos(x / 25);
  },
  x => {
    'worklet';
    return Math.exp(x / 30);
  },
  x => {
    'worklet';
    return Math.log(x) * 30 + 40;
  },
  x => {
    'worklet';
    return (x * x) / 200;
  },
  x => {
    'worklet';
    return Math.cbrt(x * 20000);
  },
  x => {
    'worklet';
    return 100 + (x * (1 + Math.cos(x / 5))) / 2;
  },
  x => {
    'worklet';
    return 300 - x;
  },
  x => {
    'worklet';
    return Math.ceil(x / 40) * 40;
  },
  x => {
    'worklet';
    return x * x * 0.002 + x * x * x * 0.000005;
  },
];

const ChainComponent = () => {
  const basicValue = useSharedValue(20);

  const derivedValue0 = useDerivedValue(() => allDerivedFunctions[0](basicValue.value));
  const derivedValue1 = useDerivedValue(() => allDerivedFunctions[1](derivedValue0.value));
  const derivedValue2 = useDerivedValue(() => allDerivedFunctions[2](derivedValue1.value));
  const derivedValue3 = useDerivedValue(() => allDerivedFunctions[3](derivedValue2.value));
  const derivedValue4 = useDerivedValue(() => allDerivedFunctions[4](derivedValue3.value));
  const derivedValue5 = useDerivedValue(() => allDerivedFunctions[5](derivedValue4.value));
  const derivedValue6 = useDerivedValue(() => allDerivedFunctions[6](derivedValue5.value));
  const derivedValue7 = useDerivedValue(() => allDerivedFunctions[7](derivedValue6.value));
  const derivedValue8 = useDerivedValue(() => allDerivedFunctions[8](derivedValue7.value));
  const derivedValue9 = useDerivedValue(() => allDerivedFunctions[9](derivedValue8.value));

  const style0 = useAnimatedStyle(() => {
    return { width: derivedValue0.value };
  });
  const style1 = useAnimatedStyle(() => {
    return { width: derivedValue1.value };
  });
  const style2 = useAnimatedStyle(() => {
    return { width: derivedValue2.value };
  });
  const style3 = useAnimatedStyle(() => {
    return { width: derivedValue3.value };
  });
  const style4 = useAnimatedStyle(() => {
    return { width: derivedValue4.value };
  });
  const style5 = useAnimatedStyle(() => {
    return { width: derivedValue5.value };
  });
  const style6 = useAnimatedStyle(() => {
    return { width: derivedValue6.value };
  });
  const style7 = useAnimatedStyle(() => {
    return { width: derivedValue7.value };
  });
  const style8 = useAnimatedStyle(() => {
    return { width: derivedValue8.value };
  });
  const style9 = useAnimatedStyle(() => {
    return { width: derivedValue9.value };
  });

  useEffect(() => {
    basicValue.value = withTiming(100, { duration: 900 });
  }, [basicValue]);

  const componentRef0 = useTestRef(COMPONENT_REF_ARRAY[0]);
  const componentRef1 = useTestRef(COMPONENT_REF_ARRAY[1]);
  const componentRef2 = useTestRef(COMPONENT_REF_ARRAY[2]);
  const componentRef3 = useTestRef(COMPONENT_REF_ARRAY[3]);
  const componentRef4 = useTestRef(COMPONENT_REF_ARRAY[4]);
  const componentRef5 = useTestRef(COMPONENT_REF_ARRAY[5]);
  const componentRef6 = useTestRef(COMPONENT_REF_ARRAY[6]);
  const componentRef7 = useTestRef(COMPONENT_REF_ARRAY[7]);
  const componentRef8 = useTestRef(COMPONENT_REF_ARRAY[8]);
  const componentRef9 = useTestRef(COMPONENT_REF_ARRAY[9]);

  return (
    <View style={styles.container}>
      <Animated.View ref={componentRef0} style={[styles.animatedBox, style0]} />
      <Animated.View ref={componentRef1} style={[styles.animatedBox, style1]} />
      <Animated.View ref={componentRef2} style={[styles.animatedBox, style2]} />
      <Animated.View ref={componentRef3} style={[styles.animatedBox, style3]} />
      <Animated.View ref={componentRef4} style={[styles.animatedBox, style4]} />
      <Animated.View ref={componentRef5} style={[styles.animatedBox, style5]} />
      <Animated.View ref={componentRef6} style={[styles.animatedBox, style6]} />
      <Animated.View ref={componentRef7} style={[styles.animatedBox, style7]} />
      <Animated.View ref={componentRef8} style={[styles.animatedBox, style8]} />
      <Animated.View ref={componentRef9} style={[styles.animatedBox, style9]} />
    </View>
  );
};

describe('Test chained useDerivedValue', () => {
  test('Test chain of 10 components', async () => {
    await render(<ChainComponent />);
    await wait(1000);
    const components = COMPONENT_REF_ARRAY.map(refString => getTestComponent(refString));

    const expectedValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(idx => {
      const functionsToApply = allDerivedFunctions.slice(0, idx + 1);
      return functionsToApply.reduce(
        (currentValOfFunctionComposition, currentFunction) => currentFunction(currentValOfFunctionComposition),
        100,
      );
    });

    for (let i = 0; i < 10; i++) {
      expect(await components[i].getAnimatedStyle('width')).toBe(expectedValues[i], ComparisonMode.PIXEL);
    }
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  animatedBox: {
    width: 0,
    height: 40,
    marginHorizontal: 30,
    backgroundColor: 'royalblue',
  },
});
