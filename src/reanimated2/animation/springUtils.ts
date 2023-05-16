export function bisectRoot({
  min,
  max,
  func,
  maxIterations = 20,
}: {
  min: number;
  max: number;
  func: (x: number) => number;
  maxIterations?: number;
}) {
  'worklet';
  const ACCURACY = 0.005;
  let idx = maxIterations;
  let current = (max + min) / 2;
  while (Math.abs(func(current)) > ACCURACY && idx > 0) {
    idx -= 1;

    if (func(current) < 0) {
      min = current;
    } else {
      max = current;
    }
    current = (min + max) / 2;
  }
  return current;
}
