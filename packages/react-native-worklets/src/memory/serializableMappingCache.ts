'use strict';

import type { SerializableRef } from './types';

export const serializableMappingCache = {
  set(_serializable: object, _serializableRef?: SerializableRef): void {
    // NOOP
  },
  get(_key: object): object | symbol | SerializableRef {
    return null!;
  },
};
