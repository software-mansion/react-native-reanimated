/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  useSharedValue,
  useAnimatedStyle,
  interpolateColor,
  makeMutable,
  createAnimatedPropAdapter,
  useAnimatedProps,
  isSharedValue,
  makeShareableCloneRecursive,
} from '../..';

function MakeMutableTest() {
  const mut1 = makeMutable(0);
  const mut2 = makeMutable(true);
}

function MakeShareableCloneRecursiveTest() {
  const mut1 = makeShareableCloneRecursive(0);
  const mut2 = makeShareableCloneRecursive(true);
  const mut3 = makeShareableCloneRecursive({ foo: 'bar' });
}

function IsSharedValueTest() {
  const sv = useSharedValue(0);

  isSharedValue(null);
  isSharedValue(undefined);
  isSharedValue(42);
  isSharedValue('foo');
  isSharedValue({ foo: 'bar' });
  isSharedValue(sv);
}

function InterpolateColorTest() {
  const sv = useSharedValue(0);

  interpolateColor(sv.value, [0, 1], [0x00ff00, 0x0000ff]);
  interpolateColor(sv.value, [0, 1], ['red', 'blue']);
  interpolateColor(sv.value, [0, 1], ['#00FF00', '#0000FF'], 'RGB');
  interpolateColor(sv.value, [0, 1], ['#FF0000', '#00FF99'], 'HSV');

  return null;
}

function UpdatePropsTest() {
  const adapter1 = createAnimatedPropAdapter((props) => {}, []);
  const adapter2 = createAnimatedPropAdapter((props) => {}, ['prop1', 'prop2']);
  const adapter3 = createAnimatedPropAdapter(() => {});

  // @ts-expect-error works only for useAnimatedProps
  useAnimatedStyle(() => ({}), undefined, [adapter1, adapter2, adapter3]);

  useAnimatedProps(() => ({}), null, adapter1);

  useAnimatedProps(() => ({}), null, [adapter2, adapter3]);
}
