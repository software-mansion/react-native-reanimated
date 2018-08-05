import {
  cond,
  sub,
  divide,
  multiply,
  sqrt,
  add,
  block,
  set,
  exp,
  sin,
  cos,
  eq,
  or,
  neq,
  and,
  lessThan,
  greaterThan,
} from '../base';
import { min, abs } from '../derived';
import AnimatedValue from '../core/AnimatedValue';
import AnimatedProceduralNode from '../core/AnimatedProceduralNode';

const MAX_STEPS_MS = 64;

const innerSpring = (
  clock,
  position,
  velocity,
  finished,
  time,
  damping,
  stiffness,
  mass,
  toValue,
  overshootClamping,
  restSpeedThreshold,
  restDisplacementThreshold,
  prevPosition
) => {
  const lastTime = cond(time, time, clock);

  const deltaTime = min(sub(clock, lastTime), MAX_STEPS_MS);

  const c = damping;
  const m = mass;
  const k = stiffness;

  const v0 = multiply(-1, velocity);
  const x0 = sub(toValue, position);

  const zeta = divide(c, multiply(2, sqrt(multiply(k, m)))); // damping ratio
  const omega0 = sqrt(divide(k, m)); // undamped angular frequency of the oscillator (rad/ms)
  const omega1 = multiply(omega0, sqrt(sub(1, multiply(zeta, zeta)))); // exponential decay

  const t = divide(deltaTime, 1000); // in seconds

  const sin1 = sin(multiply(omega1, t));
  const cos1 = cos(multiply(omega1, t));

  // under damped
  const underDampedEnvelope = exp(multiply(-1, zeta, omega0, t));
  const underDampedFrag1 = multiply(
    underDampedEnvelope,
    add(
      multiply(sin1, divide(add(v0, multiply(zeta, omega0, x0)), omega1)),
      multiply(x0, cos1)
    )
  );
  const underDampedPosition = sub(toValue, underDampedFrag1);
  // This looks crazy -- it's actually just the derivative of the oscillation function
  const underDampedVelocity = sub(
    multiply(zeta, omega0, underDampedFrag1),
    multiply(
      underDampedEnvelope,
      sub(
        multiply(cos1, add(v0, multiply(zeta, omega0, x0))),
        multiply(omega1, x0, sin1)
      )
    )
  );

  // critically damped
  const criticallyDampedEnvelope = exp(multiply(-1, omega0, t));
  const criticallyDampedPosition = sub(
    toValue,
    multiply(
      criticallyDampedEnvelope,
      add(x0, multiply(add(v0, multiply(omega0, x0)), t))
    )
  );
  const criticallyDampedVelocity = multiply(
    criticallyDampedEnvelope,
    add(
      multiply(v0, sub(multiply(t, omega0), 1)),
      multiply(t, x0, omega0, omega0)
    )
  );

  const isOvershooting = cond(
    and(overshootClamping, neq(stiffness, 0)),
    cond(
      lessThan(prevPosition, toValue),
      greaterThan(position, toValue),
      lessThan(position, toValue)
    )
  );
  const isVelocity = lessThan(abs(velocity), restSpeedThreshold);
  const isDisplacement = or(
    eq(stiffness, 0),
    lessThan(abs(sub(toValue, position)), restDisplacementThreshold)
  );

  return block([
    set(prevPosition, position),
    cond(
      lessThan(zeta, 1),
      [set(position, underDampedPosition), set(velocity, underDampedVelocity)],
      [
        set(position, criticallyDampedPosition),
        set(velocity, criticallyDampedVelocity),
      ]
    ),
    set(time, clock),
    cond(or(isOvershooting, and(isVelocity, isDisplacement)), [
      cond(neq(stiffness, 0), [set(velocity, 0), set(position, toValue)]),
      set(finished, 1),
    ]),
  ]);
};

const springStatic = new AnimatedProceduralNode(innerSpring);

export default function spring(clock, state, config) {
  // conditions for stopping the spring animations
  const prevPosition = new AnimatedValue(0);
  return springStatic.invoke(
    clock,
    state.position,
    state.velocity,
    state.finished,
    state.time,
    config.damping,
    config.stiffness,
    config.mass,
    config.toValue,
    config.overshootClamping,
    config.restSpeedThreshold,
    config.restDisplacementThreshold,
    prevPosition
  );
}
