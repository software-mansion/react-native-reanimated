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
import invariant from 'fbjs/lib/invariant';
import SpringConfig from './../SpringConfig';

const MAX_STEPS_MS = 64;

function withDefault<T>(value: ?T, defaultValue: T): T {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value;
}

export default function spring(clock, state, config) {
  const lastTime = cond(state.time, state.time, clock);

  const deltaTime = min(sub(clock, lastTime), MAX_STEPS_MS);

  let c;
  let k;
  let m;

  if (
    config.stiffness !== undefined ||
    config.damping !== undefined ||
    config.mass !== undefined
  ) {
    invariant(
      config.bounciness === undefined &&
        config.speed === undefined &&
        config.tension === undefined &&
        config.friction === undefined,
      'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one'
    );
    k = withDefault(config.stiffness, 100);
    c = withDefault(config.damping, 10);
    m = withDefault(config.mass, 1);
  } else if (config.bounciness !== undefined || config.speed !== undefined) {
    // Convert the origami bounciness/speed values to stiffness/damping
    // We assume mass is 1.
    invariant(
      config.tension === undefined &&
        config.friction === undefined &&
        config.stiffness === undefined &&
        config.damping === undefined &&
        config.mass === undefined,
      'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one'
    );
    const springConfig = SpringConfig.fromBouncinessAndSpeed(
      withDefault(config.bounciness, 8),
      withDefault(config.speed, 12)
    );
    k = springConfig.stiffness;
    c = springConfig.damping;
    m = 1;
  } else {
    // Convert the origami tension/friction values to stiffness/damping
    // We assume mass is 1.
    const springConfig = SpringConfig.fromOrigamiTensionAndFriction(
      withDefault(config.tension, 40),
      withDefault(config.friction, 7)
    );
    k = springConfig.stiffness;
    c = springConfig.damping;
    m = 1;
  }

  const v0 = multiply(-1, state.velocity);
  const x0 = sub(config.toValue, state.position);

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
  const underDampedPosition = sub(config.toValue, underDampedFrag1);
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
    config.toValue,
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

  // conditions for stopping the spring animations
  const prevPosition = new AnimatedValue(0);

  const isOvershooting = cond(
    and(config.overshootClamping, neq(config.stiffness, 0)),
    cond(
      lessThan(prevPosition, config.toValue),
      greaterThan(state.position, config.toValue),
      lessThan(state.position, config.toValue)
    )
  );
  const isVelocity = lessThan(abs(state.velocity), config.restSpeedThreshold);
  const isDisplacement = or(
    eq(config.stiffness, 0),
    lessThan(
      abs(sub(config.toValue, state.position)),
      config.restDisplacementThreshold
    )
  );

  return block([
    set(prevPosition, state.position),
    cond(
      lessThan(zeta, 1),
      [
        set(state.position, underDampedPosition),
        set(state.velocity, underDampedVelocity),
      ],
      [
        set(state.position, criticallyDampedPosition),
        set(state.velocity, criticallyDampedVelocity),
      ]
    ),
    set(state.time, clock),
    cond(or(isOvershooting, and(isVelocity, isDisplacement)), [
      cond(neq(config.stiffness, 0), [
        set(state.velocity, 0),
        set(state.position, config.toValue),
      ]),
      set(state.finished, 1),
    ]),
  ]);
}
