import type { Song } from './types';

export function clamp(value: number, lowerBound: number, upperBound: number) {
  'worklet';
  return Math.max(lowerBound, Math.min(value, upperBound));
}

export function shuffle(array: Song[]) {
  let counter = array.length;

  while (counter > 0) {
    const index = Math.floor(Math.random() * counter);
    counter--;
    const temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

export function objectMove(
  object: { [id: string]: number },
  from: number,
  to: number
) {
  'worklet';
  const newObject = Object.assign({}, object);

  for (const id in object) {
    if (object[id] === from) {
      newObject[id] = to;
    }

    if (object[id] === to) {
      newObject[id] = from;
    }
  }

  return newObject;
}

export function listToObject(list: Song[]) {
  const values = Object.values(list);
  const object: { [id: string]: number } = {};

  for (let i = 0; i < values.length; i++) {
    object[values[i].id] = i;
  }

  return object;
}
