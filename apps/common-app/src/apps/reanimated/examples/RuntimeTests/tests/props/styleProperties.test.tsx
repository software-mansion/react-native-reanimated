import { useEffect } from 'react';
import { BoxShadowValue, Platform, StyleSheet, View } from 'react-native';
import type { AnimatableValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForNotification,
} from '../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../ReJest/types';

const ANIMATION_DONE = 'ANIMATION_DONE';
const COMPONENT_REF = 'AnimatedComponent';
const ANIMATION_DURATION = 300;

interface TestCase {
  property: string;
  startValue: AnimatableValue;
  endValue: AnimatableValue;
  comparisonMode?: ComparisonMode;
}

interface DiscreteTestCase {
  property: string;
  value: AnimatableValue;
}

function DiscretePropertyComponent({ property, value }: DiscreteTestCase) {
  const ref = useTestRef(COMPONENT_REF);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      [property]: value,
    } as DefaultStyle;
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      notify(ANIMATION_DONE);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, animatedStyle]} />
    </View>
  );
}

function AnimatedPropertyComponent({ property, startValue, endValue }: TestCase) {
  const sv = useSharedValue(startValue);
  const ref = useTestRef(COMPONENT_REF);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      [property]: withTiming(sv.value, { duration: ANIMATION_DURATION }),
    } as DefaultStyle;
  });

  useEffect(() => {
    sv.value = endValue;
    const timeout = setTimeout(() => {
      notify(ANIMATION_DONE);
    }, ANIMATION_DURATION + 200);
    return () => clearTimeout(timeout);
  }, [sv, endValue]);

  return (
    <View style={styles.container}>
      <Animated.View ref={ref} style={[styles.box, animatedStyle]} />
    </View>
  );
}

async function runPropertyTest({ property, startValue, endValue, comparisonMode }: TestCase) {
  await render(<AnimatedPropertyComponent property={property} startValue={startValue} endValue={endValue} />);
  await waitForNotification(ANIMATION_DONE);
  const component = getTestComponent(COMPONENT_REF);
  const finalValue = await component.getAnimatedStyle(property);
  expect(finalValue).toBe(endValue as number, comparisonMode ?? ComparisonMode.PIXEL);
}

