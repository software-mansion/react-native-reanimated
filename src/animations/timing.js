import {
  cond,
  sub,
  divide,
  multiply,
  add,
  block,
  set,
  greaterOrEq,
} from '../base';

export default function timing(clock, state, config) {
  const lastTime = cond(state.time, state.time, clock);
  const frameTime = add(state.frameTime, sub(clock, lastTime));

  const progress = config.easing(divide(state.frameTime, config.duration));
  const distanceLeft = sub(config.toValue, state.position);
  const fullDistance = divide(distanceLeft, sub(1, progress));
  const startPosition = sub(config.toValue, fullDistance);
  const nextProgress = config.easing(divide(frameTime, config.duration));
  const nextPosition = add(startPosition, multiply(fullDistance, nextProgress));

  return block([
    cond(
      greaterOrEq(frameTime, config.duration),
      [set(state.position, config.toValue), set(state.finished, 1)],
      set(state.position, nextPosition)
    ),
    set(state.frameTime, frameTime),
    set(state.time, clock),
  ]);
}
