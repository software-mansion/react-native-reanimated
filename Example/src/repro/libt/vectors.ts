import Animated from 'react-native-reanimated';
import { useSharedValue } from './utils';

type SharedValueType = number;

export type Vector<T extends SharedValueType> = {
  x: T;
  y: T;
};
export type SharedVector<T extends SharedValueType> = {
  x: Animated.SharedValue<T>;
  y: Animated.SharedValue<T>;
};

type VectorType = Vector<any> | SharedVector<any>;

type VectorList = (VectorType | SharedValueType)[];

const _isVector = (value: any): value is Vector<any> => {
  'worklet';

  return typeof value.x !== 'undefined' && value.y !== 'undefined';
};

const isSharedValue = (
  value: any,
): value is Animated.SharedValue<any> => {
  'worklet';

  return typeof value.value !== 'undefined';
};

const _get = <
  T extends Animated.SharedValue<SharedValueType> | SharedValueType
>(
  value: T,
) => {
  'worklet';

  if (isSharedValue(value)) {
    return value.value;
  }

  return value;
};

type Operation = 'divide' | 'add' | 'sub' | 'multiply';

type VectorProp = 'x' | 'y';

const _reduce = (
  operation: Operation,
  prop: VectorProp,
  vectors: VectorList,
) => {
  'worklet';

  const first = vectors[0];
  const rest = vectors.slice(1);

  const initial = _get(_isVector(first) ? first[prop] : first);

  const res = rest.reduce((acc, current) => {
    const value = _get(_isVector(current) ? current[prop] : current);
    const r = (() => {
      switch (operation) {
        case 'divide':
          if (value === 0) {
            return 0;
          }
          return acc / value;
        case 'add':
          return acc + value;
        case 'sub':
          return acc - value;
        case 'multiply':
          return acc * value;
        default:
          return acc;
      }
    })();

    return r;
  }, initial);

  return res;
};

export const useSharedVector = <T>(x: T, y = x) => {
  return {
    x: useSharedValue(x),
    y: useSharedValue(y),
  };
};

export const create = <T extends SharedValueType>(x: T, y: T) => {
  'worklet';

  return {
    x,
    y,
  };
};

export const add = (...vectors: VectorList) => {
  'worklet';

  return {
    x: _reduce('add', 'x', vectors),
    y: _reduce('add', 'y', vectors),
  };
};

export const sub = (...vectors: VectorList) => {
  'worklet';

  return {
    x: _reduce('sub', 'x', vectors),
    y: _reduce('sub', 'y', vectors),
  };
};

export const divide = (...vectors: VectorList) => {
  'worklet';

  return {
    x: _reduce('divide', 'x', vectors),
    y: _reduce('divide', 'y', vectors),
  };
};

export const multiply = (...vectors: VectorList) => {
  'worklet';

  return {
    x: _reduce('multiply', 'x', vectors),
    y: _reduce('multiply', 'y', vectors),
  };
};

export const invert = <T extends Vector<any>>(vector: T) => {
  'worklet';

  return {
    x: _get(vector.x) * -1,
    y: _get(vector.y) * -1,
  };
};

type Callback = () => any;

export const set = <T extends VectorType>(
  vector: T,
  value: VectorType | SharedValueType | Callback,
) => {
  'worklet';

  // handle animation
  if (typeof value === 'function') {
    vector.x.value = value();
    vector.y.value = value();
  }

  const x = _get(_isVector(value) ? value.x : value);
  const y = _get(_isVector(value) ? value.y : value);

  if (typeof vector.x.value !== 'undefined') {
    vector.x.value = x;
    vector.y.value = y;
  } else {
    vector.x = x;
    vector.y = y;
  }
};

export const min = (...vectors: VectorList) => {
  'worklet';

  const getMin = (prop: VectorProp) => {
    return Math.min.apply(
      void 0,
      vectors.map((item) =>
        _get(_isVector(item) ? item[prop] : item),
      ),
    );
  };

  return {
    x: getMin('x'),
    y: getMin('y'),
  };
};

export const max = (...vectors: VectorList) => {
  'worklet';

  const getMax = (prop: VectorProp) =>
    Math.max.apply(
      void 0,
      vectors.map((item) =>
        _get(_isVector(item) ? item[prop] : item),
      ),
    );

  return {
    x: getMax('x'),
    y: getMax('y'),
  };
};

export const clamp = <T extends Vector<any>>(
  value: T,
  lowerBound: VectorType | SharedValueType,
  upperBound: VectorType | SharedValueType,
) => {
  'worklet';

  return min(max(lowerBound, value), upperBound);
};

export const eq = <T extends Vector<any>>(
  vector: T,
  value: VectorType | SharedValueType,
) => {
  'worklet';

  const x = _get(_isVector(value) ? value.x : value);
  const y = _get(_isVector(value) ? value.y : value);

  return _get(vector.x) === x && _get(vector.y) === y;
};