// All numeric/dimension style properties from STYLE_PROPERTIES_CONFIG.
const numericProperties: TestCase[] = [
  // Flexbox
  { property: 'flex', startValue: 0, endValue: 1 },
  { property: 'flexBasis', startValue: 0, endValue: 50 },
  { property: 'flexGrow', startValue: 0, endValue: 1 },
  { property: 'flexShrink', startValue: 0, endValue: 1 },
  // Gap — uses processGap processor (the original PR #9154 bug)
  { property: 'gap', startValue: 0, endValue: 10 },
  { property: 'rowGap', startValue: 0, endValue: 10 },
  { property: 'columnGap', startValue: 0, endValue: 10 },
  // Directional
  { property: 'start', startValue: 0, endValue: 10 },
  { property: 'end', startValue: 0, endValue: 10 },
  // Dimensions
  { property: 'height', startValue: 50, endValue: 100 },
  { property: 'width', startValue: 50, endValue: 100 },
  { property: 'maxHeight', startValue: 100, endValue: 200 },
  { property: 'maxWidth', startValue: 100, endValue: 200 },
  { property: 'minHeight', startValue: 0, endValue: 50 },
  { property: 'minWidth', startValue: 0, endValue: 50 },
  // Margins
  { property: 'margin', startValue: 0, endValue: 10 },
  { property: 'marginTop', startValue: 0, endValue: 10 },
  { property: 'marginRight', startValue: 0, endValue: 10 },
  { property: 'marginBottom', startValue: 0, endValue: 10 },
  { property: 'marginLeft', startValue: 0, endValue: 10 },
  { property: 'marginStart', startValue: 0, endValue: 10 },
  { property: 'marginEnd', startValue: 0, endValue: 10 },
  { property: 'marginHorizontal', startValue: 0, endValue: 10 },
  { property: 'marginVertical', startValue: 0, endValue: 10 },
  // Aliased margins
  { property: 'marginBlock', startValue: 0, endValue: 10 },
  { property: 'marginBlockStart', startValue: 0, endValue: 10 },
  { property: 'marginBlockEnd', startValue: 0, endValue: 10 },
  { property: 'marginInline', startValue: 0, endValue: 10 },
  { property: 'marginInlineStart', startValue: 0, endValue: 10 },
  { property: 'marginInlineEnd', startValue: 0, endValue: 10 },
  // Paddings
  { property: 'padding', startValue: 0, endValue: 10 },
  { property: 'paddingTop', startValue: 0, endValue: 10 },
  { property: 'paddingRight', startValue: 0, endValue: 10 },
  { property: 'paddingBottom', startValue: 0, endValue: 10 },
  { property: 'paddingLeft', startValue: 0, endValue: 10 },
  { property: 'paddingStart', startValue: 0, endValue: 10 },
  { property: 'paddingEnd', startValue: 0, endValue: 10 },
  { property: 'paddingHorizontal', startValue: 0, endValue: 10 },
  { property: 'paddingVertical', startValue: 0, endValue: 10 },
  // Aliased paddings
  { property: 'paddingBlock', startValue: 0, endValue: 10 },
  { property: 'paddingBlockStart', startValue: 0, endValue: 10 },
  { property: 'paddingBlockEnd', startValue: 0, endValue: 10 },
  { property: 'paddingInline', startValue: 0, endValue: 10 },
  { property: 'paddingInlineStart', startValue: 0, endValue: 10 },
  { property: 'paddingInlineEnd', startValue: 0, endValue: 10 },
  // Insets
  { property: 'top', startValue: 0, endValue: 10 },
  { property: 'left', startValue: 0, endValue: 10 },
  { property: 'bottom', startValue: 0, endValue: 10 },
  { property: 'right', startValue: 0, endValue: 10 },
  // Insets with processors
  { property: 'inset', startValue: 0, endValue: 10 },
  { property: 'insetBlock', startValue: 0, endValue: 10 },
  { property: 'insetInline', startValue: 0, endValue: 10 },
  // Aliased insets
  { property: 'insetBlockStart', startValue: 0, endValue: 10 },
  { property: 'insetBlockEnd', startValue: 0, endValue: 10 },
  { property: 'insetInlineStart', startValue: 0, endValue: 10 },
  { property: 'insetInlineEnd', startValue: 0, endValue: 10 },
  // Border radius
  { property: 'borderRadius', startValue: 0, endValue: 10 },
  { property: 'borderTopLeftRadius', startValue: 0, endValue: 10 },
  { property: 'borderTopStartRadius', startValue: 0, endValue: 10 },
  { property: 'borderStartStartRadius', startValue: 0, endValue: 10 },
  { property: 'borderTopRightRadius', startValue: 0, endValue: 10 },
  { property: 'borderTopEndRadius', startValue: 0, endValue: 10 },
  { property: 'borderStartEndRadius', startValue: 0, endValue: 10 },
  { property: 'borderBottomLeftRadius', startValue: 0, endValue: 10 },
  { property: 'borderBottomStartRadius', startValue: 0, endValue: 10 },
  { property: 'borderEndStartRadius', startValue: 0, endValue: 10 },
  { property: 'borderBottomRightRadius', startValue: 0, endValue: 10 },
  { property: 'borderBottomEndRadius', startValue: 0, endValue: 10 },
  { property: 'borderEndEndRadius', startValue: 0, endValue: 10 },
  // Border width
  { property: 'borderWidth', startValue: 0, endValue: 5 },
  { property: 'borderTopWidth', startValue: 0, endValue: 5 },
  { property: 'borderBottomWidth', startValue: 0, endValue: 5 },
  { property: 'borderLeftWidth', startValue: 0, endValue: 5 },
  { property: 'borderRightWidth', startValue: 0, endValue: 5 },
  { property: 'borderStartWidth', startValue: 0, endValue: 5 },
  { property: 'borderEndWidth', startValue: 0, endValue: 5 },
  // Outline
  { property: 'outlineOffset', startValue: 0, endValue: 5 },
  { property: 'outlineWidth', startValue: 0, endValue: 3 },
  // Shadows (platform-specific)
  ...(Platform.OS !== 'android'
    ? [
        { property: 'shadowOpacity', startValue: 0, endValue: 1 },
        { property: 'shadowRadius', startValue: 0, endValue: 10 },
      ]
    : [{ property: 'elevation', startValue: 0, endValue: 5 }]),
  { property: 'textShadowRadius', startValue: 0, endValue: 5 },
  // Appearance
  { property: 'opacity', startValue: 0, endValue: 1 },
  { property: 'zIndex', startValue: 0, endValue: 10 },
  // Aspect ratio — uses processAspectRatio processor
  { property: 'aspectRatio', startValue: 1, endValue: 2 },
  // Typography
  { property: 'fontSize', startValue: 12, endValue: 24 },
  { property: 'letterSpacing', startValue: 0, endValue: 2 },
  { property: 'lineHeight', startValue: 16, endValue: 32 },
];

