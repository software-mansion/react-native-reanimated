import {
  cond,
  sub,
  divide,
  multiply,
  add,
  block,
  set,
  greaterOrEq,
  defined,
} from '../base';

export default function timing(clock, state, config) {
  const lastTime = cond(state.time, state.time, clock);
  const frameTime = add(state.frameTime, sub(clock, lastTime));

  const duration = add(config.duration, config.delay);
  const progress = config.easing(divide(state.frameTime, duration));
  const distanceLeft = sub(config.toValue, state.position);
  const fullDistance = divide(distanceLeft, sub(1, progress));
  const startPosition = sub(config.toValue, fullDistance);
  const delay = cond(defined(config.delay), config.delay, 0);
  const passedDelay = cond(greaterOrEq(frameTime, delay), 1, 0);
  const nextProgress = config.easing(divide(frameTime, duration));
  const nextPosition = add(startPosition, multiply(fullDistance, nextProgress));

  return block([
    cond(
      greaterOrEq(frameTime, duration),
      [set(state.position, config.toValue), set(state.finished, 1)],
      set(state.position, cond(passedDelay, nextPosition, state.position))
    ),
    set(state.frameTime, frameTime),
    set(state.time, clock),
  ]);
}
