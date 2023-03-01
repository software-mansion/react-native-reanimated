import Animated, {
  Layout,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { Button, Image, StyleSheet, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';

import CARD_10C from '../assets/cards/10C.png';
import CARD_10D from '../assets/cards/10D.png';
import CARD_10H from '../assets/cards/10H.png';
import CARD_10S from '../assets/cards/10S.png';
import CARD_2C from '../assets/cards/2C.png';
import CARD_2D from '../assets/cards/2D.png';
import CARD_2H from '../assets/cards/2H.png';
import CARD_2S from '../assets/cards/2S.png';
import CARD_3C from '../assets/cards/3C.png';
import CARD_3D from '../assets/cards/3D.png';
import CARD_3H from '../assets/cards/3H.png';
import CARD_3S from '../assets/cards/3S.png';
import CARD_4C from '../assets/cards/4C.png';
import CARD_4D from '../assets/cards/4D.png';
import CARD_4H from '../assets/cards/4H.png';
import CARD_4S from '../assets/cards/4S.png';
import CARD_5C from '../assets/cards/5C.png';
import CARD_5D from '../assets/cards/5D.png';
import CARD_5H from '../assets/cards/5H.png';
import CARD_5S from '../assets/cards/5S.png';
import CARD_6C from '../assets/cards/6C.png';
import CARD_6D from '../assets/cards/6D.png';
import CARD_6H from '../assets/cards/6H.png';
import CARD_6S from '../assets/cards/6S.png';
import CARD_7C from '../assets/cards/7C.png';
import CARD_7D from '../assets/cards/7D.png';
import CARD_7H from '../assets/cards/7H.png';
import CARD_7S from '../assets/cards/7S.png';
import CARD_8C from '../assets/cards/8C.png';
import CARD_8D from '../assets/cards/8D.png';
import CARD_8H from '../assets/cards/8H.png';
import CARD_8S from '../assets/cards/8S.png';
import CARD_9C from '../assets/cards/9C.png';
import CARD_9D from '../assets/cards/9D.png';
import CARD_9H from '../assets/cards/9H.png';
import CARD_9S from '../assets/cards/9S.png';
import CARD_AC from '../assets/cards/AC.png';
import CARD_AD from '../assets/cards/AD.png';
import CARD_AH from '../assets/cards/AH.png';
import CARD_AS from '../assets/cards/AS.png';
import CARD_JC from '../assets/cards/JC.png';
import CARD_JD from '../assets/cards/JD.png';
import CARD_JH from '../assets/cards/JH.png';
import CARD_JS from '../assets/cards/JS.png';
import CARD_KC from '../assets/cards/KC.png';
import CARD_KD from '../assets/cards/KD.png';
import CARD_KH from '../assets/cards/KH.png';
import CARD_KS from '../assets/cards/KS.png';
import CARD_QC from '../assets/cards/QC.png';
import CARD_QD from '../assets/cards/QD.png';
import CARD_QH from '../assets/cards/QH.png';
import CARD_QS from '../assets/cards/QS.png';

const CARDS = {
  '2C': CARD_2C,
  '3C': CARD_3C,
  '4C': CARD_4C,
  '5C': CARD_5C,
  '6C': CARD_6C,
  '7C': CARD_7C,
  '8C': CARD_8C,
  '9C': CARD_9C,
  '10C': CARD_10C,
  JC: CARD_JC,
  QC: CARD_QC,
  KC: CARD_KC,
  AC: CARD_AC,
  '2D': CARD_2D,
  '3D': CARD_3D,
  '4D': CARD_4D,
  '5D': CARD_5D,
  '6D': CARD_6D,
  '7D': CARD_7D,
  '8D': CARD_8D,
  '9D': CARD_9D,
  '10D': CARD_10D,
  JD: CARD_JD,
  QD: CARD_QD,
  KD: CARD_KD,
  AD: CARD_AD,
  '2H': CARD_2H,
  '3H': CARD_3H,
  '4H': CARD_4H,
  '5H': CARD_5H,
  '6H': CARD_6H,
  '7H': CARD_7H,
  '8H': CARD_8H,
  '9H': CARD_9H,
  '10H': CARD_10H,
  JH: CARD_JH,
  QH: CARD_QH,
  KH: CARD_KH,
  AH: CARD_AH,
  '2S': CARD_2S,
  '3S': CARD_3S,
  '4S': CARD_4S,
  '5S': CARD_5S,
  '6S': CARD_6S,
  '7S': CARD_7S,
  '8S': CARD_8S,
  '9S': CARD_9S,
  '10S': CARD_10S,
  JS: CARD_JS,
  QS: CARD_QS,
  KS: CARD_KS,
  AS: CARD_AS,
};

interface PlayingCardProps {
  card: keyof typeof CARDS;
}

function PlayingCard({ card }: PlayingCardProps) {
  return <Image source={CARDS[card]} style={styles.card} />;
}

function getRandomPlayingCard() {
  return {
    card: Object.keys(CARDS)[
      Math.floor(Math.random() * Object.keys(CARDS).length)
    ] as keyof typeof CARDS,
    uid: Math.random(),
  };
}

interface PlayingCard extends PlayingCardProps {
  uid: number;
}

function useIsFirstRender() {
  const ref = useRef(true);

  useEffect(() => {
    ref.current = false;
  }, []);

  return ref.current;
}

export default function PlayingCardsExample() {
  const [deck, setDeck] = useState<PlayingCard[]>(() => {
    return [...new Array(5)].map(getRandomPlayingCard);
  });

  const isFirstRender = useIsFirstRender();

  const addCard = () => {
    setDeck((deck) => [...deck, getRandomPlayingCard()]);
  };

  const removeCard = (index: number) => {
    setDeck((deck) => {
      const newDeck = [...deck];
      newDeck.splice(index, 1);
      return newDeck;
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={styles.deck} layout={Layout}>
        {deck.map(({ card, uid }, index) => (
          <Animated.View
            entering={SlideInUp.delay(isFirstRender ? 3000 + 100 * index : 0)}
            exiting={SlideOutUp}
            layout={Layout}
            key={uid}
            onTouchStart={() => removeCard(index)}>
            <PlayingCard card={card} />
          </Animated.View>
        ))}
      </Animated.View>
      <Button title="Draw card" onPress={addCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deck: {
    flexDirection: 'row',
    marginBottom: 60,
    height: 140, // prevent collapse when deck is empty
    paddingRight: 100, // compensate for negative right margin
  },
  card: {
    width: 130,
    height: 180,
    marginRight: -95,
  },
});
