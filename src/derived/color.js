import { cond, lessThan, multiply, round, add, sub } from '../base';
import { Platform } from 'react-native';
import AnimatedNode from '../core/AnimatedNode';

export default function color(r, g, b, a = 1) {
  if (a instanceof AnimatedNode) {
    a = round(multiply(a, 255));
  } else {
    a = Math.round(a * 255);
  }
  const color = add(
    multiply(a, 1 << 24),
    multiply(r, 1 << 16),
    multiply(g, 1 << 8),
    b
  );
  if (Platform.OS === 'android') {
    // on Android color is represented as signed 32 bit int
    return cond(
      lessThan(color, (1 << 31) >>> 0),
      color,
      sub(color, Math.pow(2, 32))
    );
  }
  return color;
}
