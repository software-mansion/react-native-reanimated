import Animated, {
  BaseAnimationBuilder,
  BounceOut,
  CurvedTransition,
  FadingTransition,
  JumpingTransition,
  Layout,
  LightSpeedInLeft,
  LightSpeedInRight,
  PinwheelOut,
  SequencedTransition,
  combineTransition,
} from 'react-native-reanimated';
import { Image, LayoutChangeEvent, Text, View, StyleSheet } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TapGestureHandler } from 'react-native-gesture-handler';

import { Picker } from '@react-native-picker/picker';

const AnimatedImage = Animated.createAnimatedComponent(Image);
type Props = {
  columns: number;
  pokemons: number;
  transition: string;
};
function getRandomColor() {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return randomColor;
}
type PokemonData = {
  ratio: number;
  address: string;
  key: number;
  color: string;
};

function getLayoutTranistion(transition: string): BaseAnimationBuilder {
  switch (transition) {
    case 'FadingTransition':
      return FadingTransition.delay(1000);
    case 'SequencedTransition':
      return SequencedTransition.delay(1000);
    case 'ReverseSequenced':
      return SequencedTransition.reverse().delay(1000);
    case 'JumpingTransition':
      return JumpingTransition.delay(1000).duration(1000);
    case 'CurvedTransition':
      return CurvedTransition.delay(1000);
    case 'EntryExit':
      return combineTransition(
        PinwheelOut.duration(1000),
        LightSpeedInLeft.duration(1000)
      ).delay(1000);
    default:
      return Layout.delay(1000).springify();
  }
}
export function WaterfallGrid({
  columns = 3,
  pokemons = 100,
  transition = 'LinearTransition',
}: Props) {
  const [poks, setPoks] = useState<Array<PokemonData>>([]);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const handleOnLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const newLayout = e.nativeEvent.layout;
      if (
        dims.width !== +newLayout.width ||
        dims.height !== +newLayout.height
      ) {
        setDims({ width: newLayout.width, height: newLayout.height });
      }
    },
    [dims, setDims]
  );
  const margin = 10;
  const width = (dims.width - (columns + 1) * margin) / columns;
  useEffect(() => {
    if (dims.width === 0 || dims.height === 0) {
      return;
    }
    const poks: {
      ratio: number;
      address: string;
      key: number;
      color: string;
    }[] = [];

    for (let i = 0; i < pokemons; i++) {
      const ratio = 1 + Math.random();
      poks.push({
        ratio,
        address: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
        key: i,
        color: `#${getRandomColor()}`,
      });
    }
    setPoks(poks);
  }, [dims, setPoks, pokemons]);
  const [cardsMemo, height] = useMemo<[Array<JSX.Element>, number]>(() => {
    if (poks.length === 0) {
      return [[], 0];
    }
    const layoutTransition = getLayoutTranistion(transition);
    const cardsResult: Array<JSX.Element> = [];
    const heights = new Array(columns).fill(0);
    for (const pok of poks) {
      const cur = Math.floor(Math.random() * (columns - 0.01));
      const pokHeight = width * pok.ratio;
      heights[cur] += pokHeight + margin / 2;
      cardsResult.push(
        <Animated.View
          entering={LightSpeedInRight.delay(cur * 200 * 2).springify()}
          exiting={BounceOut}
          layout={layoutTransition}
          key={pok.address}
          style={[
            {
              width: width,
              height: pokHeight,
              backgroundColor: pok.color,
              left: cur * width + (cur + 1) * margin,
              top: heights[cur] - pokHeight,
            },
            styles.pok,
          ]}>
          <TapGestureHandler
            onHandlerStateChange={() => {
              setPoks(poks.filter((it) => it.key !== pok.key));
            }}>
            <AnimatedImage
              layout={layoutTransition}
              source={{ uri: pok.address }}
              style={{ width: width, height: width }}
            />
          </TapGestureHandler>
        </Animated.View>
      );
    }
    return [cardsResult, Math.max(...heights) + margin / 2];
  }, [poks, columns, transition, width]);
  return (
    <View onLayout={handleOnLayout} style={styles.flexOne}>
      {cardsMemo.length === 0 && <Text> Loading </Text>}
      {cardsMemo.length !== 0 && (
        <ScrollView>
          <View style={{ height: height }}>{cardsMemo}</View>
        </ScrollView>
      )}
    </View>
  );
}
export default function WaterfallGridExample() {
  const [selectedTransition, setSelectedTransition] = useState<string>(
    'SequencedTransition'
  );
  return (
    <View style={styles.flexOne}>
      <View style={styles.pickerContainer}>
        <Picker
          mode="dropdown"
          selectedValue={selectedTransition}
          style={styles.picker}
          itemStyle={{ height: 50 }}
          onValueChange={(itemValue) => {
            setSelectedTransition(itemValue as string);
          }}>
          <Picker.Item label="LinearTransition" value="LinearTransition" />
          <Picker.Item
            label="SequencedTransition"
            value="SequencedTransition"
          />
          <Picker.Item label="ReverseSequenced" value="ReverseSequenced" />
          <Picker.Item label="FadingTransition" value="FadingTransition" />
          <Picker.Item label="JumpingTransition" value="JumpingTransition" />
          <Picker.Item label="CurvedTransition" value="CurvedTransition" />
          <Picker.Item label="EntryExit" value="EntryExit" />
        </Picker>
      </View>
      <WaterfallGrid
        key={selectedTransition}
        columns={3}
        pokemons={10}
        transition={selectedTransition}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  pok: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: 60,
    padding: 10,
  },
  picker: {
    height: 50,
    width: 250,
  },
});
