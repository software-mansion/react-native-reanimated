import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import Animated, { SlideInLeft, SlideOutRight } from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Pokemon {
  pokemonName: string;
  firstType: string;
  secondType: string;
  img: ImageSourcePropType;
}

const DATA: Pokemon[] = [
  {
    pokemonName: 'Bulbasaur',
    firstType: 'poison',
    secondType: 'grass',
    img: require('./Bulbasaur.png'),
  },
  {
    pokemonName: 'Charizard',
    firstType: 'Fire',
    secondType: 'flying',
    img: require('./Charizard.png'),
  },
  {
    pokemonName: 'Butterfree',
    firstType: 'Bug',
    secondType: 'flying',
    img: require('./Butterfree.png'),
  },
];

function AnimatedView({ pokemon }: { pokemon: Pokemon }) {
  return (
    <Animated.View
      entering={SlideInLeft}
      exiting={SlideOutRight}
      style={[styles.animatedView]}>
      <AnimatedImage
        entering={SlideInLeft.delay(300).springify()}
        source={pokemon.img}
      />
      <Animated.View
        entering={SlideInLeft.delay(500).springify()}
        exiting={SlideOutRight}>
        <Text> {pokemon.firstType} </Text>
        <Text> {pokemon.secondType}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function Carousel(): React.ReactElement {
  const [currentIndex, incrementIndex] = useState(0);
  return (
    <View style={{ flexDirection: 'column-reverse' }}>
      <Button
        title="toggle"
        onPress={() => {
          incrementIndex((prev) => (prev + 1) % DATA.length);
        }}
      />
      <View
        style={{
          height: 400,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
        }}>
        <AnimatedView key={currentIndex} pokemon={DATA[currentIndex]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  animatedView: {
    height: 300,
    width: 200,
    borderWidth: 1,
    borderColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'red',
  },
});
