'use strict';

import type { MapperOutputs, SharedValue } from './commonTypes';

export type MapperExtractedInputs = SharedValue[];

export type Mapper = {
  id: number;
  dirty: boolean;
  worklet: () => void;
  inputs: MapperExtractedInputs;
  outputs?: MapperOutputs;
};
