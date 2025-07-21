import React, { useState } from 'react';
import Example from './Example';

import { Range, CheckboxOption, SelectOption, formatReduceMotion } from '..';
import { ReduceMotion, WithSpringConfig } from 'react-native-reanimated';

const reanimated3DefaultConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
  // velocity: 0,
  duration: 2000,
  dampingRatio: 0.5,
  reduceMotion: ReduceMotion.System,
};

export function useReanimated3SpringPlayground() {
  const [isPhysicsBased, setPhysicsBased] = useState(true);

  const [damping, setDamping] = useState(reanimated3DefaultConfig.damping);
  const [mass, setMass] = useState(reanimated3DefaultConfig.mass);
  const [stiffness, setStiffness] = useState(
    reanimated3DefaultConfig.stiffness
  );
  // const [velocity, setVelocity] = useState(0);
  const [overshootClamping, setOvershootClamping] = useState(
    reanimated3DefaultConfig.overshootClamping
  );
  const [restDisplacementThreshold, setRestDisplacementThreshold] = useState(
    reanimated3DefaultConfig.restDisplacementThreshold
  );
  const [restSpeedThreshold, setRestSpeedThreshold] = useState(
    reanimated3DefaultConfig.restSpeedThreshold
  );
  const [duration, setDuration] = useState(reanimated3DefaultConfig.duration);
  const [dampingRatio, setDampingRatio] = useState(
    reanimated3DefaultConfig.dampingRatio
  );
  const [reduceMotion, setReduceMotion] = useState(
    reanimated3DefaultConfig.reduceMotion
  );

  const resetOptions = () => {
    setDamping(() => reanimated3DefaultConfig.damping);
    setMass(() => reanimated3DefaultConfig.mass);

    setDuration(() => reanimated3DefaultConfig.duration);
    setDampingRatio(() => reanimated3DefaultConfig.dampingRatio);

    setStiffness(() => reanimated3DefaultConfig.stiffness);
    setOvershootClamping(() => reanimated3DefaultConfig.overshootClamping);
    setRestDisplacementThreshold(
      () => reanimated3DefaultConfig.restDisplacementThreshold
    );
    setRestSpeedThreshold(() => reanimated3DefaultConfig.restSpeedThreshold);
  };

  const code = `
    withSpring(sv.value, {
      ${
        isPhysicsBased
          ? `mass: ${mass},
      damping: ${damping},`
          : `duration: ${duration},
      dampingRatio: ${dampingRatio},`
      }
      stiffness: ${stiffness},
      overshootClamping: ${overshootClamping},
      restDisplacementThreshold: ${restDisplacementThreshold},
      restSpeedThreshold: ${restSpeedThreshold},
      reduceMotion: ${formatReduceMotion(reduceMotion)},
    })
  `;

  const controls = (
    <>
      {/* Needed state-controlled Tabs and `TabItem` components from "@theme/Tabs" so I hacked them around with classes ;) */}
      <ul role="tablist">
        <li
          role="tab"
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            isPhysicsBased && 'tabs__item--active'
          }`}
          onClick={() => setPhysicsBased(true)}>
          Physics-based
        </li>
        <li
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            !isPhysicsBased && 'tabs__item--active'
          }`}
          role="tab"
          onClick={() => setPhysicsBased(false)}>
          Duration-based
        </li>
      </ul>
      {isPhysicsBased ? (
        <>
          <Range
            label="Mass"
            min={1}
            max={20}
            step={0.1}
            value={mass}
            onChange={setMass}
          />
          <Range
            label="Damping"
            min={1}
            max={100}
            value={damping}
            onChange={setDamping}
          />
        </>
      ) : (
        <>
          <Range
            label="Duration"
            min={1}
            max={5000}
            step={50}
            value={duration}
            onChange={setDuration}
          />
          <Range
            label="Damping ratio"
            min={0.1}
            max={3}
            step={0.1}
            value={dampingRatio}
            onChange={setDampingRatio}
          />
        </>
      )}
      <Range
        label="Stiffness"
        min={1}
        max={500}
        value={stiffness}
        onChange={setStiffness}
      />
      {/* <Range
        label="Velocity"
        min={-50}
        max={50}
        value={velocity}
        onChange={setVelocity}
      /> */}
      <CheckboxOption
        label="Clamp"
        value={overshootClamping}
        onChange={setOvershootClamping}
      />
      <Range
        label="Displacement threshold"
        min={0.01}
        max={150}
        step={0.01}
        value={restDisplacementThreshold}
        onChange={setRestDisplacementThreshold}
      />
      <Range
        label="Speed threshold"
        min={0.01}
        max={150}
        step={0.01}
        value={restSpeedThreshold}
        onChange={setRestSpeedThreshold}
      />
      <SelectOption
        label="Reduce motion"
        value={reduceMotion}
        onChange={(option) => setReduceMotion(option as ReduceMotion)}
        options={[ReduceMotion.System, ReduceMotion.Always, ReduceMotion.Never]}
      />
    </>
  );

  const options: WithSpringConfig = isPhysicsBased
    ? { mass, damping }
    : { duration, dampingRatio };
  const restOptions = {
    stiffness,
    // velocity,
    overshootClamping,
    restDisplacementThreshold,
    restSpeedThreshold,
    reduceMotion,
  };

  return {
    example: Example,
    props: {
      options: {
        ...options,
        ...restOptions,
      },
    },
    controls,
    code,
    resetOptions,
    additionalComponents: {},
  };
}

