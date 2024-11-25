/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Button } from 'react-native';
import { useSharedValue, useDerivedValue } from '../..';

function UseDerivedValueTestOldAPI() {
  const progress = useSharedValue(0);
  const width = useDerivedValue(() => {
    return progress.value * 250;
  });
  // @ts-expect-error width is readonly
  width.value = 100;
  return (
    <Button title="Random" onPress={() => (progress.value = Math.random())} />
  );
}

function UseDerivedValueTestNewAPI() {
  const progress = useSharedValue(0);
  const width = useDerivedValue(() => {
    return progress.value * 250;
  });
  // TODO: This should be caught as an illegal operation, since DerivedValue is readonly. We can't enforce it at the moment,
  // since removing the `set` method from `SharedValue` type would break assignments of `DerivedValue` to `SharedValue`,
  // which in turn would induce a breaking change. Instead we mark the `set` method as deprecated and remove it in the future.
  width.set(100);
  return <Button title="Random" onPress={() => progress.set(Math.random())} />;
}
