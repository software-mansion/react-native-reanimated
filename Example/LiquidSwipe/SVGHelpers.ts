import Animated from "react-native-reanimated";
import { string } from "react-native-redash";

export const moveTo = (
  commands: Animated.Node<string>[],
  x: Animated.Adaptable<number>,
  y: Animated.Adaptable<number>
) => {
  commands.push(string`M${x},${y} `);
};

export const lineTo = (
  commands: Animated.Node<string>[],
  x: Animated.Adaptable<number>,
  y: Animated.Adaptable<number>
) => {
  commands.push(string`L${x},${y} `);
};

interface Point {
  x: Animated.Node<number>;
  y: Animated.Node<number>;
}

interface Curve {
  to: Point;
  c1: Point;
  c2: Point;
}

export const curveTo = (commands: Animated.Node<string>[], c: Curve) => {
  commands.push(
    string`C${c.c1.x},${c.c1.y} ${c.c2.x},${c.c2.y} ${c.to.x},${c.to.y} `
  );
};

export const close = (commands: Animated.Node<string>[]) => {
  commands.push(string`Z`);
};
