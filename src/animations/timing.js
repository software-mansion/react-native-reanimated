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
import AnimatedProceduralNode from '../core/AnimatedProcedural';

const innerTiming = (
  clock,
  time,
  frameTime,
  position,
  finished,
  duration,
  toValue,
  progress,
  nextProgress,
  innerFrameTime
) => {
  const distanceLeft = sub(toValue, position);
  const fullDistance = divide(distanceLeft, sub(1, progress));
  const startPosition = sub(toValue, fullDistance);

  const nextPosition = add(startPosition, multiply(fullDistance, nextProgress));

  return block([
    cond(
      greaterOrEq(innerFrameTime, duration),
      [set(position, toValue), set(finished, 1)],
      set(position, nextPosition)
    ),
    set(frameTime, innerFrameTime),
    set(time, clock),
  ]);
};

const timingStatic = new AnimatedProceduralNode(innerTiming);

export default function timing(clock, state, config) {
  const lastTime = cond(state.time, state.time, clock);
  const innerFrameTime = add(state.frameTime, sub(clock, lastTime));
  const progress = config.easing(divide(state.frameTime, config.duration));
  const nextProgress = config.easing(divide(innerFrameTime, config.duration));
  return timingStatic.invoke(
    clock,
    state.time,
    state.frameTime,
    state.position,
    state.finished,
    config.duration,
    config.toValue,
    progress,
    nextProgress,
    innerFrameTime
  );
}
