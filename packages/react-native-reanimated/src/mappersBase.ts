'use strict';

import { scheduleOnUI } from 'react-native-worklets';

import type {
  MapperOutputs,
  MapperRawInputs,
  SharedValue,
} from './commonTypes';

export type MapperExtractedInputs = SharedValue[];

export type Mapper = {
  id: number;
  dirty: boolean;
  worklet: () => void;
  inputs: MapperExtractedInputs;
  outputs?: MapperOutputs;
};

type MapperRegistry = {
  start: (
    mapperID: number,
    worklet: () => void,
    inputs: MapperRawInputs,
    outputs?: MapperOutputs
  ) => void;
  stop: (mapperID: number) => void;
};

let MAPPER_ID = 9999;

export function makeStartMapper(
  createMapperRegistry: () => MapperRegistry
): (
  worklet: () => void,
  inputs?: MapperRawInputs,
  outputs?: MapperOutputs
) => number {
  return function startMapper(
    worklet: () => void,
    inputs: MapperRawInputs = [],
    outputs: MapperOutputs = []
  ): number {
    const mapperID = (MAPPER_ID += 1);

    scheduleOnUI(() => {
      let mapperRegistry = global.__mapperRegistry;
      if (mapperRegistry === undefined) {
        mapperRegistry = global.__mapperRegistry = createMapperRegistry();
      }
      mapperRegistry.start(mapperID, worklet, inputs, outputs);
    });

    return mapperID;
  };
}

export function stopMapper(mapperID: number): void {
  scheduleOnUI(() => {
    const mapperRegistry = global.__mapperRegistry;
    mapperRegistry?.stop(mapperID);
  });
}
