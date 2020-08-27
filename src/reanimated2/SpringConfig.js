function stiffnessFromOrigamiValue(oValue) {
  'worklet';

  return (oValue - 30) * 3.62 + 194;
}

function dampingFromOrigamiValue(oValue) {
  'worklet';

  return (oValue - 8) * 3 + 25;
}

export function fromOrigamiTensionAndFriction(tension, friction) {
  'worklet';

  return {
    stiffness: stiffnessFromOrigamiValue(tension),
    damping: dampingFromOrigamiValue(friction),
  };
}

export function fromBouncinessAndSpeed(bounciness, speed) {
  'wroklet';

  function normalize(value, startValue, endValue) {
    return (value - startValue) / (endValue - startValue);
  }

  function projectNormal(n, start, end) {
    return start + n * (end - start);
  }

  function linearInterpolation(t, start, end) {
    return t * end + (1 - t) * start;
  }

  function quadraticOutInterpolation(t, start, end) {
    return linearInterpolation(2 * t - t * t, start, end);
  }

  function b3Friction1(x) {
    return 0.0007 * Math.pow(x, 3) - 0.031 * Math.pow(x, 2) + 0.64 * x + 1.28;
  }

  function b3Friction2(x) {
    return 0.000044 * Math.pow(x, 3) - 0.006 * Math.pow(x, 2) + 0.36 * x + 2;
  }

  function b3Friction3(x) {
    return (
      0.00000045 * Math.pow(x, 3) -
      0.000332 * Math.pow(x, 2) +
      0.1078 * x +
      5.84
    );
  }

  function b3Nobounce(tension) {
    if (tension <= 18) {
      return b3Friction1(tension);
    } else if (tension > 18 && tension <= 44) {
      return b3Friction2(tension);
    } else {
      return b3Friction3(tension);
    }
  }

  let b = normalize(bounciness / 1.7, 0, 20);
  b = projectNormal(b, 0, 0.8);
  const s = normalize(speed / 1.7, 0, 20);
  const bouncyTension = projectNormal(s, 0.5, 200);
  const bouncyFriction = quadraticOutInterpolation(
    b,
    b3Nobounce(bouncyTension),
    0.01
  );

  return {
    stiffness: stiffnessFromOrigamiValue(bouncyTension),
    damping: dampingFromOrigamiValue(bouncyFriction),
  };
}

function invariant(testValue, errorText) {
  'worklet';

  if (!testValue) {
    throw new Error(errorText);
  }
}

export function processSpringConfig(config) {
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
    config.stiffness = config.stiffness ?? 100;
    config.damping = config.damping ?? 10;
    config.mass = config.mass ?? 1;
  } else if (config.bounciness !== undefined || config.speed !== undefined) {
    invariant(
      config.tension === undefined &&
        config.friction === undefined &&
        config.stiffness === undefined &&
        config.damping === undefined &&
        config.mass === undefined,
      'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one'
    );
    const springConfig = fromBouncinessAndSpeed(
      config.bounciness ?? 8,
      config.speed ?? 12
    );
    config.stiffness = springConfig.stiffness;
    config.damping = springConfig.damping;
    config.mass = config.mass ?? 1;
  } else {
    const springConfig = fromOrigamiTensionAndFriction(
      config.tension ?? 40,
      config.friction ?? 7
    );
    config.stiffness = springConfig.stiffness;
    config.damping = springConfig.damping;
    config.mass = config.mass ?? 1;
  }

  invariant(config.stiffness > 0, 'Stiffness value must be greater than 0');
  invariant(config.damping > 0, 'Damping value must be greater than 0');
  invariant(config.mass > 0, 'Mass value must be greater than 0');
}