// Color properties — all use processColor.
// Test multiple color formats on backgroundColor, then all other color props with hex.
const colorFormatTests: TestCase[] = [
  // Hex 6-digit
  {
    property: 'backgroundColor',
    startValue: '#ff0000',
    endValue: '#0000ff',
    comparisonMode: ComparisonMode.COLOR,
  },
  // Hex 8-digit (with alpha)
  {
    property: 'backgroundColor',
    startValue: '#ff0000ff',
    endValue: '#0000ffff',
    comparisonMode: ComparisonMode.COLOR,
  },
  // Hex 3-digit shorthand
  {
    property: 'backgroundColor',
    startValue: '#f00',
    endValue: '#00f',
    comparisonMode: ComparisonMode.COLOR,
  },
  // Named colors
  {
    property: 'backgroundColor',
    startValue: 'red',
    endValue: 'blue',
    comparisonMode: ComparisonMode.COLOR,
  },
  // rgba()
  {
    property: 'backgroundColor',
    startValue: 'rgba(255, 0, 0, 1)',
    endValue: 'rgba(0, 0, 255, 1)',
    comparisonMode: ComparisonMode.COLOR,
  },
  // hsl()
  {
    property: 'backgroundColor',
    startValue: 'hsl(0, 100%, 50%)',
    endValue: 'hsl(240, 100%, 50%)',
    comparisonMode: ComparisonMode.COLOR,
  },
];

// All color properties from config.ts tested with one format each.
const allColorProperties: TestCase[] = [
  'backgroundColor',
  'color',
  'textDecorationColor',
  'textShadowColor',
  'borderColor',
  'borderTopColor',
  'borderBlockStartColor',
  'borderRightColor',
  'borderEndColor',
  'borderBottomColor',
  'borderBlockEndColor',
  'borderLeftColor',
  'borderStartColor',
  'borderBlockColor',
  'outlineColor',
  'shadowColor',
  'tintColor',
  ...(Platform.OS === 'android' ? ['overlayColor'] : []),
].map(property => ({
  property,
  startValue: '#ff0000',
  endValue: '#0000ff',
  comparisonMode: ComparisonMode.COLOR,
}));

// Object properties — shadowOffset, textShadowOffset.
const objectProperties: TestCase[] = [
  ...(Platform.OS !== 'android'
    ? [
        {
          property: 'shadowOffset',
          startValue: { width: 0, height: 0 },
          endValue: { width: 10, height: 10 },
          comparisonMode: ComparisonMode.OBJECT,
        },
      ]
    : []),
  {
    property: 'textShadowOffset',
    startValue: { width: 0, height: 0 },
    endValue: { width: 5, height: 5 },
    comparisonMode: ComparisonMode.OBJECT,
  },
];

// Transform — array format and string format. Uses processTransform processor.
const transformTests: TestCase[] = [
  // Array of transform objects
  {
    property: 'transform',
    startValue: [{ translateX: 0 }, { scale: 1 }] as unknown as AnimatableValue,
    endValue: [{ translateX: 50 }, { scale: 2 }] as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.ARRAY,
  },
  // String format
  {
    property: 'transform',
    startValue: 'translateX(0px) scale(1)' as unknown as AnimatableValue,
    endValue: 'translateX(50px) scale(2)' as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.STRING,
  },
];

