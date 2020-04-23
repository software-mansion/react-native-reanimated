import { useWorklet, useSharedValue } from "../Hooks";
import Worklet from "../Worklet";

const defaultState = {
  finished: 0,
  velocity: 0,
  time: 0,
};

const defaultConfig = {
  toValue: 0,
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: 0,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

const workletBody = new Worklet( 
  function (sv, state, config) {
    'worklet';
    const memory = Reanimated.memory(this);

    if (this.justStarted) {
      memory.prevPosition = 0;
      state.finished.set(0);
    }

    const now = Date.now();
    const deltaTime = Math.min(now - state.time.value, 64);
    state.time.set(now);

    memory.prevPosition = sv.value;

    const c = config.damping.value;
    const m = config.mass.value;
    const k = config.stiffness.value;

    const v0 = -state.velocity.value;
    const x0 = config.toValue.value - sv.value;

    const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
    const omega0 = Math.sqrt(k/m); // undamped angular frequency of the oscillator (rad/ms)
    const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

    const t = deltaTime / 1000;

    const sin1 = Math.sin(omega1 * t);
    const cos1 = Math.cos(omega1 * t);

     // under damped
    const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
    const underDampedFrag1 = underDampedEnvelope * (sin1 * ((v0 + zeta * omega0 * x0)/ omega1) + x0 * cos1);

    const underDampedPosition = config.toValue.value - underDampedFrag1;
    // This looks crazy -- it's actually just the derivative of the oscillation function
    const underDampedVelocity = zeta * omega0 * underDampedFrag1 - underDampedEnvelope * (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

    // critically damped
    const criticallyDampedEnvelope = Math.exp((-omega0) * t);
    const criticallyDampedPosition = config.toValue.value - (criticallyDampedEnvelope * (x0 + ((v0 + omega0 * x0) * t)));

    const criticallyDampedVelocity = criticallyDampedEnvelope * ( v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);
    
    const isOvershooting = () => {
      if (config.overshootClamping.value && (config.stiffness.value != 0)) {
        return (memory.prevPosition < config.toValue.value)? (sv.value > config.toValue.value):(sv.value < config.toValue.value);
      } else {
        return false;
      }
    }

    const isVelocity = Math.abs(state.velocity.value) < config.restSpeedThreshold.value;
    const isDisplacement = (config.stiffness.value == 0) || ( Math.abs(config.toValue.value - sv.value) < config.restDisplacementThreshold.value );

    if (zeta < 1) {
      sv.forceSet(underDampedPosition);
      state.velocity.set(underDampedVelocity);
    } else {
      sv.forceSet(criticallyDampedPosition);
      state.velocity.set(criticallyDampedVelocity);
    }

    if (isOvershooting() || (isVelocity && isDisplacement)) {
      if (config.stiffness.value != 0) {
        state.velocity.set(0);
        sv.forceSet(config.toValue.value);
      } 
      state.finished.set(1);
      return true;
    }
  }
);

export default function useSpring(state, config) {
  const properState = useSharedValue(Object.assign({}, defaultState, state));
  const properConfig = useSharedValue(Object.assign({}, defaultConfig, config));
  
  const worklet = useWorklet(workletBody, [0, properState, properConfig]); 

  return useSharedValue(
    {
      worklet,
      state: properState,
      config: properConfig,
    }
  );
}