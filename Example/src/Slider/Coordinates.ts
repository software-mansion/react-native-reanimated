export const canvas2Cartesian = ({ x, y }, center) => {
  "worklet";
  return {
    x: x - center.x,
    y: -1 * (y - center.y),
  };
};

export const cartesian2Canvas = ({ x, y }, center) => {
  "worklet";
  return {
    x: x + center.x,
    y: -1 * y + center.y,
  };
};

export const cartesian2Polar = ({ x, y }) => {
  "worklet";
  return {
    theta: Math.atan2(y, x),
    radius: Math.sqrt(x ** 2 + y ** 2),
  };
};

export const polar2Cartesian = ({ theta, radius }) => {
  "worklet";
  return {
    x: radius * Math.cos(theta),
    y: radius * Math.sin(theta),
  };
};

export const polar2Canvas = ({ theta, radius }, center) => {
  "worklet";
  return cartesian2Canvas(polar2Cartesian({ theta, radius }), center);
};

export const canvas2Polar = ({ x, y }, center) => {
  "worklet";
  return cartesian2Polar(canvas2Cartesian({ x, y }, center));
};