// TransformOrigin — uses processTransformOrigin processor.
const transformOriginTests: TestCase[] = [
  // String format with keywords
  {
    property: 'transformOrigin',
    startValue: 'center center' as unknown as AnimatableValue,
    endValue: 'left top' as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.STRING,
  },
  // Array format
  {
    property: 'transformOrigin',
    startValue: [0, 0, 0] as unknown as AnimatableValue,
    endValue: [50, 50, 0] as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.ARRAY,
  },
];

// Filter — uses processFilter processor.
const filterTests: TestCase[] = [
  // String format
  {
    property: 'filter',
    startValue: 'brightness(1) opacity(1)' as unknown as AnimatableValue,
    endValue: 'brightness(0.5) opacity(0.5)' as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.STRING,
  },
  // Array of filter objects
  {
    property: 'filter',
    startValue: [{ brightness: 1 }] as unknown as AnimatableValue,
    endValue: [{ brightness: 0.5 }] as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.ARRAY,
  },
];

// Font weight — uses processFontWeight processor.
const fontWeightTests: TestCase[] = [
  {
    property: 'fontWeight',
    startValue: '100' as unknown as AnimatableValue,
    endValue: '900' as unknown as AnimatableValue,
    comparisonMode: ComparisonMode.STRING,
  },
];

// Non-animatable (discrete/enum) properties.
// These can't be interpolated with withTiming but must still work in useAnimatedStyle.
const discreteProperties: DiscreteTestCase[] = [
  // Flexbox enums
  { property: 'flexDirection', value: 'row' as unknown as AnimatableValue },
  { property: 'flexWrap', value: 'wrap' as unknown as AnimatableValue },
  { property: 'justifyContent', value: 'center' as unknown as AnimatableValue },
  { property: 'alignItems', value: 'center' as unknown as AnimatableValue },
  { property: 'alignSelf', value: 'flex-start' as unknown as AnimatableValue },
  { property: 'alignContent', value: 'space-between' as unknown as AnimatableValue },
  { property: 'direction', value: 'ltr' as unknown as AnimatableValue },
  // Layout enums
  { property: 'position', value: 'absolute' as unknown as AnimatableValue },
  { property: 'display', value: 'flex' as unknown as AnimatableValue },
  { property: 'overflow', value: 'hidden' as unknown as AnimatableValue },
  // Border / outline style
  { property: 'borderStyle', value: 'solid' as unknown as AnimatableValue },
  { property: 'outlineStyle', value: 'solid' as unknown as AnimatableValue },
  // Appearance
  { property: 'backfaceVisibility', value: 'hidden' as unknown as AnimatableValue },
  { property: 'mixBlendMode', value: 'multiply' as unknown as AnimatableValue },
  // Typography
  { property: 'fontFamily', value: 'monospace' as unknown as AnimatableValue },
  { property: 'fontStyle', value: 'italic' as unknown as AnimatableValue },
  { property: 'fontVariant', value: 'small-caps' as unknown as AnimatableValue },
  { property: 'textAlign', value: 'center' as unknown as AnimatableValue },
  { property: 'textAlignVertical', value: 'center' as unknown as AnimatableValue },
  { property: 'textTransform', value: 'uppercase' as unknown as AnimatableValue },
  { property: 'textDecorationLine', value: 'underline' as unknown as AnimatableValue },
  { property: 'textDecorationStyle', value: 'solid' as unknown as AnimatableValue },
  { property: 'userSelect', value: 'none' as unknown as AnimatableValue },
  { property: 'includeFontPadding', value: 'false' as unknown as AnimatableValue },
  // Image / interaction
  { property: 'resizeMode', value: 'cover' as unknown as AnimatableValue },
  { property: 'cursor', value: 'pointer' as unknown as AnimatableValue },
  { property: 'pointerEvents', value: 'none' as unknown as AnimatableValue },
  { property: 'isolation', value: 'isolate' as unknown as AnimatableValue },
];

