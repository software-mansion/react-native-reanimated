import Animated, {
  useSharedValue,
  useAnimatedProps,
  createAnimatedPropAdapter,
  TextInputAdapter,
  SVGAdapter,
} from 'react-native-reanimated';
import { SafeAreaView, View, TextInput, Text } from 'react-native';
import React, { useEffect } from 'react';
import { Svg, Path } from 'react-native-svg';

class Hello extends React.Component {
  render() {
    return (
      <Text style={{ fontSize: this.props.helloSize }}>
        The size should keep changing
      </Text>
    );
  }
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedHello = Animated.createAnimatedComponent(Hello);

const helloAdapter = createAnimatedPropAdapter(
  (props) => {
    if (Object.keys(props).includes('helloSize')) {
      props.fontSize = props.helloSize;
      delete props.helloSize;
    }
  },
  ['fontSize']
);

export default function Test() {
  const sv = useSharedValue(10);

  const tiProps = useAnimatedProps(
    () => {
      return {
        value: `this should update: ${sv.value}`,
      };
    },
    null,
    [TextInputAdapter]
  );

  const animatedProps = useAnimatedProps(
    () => {
      return {
        transform: [1, 0, 0, 1, sv.value, sv.value],
      };
    },
    null,
    [SVGAdapter]
  );

  const helloProps = useAnimatedProps(
    () => {
      return {
        helloSize: sv.value,
      };
    },
    null,
    helloAdapter
  );

  useEffect(() => {
    const int = setInterval(() => {
      sv.value = Math.random() * 100;
    }, 300);
    return () => clearInterval(int);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View>
        <Text>The curve should be moving</Text>
        <Svg
          viewBow="0 0 400 400"
          style={{ borderColor: 'red', borderWidth: 2 }}
          width={400}
          height={400}>
          <AnimatedPath
            d="M 40 60 A 10 10 0 0 0 60 60"
            stroke="black"
            transform={{
              rotation: 100,
              translateX: 200,
            }}
            animatedProps={animatedProps}
          />
        </Svg>
        <AnimatedTextInput value="unknown" animatedProps={tiProps} />
        <AnimatedHello animatedProps={helloProps} />
      </View>
    </SafeAreaView>
  );
}
