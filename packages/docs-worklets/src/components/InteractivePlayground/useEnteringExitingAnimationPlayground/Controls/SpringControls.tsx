import React, { Dispatch, SetStateAction } from 'react';
import { Range, CheckboxOption } from '../..';
import { EnteringExitingConfigProps } from '..';

const SpringControls = ({
  type,
  setType,
}: {
  type: EnteringExitingConfigProps;
  setType: Dispatch<SetStateAction<EnteringExitingConfigProps>>;
}) => {
  return (
    <>
      <Range
        label="Mass"
        min={1}
        max={20}
        step={0.1}
        value={type.mass}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            mass: option,
          }));
        }}
      />
      <Range
        label="Damping"
        min={1}
        max={100}
        value={type.damping}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            damping: option,
          }));
        }}
      />
      <Range
        label="Stiffness"
        min={1}
        max={500}
        value={type.stiffness}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            stiffness: option,
          }));
        }}
      />
      <CheckboxOption
        label="Clamp"
        value={type.overshootClamping}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            overshootClamping: option,
          }));
        }}
      />
      <Range
        label="Displacement threshold"
        min={0.01}
        max={150}
        step={0.01}
        value={type.restDisplacementThreshold}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            restDisplacementThreshold: option,
          }));
        }}
      />
      <Range
        label="Speed threshold"
        min={0.01}
        max={150}
        step={0.01}
        value={type.restSpeedThreshold}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            restSpeedThreshold: option,
          }));
        }}
      />
    </>
  );
};

export default SpringControls;