describe('Animate numeric style properties', () => {
  test.each(numericProperties)('${property} from ${startValue} to ${endValue}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate color formats on backgroundColor', () => {
  test.each(colorFormatTests)('${property} ${startValue} -> ${endValue}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate all color properties', () => {
  test.each(allColorProperties)('${property}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate object style properties', () => {
  test.each(objectProperties)('${property}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate transform property', () => {
  test.each(transformTests)('transform ${startValue}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate transformOrigin property', () => {
  test.each(transformOriginTests)('transformOrigin ${startValue}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate filter property', () => {
  test.each(filterTests)('filter ${startValue}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Animate fontWeight property', () => {
  test.each(fontWeightTests)('fontWeight ${startValue} -> ${endValue}', async (testCase: TestCase) => {
    await runPropertyTest(testCase);
  });
});

describe('Set discrete (non-animatable) style properties via useAnimatedStyle', () => {
  test.each(discreteProperties)('${property} = ${value}', async ({ property, value }: DiscreteTestCase) => {
    await render(<DiscretePropertyComponent property={property} value={value} />);
    await waitForNotification(ANIMATION_DONE);
    const component = getTestComponent(COMPONENT_REF);
    const finalValue = await component.getAnimatedStyle(property);
    expect(finalValue).toBe(value as string, ComparisonMode.STRING);
  });
});

// BoxShadow — uses processBoxShadow processor. Tests active (withSpring) and passive animation.
const BOX_SHADOW_DONE = 'BOX_SHADOW_DONE';

describe('Animate boxShadow property', () => {
  function BoxShadowComponent({
    startBoxShadow,
    finalBoxShadow,
  }: {
    startBoxShadow: BoxShadowValue;
    finalBoxShadow: BoxShadowValue;
  }) {
    const activeSV = useSharedValue(startBoxShadow);
    const passiveSV = useSharedValue(startBoxShadow);

    const refActive = useTestRef('ACTIVE');
    const refPassive = useTestRef('PASSIVE');

    const styleActive = useAnimatedStyle(() => {
      return { boxShadow: [activeSV.value] } as DefaultStyle;
    });

    const stylePassive = useAnimatedStyle(() => {
      return { boxShadow: [passiveSV.value] } as DefaultStyle;
    });

    useEffect(() => {
      const timeout = setTimeout(() => {
        activeSV.value = withSpring(finalBoxShadow as unknown as AnimatableValue, { duration: 300 }, () => {
          notify(BOX_SHADOW_DONE);
        }) as unknown as BoxShadowValue;
        passiveSV.value = finalBoxShadow;
      }, 500);
      return () => clearTimeout(timeout);
    }, [finalBoxShadow, activeSV, passiveSV]);

    return (
      <View style={styles.container}>
        <Animated.View ref={refActive} style={[styles.box, styleActive]} />
        <Animated.View ref={refPassive} style={[styles.box, stylePassive]} />
      </View>
    );
  }

  test.each([
    {
      description: 'object format',
      startBoxShadow: { blurRadius: 7, color: '#ff0000fe', offsetX: -10, offsetY: 6, spreadDistance: 10, inset: false },
      finalBoxShadow: {
        blurRadius: 10,
        color: '#ff0000ff',
        offsetX: -20,
        offsetY: 4,
        spreadDistance: 20,
        inset: false,
      },
    },
  ])('boxShadow $description', async ({ startBoxShadow, finalBoxShadow }) => {
    await render(<BoxShadowComponent startBoxShadow={startBoxShadow} finalBoxShadow={finalBoxShadow} />);

    const active = getTestComponent('ACTIVE');
    const passive = getTestComponent('PASSIVE');

    const activeBefore = JSON.parse(await active.getAnimatedStyle('boxShadow')) as unknown as BoxShadowValue[];
    const passiveBefore = JSON.parse(await passive.getAnimatedStyle('boxShadow')) as unknown as BoxShadowValue[];
    expect(activeBefore).toBe([startBoxShadow], ComparisonMode.ARRAY);
    expect(passiveBefore).toBe([startBoxShadow], ComparisonMode.ARRAY);

    await waitForNotification(BOX_SHADOW_DONE);

    const activeAfter = JSON.parse(await active.getAnimatedStyle('boxShadow')) as unknown as BoxShadowValue[];
    const passiveAfter = JSON.parse(await passive.getAnimatedStyle('boxShadow')) as unknown as BoxShadowValue[];
    expect(activeAfter).toBe([finalBoxShadow], ComparisonMode.ARRAY);
    expect(passiveAfter).toBe([finalBoxShadow], ComparisonMode.ARRAY);
  });
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'palevioletred',
    borderColor: 'black',
    borderWidth: 1,
    height: 50,
    width: 50,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
