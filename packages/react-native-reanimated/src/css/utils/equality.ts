'use strict';
export function areArraysEqual<T>(array1: T[], array2: T[]): boolean {
  if (array1.length !== array2.length) {
    return false;
  }

  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }

  return true;
}

export function deepEqual<T>(obj1: T, obj2: T): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 === null ||
    obj2 === null
  ) {
    return false;
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }

  // If one is an array and the other is not
  if (Array.isArray(obj1) || Array.isArray(obj2)) {
    return false;
  }

  // Handle objects
  const keys1 = Object.keys(obj1) as (keyof T)[];
  const keys2 = Object.keys(obj2) as (keyof T)[];

  if (keys1.length !== keys2.length) {
    return false;
  }

  const keysSet2 = new Set(keys2);
  for (const key of keys1) {
    if (!keysSet2.has(key)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}
