import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface Place {
  id: string;
  name: string;
  country: string;
  sky: string;
  sun: string;
  hills: [string, string];
}

export const PLACES: Place[] = [
  {
    id: 'lavender',
    name: 'Lavender Hills',
    country: 'Provence',
    sky: '#b58df1',
    sun: '#ffe780',
    hills: ['#9b6ee6', '#7d4fd6'],
  },
  {
    id: 'lagoon',
    name: 'Blue Lagoon',
    country: 'Iceland',
    sky: '#87cce8',
    sun: '#fff6c4',
    hills: ['#5fb3d6', '#3d93bd'],
  },
  {
    id: 'coast',
    name: 'Coral Coast',
    country: 'Fiji',
    sky: '#ffa3a1',
    sun: '#ffe780',
    hills: ['#fa7f7c', '#e2605d'],
  },
  {
    id: 'valley',
    name: 'Mint Valley',
    country: 'Tuscany',
    sky: '#b1dfd0',
    sun: '#ffe780',
    hills: ['#82cab2', '#5aa98f'],
  },
];

export function Scenery({ place }: { place: Place }) {
  return (
    <View style={styles.fill}>
      <View style={[styles.sun, { backgroundColor: place.sun }]} />
      <View style={[styles.hillBack, { backgroundColor: place.hills[0] }]} />
      <View style={[styles.hillFront, { backgroundColor: place.hills[1] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    top: '16%',
    right: '16%',
    width: '24%',
    aspectRatio: 1,
    borderRadius: 9999,
  },
  hillBack: {
    position: 'absolute',
    left: '-30%',
    top: '52%',
    width: '110%',
    aspectRatio: 1,
    borderRadius: 9999,
  },
  hillFront: {
    position: 'absolute',
    right: '-45%',
    top: '64%',
    width: '120%',
    aspectRatio: 1,
    borderRadius: 9999,
  },
});
