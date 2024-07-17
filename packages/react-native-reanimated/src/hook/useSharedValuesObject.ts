/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import type { SharedValue } from "../commonTypes";
import { cancelAnimations } from "../animation/util";
import { shouldBeUseWeb } from "../PlatformChecker";
import { makeMutable } from "../mutables";

const SHOULD_USE_WEB = shouldBeUseWeb();
const DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD = 30;

class Mutable<V> {
  value: V;
  constructor(value: V) {
    this.value = value;
  }
}

function mutable<Value>(value: Value): Mutable<Value> {
  return new Mutable(value);
}

export type SharedValuesObjectFactoryParams = {
  mutable: typeof mutable;
};

type SharedValuesObject<Obj extends Record<string, any>> = {
  [K in keyof Obj]: Obj[K] extends Mutable<infer V> ? SharedValue<V> : Obj[K];
};

type Simplify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

function makeSharedValuesObjectRecursive<Obj extends Record<string, any>>(
  obj: Obj,
  mutableValues: SharedValue[],
  depth = 0
): {
  result: SharedValuesObject<Obj>;
  mutableValues: SharedValue[];
} {
  if (SHOULD_USE_WEB) {
    return { result: obj, mutableValues };
  }
  if (depth > DETECT_CYCLIC_OBJECT_DEPTH_THRESHOLD) {
    throw new Error('[Reanimated] Trying to create a shared value object from a cyclic object. This is not supported.');
  }

  const result = {} as SharedValuesObject<Obj>;

  for (const key in obj) {
    const value = obj[key] as any;
    if (value instanceof Mutable) {
      const sharedValue = makeMutable(value.value);
      mutableValues.push(sharedValue);
      result[key] = sharedValue as any;
    } else if (typeof value === "object") {
      const { result: deepResult, mutableValues: deepMutableValues } =
        makeSharedValuesObjectRecursive(value, mutableValues);
      result[key] = deepResult as any;
      mutableValues = deepMutableValues;
    } else {
      result[key] = value;
    }
  }

  return { result, mutableValues };
}

/**
 * Lets you define an object which props can be shared values.
 * 
 * @param factory - A function that returns an object with props that can be shared values.
 * @returns An object with props that can be shared values.
 */
export function useSharedValuesObject<Obj extends Record<string, any>>(
  factory: (params: SharedValuesObjectFactoryParams) => Obj
): Simplify<SharedValuesObject<Obj>> {
  const factoryRef = useRef<typeof factory>();
  const resultRef = useRef<SharedValuesObject<Obj>>();
  const mutableValuesRef = useRef<SharedValue[]>([]);

  useEffect(() => {
    return () => {
      cancelAnimations(mutableValuesRef.current);
    };
  }, []);

  if (factoryRef.current !== factory) {
    cancelAnimations(mutableValuesRef.current);
    factoryRef.current = factory;
    const { result, mutableValues } = makeSharedValuesObjectRecursive(
      factory({ mutable }),
      []
    );
    mutableValuesRef.current = mutableValues;
    resultRef.current = result;
  }

  return resultRef.current!;
}
