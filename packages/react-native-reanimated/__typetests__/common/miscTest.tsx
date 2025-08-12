/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Easing,
  interpolateColor,
  isSharedValue,
  Keyframe,
  makeMutable,
  useSharedValue,
} from '../..';

function MakeMutableTest() {
  const mut1 = makeMutable(0);
  const mut2 = makeMutable(true);
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

function EasingFactoryFunctionTest() {
  const easing = Easing.bezier(0.1, 0.7, 1, 0.1);

  const keyframe = new Keyframe({
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
      easing,
    },
  });
}
