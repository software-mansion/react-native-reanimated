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
        label="Energy threshold"
        min={1e-12}
        max={1e-1}
        step={1e-12}
        value={type.energyThreshold}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            energyThreshold: option,
          }));
        }}
      />
    </>
  );
};

export default SpringControls;
