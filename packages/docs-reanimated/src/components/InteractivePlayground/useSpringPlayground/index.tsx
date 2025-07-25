import React, { useState } from 'react';
import type { WithSpringConfig } from 'react-native-reanimated';
import {
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
  Reanimated3DefaultSpringConfig,
  Reanimated3DefaultSpringConfigWithDuration,
  ReduceMotion,
  SnappySpringConfig,
  SnappySpringConfigWithDuration,
  WigglySpringConfig,
  WigglySpringConfigWithDuration,
} from 'react-native-reanimated';

import { CheckboxOption, formatReduceMotion, Range, SelectOption } from '..';
import Example from './Example';

const defaultConfig = {
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

const physicsPresets = {
  GentleSpringConfig,
  WigglySpringConfig,
  SnappySpringConfig,
  Reanimated3DefaultSpringConfig,
} as const;

const durationPresets = {
  GentleSpringConfigWithDuration,
  WigglySpringConfigWithDuration,
  SnappySpringConfigWithDuration,
  Reanimated3DefaultSpringConfigWithDuration,
} as const;

export default function useSpringPlayground() {
  const [isPhysicsBased, setPhysicsBased] = useState(true);
  const [physicsPresetName, setPhysicsPresetName] =
    useState<keyof typeof physicsPresets>('GentleSpringConfig');
  const [durationPresetName, setDurationPresetName] = useState<
    keyof typeof durationPresets
  >('GentleSpringConfigWithDuration');

  const [damping, setDamping] = useState(defaultConfig.damping);
  const [mass, setMass] = useState(defaultConfig.mass);
  const [stiffness, setStiffness] = useState(defaultConfig.stiffness);
  const [velocity, setVelocity] = useState(0);
  const [overshootClamping, setOvershootClamping] = useState(
    defaultConfig.overshootClamping
  );
  const [energyThreshold, setEnergyThreshold] = useState(
    defaultConfig.energyThreshold
  );
  const [duration, setDuration] = useState(defaultConfig.duration);
  const [dampingRatio, setDampingRatio] = useState(defaultConfig.dampingRatio);
  const [reduceMotion, setReduceMotion] = useState(defaultConfig.reduceMotion);

  const resetOptions = () => {
    setDamping(() => defaultConfig.damping);
    setMass(() => defaultConfig.mass);

    setDuration(() => defaultConfig.duration);
    setDampingRatio(() => defaultConfig.dampingRatio);

    setStiffness(() => defaultConfig.stiffness);
    setOvershootClamping(() => defaultConfig.overshootClamping);
    setEnergyThreshold(() => defaultConfig.energyThreshold);
    setVelocity(() => defaultConfig.velocity);
  };

  const code = `
    withSpring(sv.value, {
      ${
        isPhysicsBased
          ? `stifness: ${stiffness},
      damping: ${damping},`
          : `duration: ${duration},
      dampingRatio: ${dampingRatio},`
      }
      mass: ${mass},
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
          <SelectOption
            label="Preset"
            value={physicsPresetName}
            onChange={(option: keyof typeof physicsPresets) => {
              setPhysicsPresetName(option);
              setStiffness(physicsPresets[option].stiffness);
              setDamping(physicsPresets[option].damping);
              setOvershootClamping(
                (physicsPresets[option] as WithSpringConfig).overshootClamping
              );
            }}
            options={Object.keys(physicsPresets)}
          />
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
          <SelectOption
            label="Preset"
            value={durationPresetName}
            onChange={(option: keyof typeof durationPresets) => {
              setDurationPresetName(option);
              setDuration(durationPresets[option].duration);
              setDampingRatio(durationPresets[option].dampingRatio);
              setOvershootClamping(
                (durationPresets[option] as WithSpringConfig).overshootClamping
              );
            }}
            options={Object.keys(durationPresets)}
          />
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
      <CheckboxOption
        label="Clamp"
        value={overshootClamping}
        onChange={setOvershootClamping}
      />
      <Range
        label="Energy threshold"
        min={1e-12}
        max={1e-1}
        step={1e-12}
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