const reanimated4DefaultConfig = {
  damping: 120,
  mass: 4,
  stiffness: 900,
  overshootClamping: false,
  energyThreshold: 6e-9,
  velocity: 0,
  duration: 550,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
};

export function useReanimated4SpringPlayground() {
  const [isPhysicsBased, setPhysicsBased] = useState(true);

  const [damping, setDamping] = useState(reanimated4DefaultConfig.damping);
  const [mass, setMass] = useState(reanimated4DefaultConfig.mass);
  const [stiffness, setStiffness] = useState(
    reanimated4DefaultConfig.stiffness
  );
  const [velocity, setVelocity] = useState(0);
  const [overshootClamping, setOvershootClamping] = useState(
    reanimated4DefaultConfig.overshootClamping
  );
  const [energyThreshold, setEnergyThreshold] = useState(
    reanimated4DefaultConfig.energyThreshold
  );
  const [duration, setDuration] = useState(reanimated4DefaultConfig.duration);
  const [dampingRatio, setDampingRatio] = useState(
    reanimated4DefaultConfig.dampingRatio
  );
  const [reduceMotion, setReduceMotion] = useState(
    reanimated4DefaultConfig.reduceMotion
  );

  const resetOptions = () => {
    setDamping(() => reanimated4DefaultConfig.damping);
    setMass(() => reanimated4DefaultConfig.mass);

    setDuration(() => reanimated4DefaultConfig.duration);
    setDampingRatio(() => reanimated4DefaultConfig.dampingRatio);

    setStiffness(() => reanimated4DefaultConfig.stiffness);
    setOvershootClamping(() => reanimated4DefaultConfig.overshootClamping);
    setEnergyThreshold(() => reanimated4DefaultConfig.energyThreshold);
    setVelocity(() => reanimated4DefaultConfig.velocity);
  };

  const code = `
    withSpring(sv.value, {
      ${
        isPhysicsBased
          ? `mass: ${mass},
      damping: ${damping},`
          : `duration: ${duration},
      dampingRatio: ${dampingRatio},`
      }
      stiffness: ${stiffness},
      overshootClamping: ${overshootClamping},
      energyThreshold: ${energyThreshold},
      reduceMotion: ${formatReduceMotion(reduceMotion)},
    })
  `;

  const controls = (
    <>
      {/* Needed state-controlled Tabs and `TabItem` components from "@theme/Tabs" so I hacked them around with classes ;) */}
      <ul role="tablist">
        <li
          role="tab"
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            isPhysicsBased && 'tabs__item--active'
          }`}
          onClick={() => setPhysicsBased(true)}>
          Physics-based
        </li>
        <li
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            !isPhysicsBased && 'tabs__item--active'
          }`}
          role="tab"
          onClick={() => setPhysicsBased(false)}>
          Duration-based
        </li>
      </ul>
      {isPhysicsBased ? (
        <>
          <Range
            label="Stiffness"
            min={10}
            max={2000}
            step={10}
            value={stiffness}
            onChange={setStiffness}
          />
          <Range
            label="Damping"
            min={10}
            max={1000}
            step={10}
            value={damping}
            onChange={setDamping}
          />
        </>
      ) : (
        <>
          <Range
            label="Duration"
            min={1}
            max={5000}
            step={50}
            value={duration}
            onChange={setDuration}
          />
          <Range
            label="Damping ratio"
            min={0.1}
            max={1.5}
            step={0.1}
            value={dampingRatio}
            onChange={setDampingRatio}
          />
        </>
      )}
      <Range label="Mass" min={1} max={100} value={mass} onChange={setMass} />
      {/* <Range
        label="Velocity"
        min={-50}
        max={50}
        value={velocity}
        onChange={setVelocity}
      /> */}
      <CheckboxOption
        label="Clamp"
        value={overshootClamping}
        onChange={setOvershootClamping}
      />
      <Range
        label="Energy threshold"
        min={1}
        max={1e-12}
        // step={0.01}
        value={energyThreshold}
        onChange={setEnergyThreshold}
      />
      <Range
        label="Velocity"
        min={-5000}
        max={5000}
        step={50}
        value={velocity}
        onChange={setVelocity}
      />
      <SelectOption
        label="Reduce motion"
        value={reduceMotion}
        onChange={(option) => setReduceMotion(option as ReduceMotion)}
        options={[ReduceMotion.System, ReduceMotion.Always, ReduceMotion.Never]}
      />
    </>
  );

  const options: WithSpringConfig = isPhysicsBased
    ? { mass, damping }
    : { duration, dampingRatio };
  const restOptions = {
    stiffness,
    velocity,
    overshootClamping,
    energyThreshold,
    reduceMotion,
  };

  return {
    example: Example,
    props: {
      options: {
        ...options,
        ...restOptions,
      },
    },
    controls,
    code,
    resetOptions,
    additionalComponents: {},
  };
}
