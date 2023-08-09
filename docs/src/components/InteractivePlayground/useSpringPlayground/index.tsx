import React, { useState } from "react";
import Example from "./Example";

import { Range, CheckboxOption } from "..";
import { WithSpringConfig } from "react-native-reanimated";

const defaultConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
  // velocity: 0,
  duration: 2000,
  dampingRatio: 0.5,
};

export default function useSpringPlayground() {
  const [isPhysicsBased, setPhysicsBased] = useState(true);

  const [damping, setDamping] = useState(defaultConfig.damping);
  const [mass, setMass] = useState(defaultConfig.mass);
  const [stiffness, setStiffness] = useState(defaultConfig.stiffness);
  // const [velocity, setVelocity] = useState(0);
  const [overshootClamping, setOvershootClamping] = useState(
    defaultConfig.overshootClamping
  );
  const [restDisplacementThreshold, setRestDisplacementThreshold] = useState(
    defaultConfig.restDisplacementThreshold
  );
  const [restSpeedThreshold, setRestSpeedThreshold] = useState(
    defaultConfig.restSpeedThreshold
  );
  const [duration, setDuration] = useState(defaultConfig.duration);
  const [dampingRatio, setDampingRatio] = useState(defaultConfig.dampingRatio);

  const resetOptions = () => {
    setDamping(() => defaultConfig.damping);
    setMass(() => defaultConfig.mass);

    setDuration(() => defaultConfig.duration);
    setDampingRatio(() => defaultConfig.dampingRatio);

    setStiffness(() => defaultConfig.stiffness);
    setOvershootClamping(() => defaultConfig.overshootClamping);
    setRestDisplacementThreshold(() => defaultConfig.restDisplacementThreshold);
    setRestSpeedThreshold(() => defaultConfig.restSpeedThreshold);
  };

  const code = `
    withSpring(sv.value, {
      ${
        isPhysicsBased
          ? `mass: ${mass},
      damping: ${damping}`
          : `duration: ${duration},
      dampingRatio: ${dampingRatio}`
      }
      stiffness: ${stiffness},
      overshootClamping: ${overshootClamping},
      restDisplacementThreshold: ${restDisplacementThreshold},
      restSpeedThreshold: ${restSpeedThreshold},
    })
  `;

  const controls = (
    <>
      {/* Needed state-controlled Tabs and `TabItem` components from "@theme/Tabs" so I hacked them around with classes ;) */}
      <ul role="tablist">
        <li
          role="tab"
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            isPhysicsBased && "tabs__item--active"
          }`}
          onClick={() => setPhysicsBased(true)}
        >
          Physics-based
        </li>
        <li
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            !isPhysicsBased && "tabs__item--active"
          }`}
          role="tab"
          onClick={() => setPhysicsBased(false)}
        >
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
  };

  const example = <Example options={{ ...options, ...restOptions }} />;

  return {
    example,
    controls,
    code,
    resetOptions,
    additionalComponents: {},
  };
}
