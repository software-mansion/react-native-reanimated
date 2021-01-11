import Animated, {
  useSharedValue,
  useAnimatedProps,
  createAnimatedPropAdapter,
  TextInputAdapter,
  SVGAdapter,
} from 'react-native-reanimated';
import { Button, SafeAreaView, View, TextInput, Text } from 'react-native';
import React from 'react';
import { Svg, Path } from 'react-native-svg';

class Hello extends React.Component {
  render() {
    return <Text style={{ fontSize: this.props.helloSize }}>Hello</Text>;
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
        value: `rnd: ${sv.value}`,
      };
    },
    null,
    [TextInputAdapter, SVGAdapter]
  );

  const animatedProps = useAnimatedProps(
    () => {
      return {
        transform: [1, 0, 0, 1, sv.value, 0],
      };
    },
    null,
    [TextInputAdapter, SVGAdapter]
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View>
        <Button
          title="toggle"
          onPress={() => {
            sv.value = Math.random() * 100;
          }}
          style={{ backgroundColor: 'red' }}
        />
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
