import React, { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { Range, SelectOption, CheckboxOption } from '../..';
import { EnteringExitingConfigProps } from '..';
import SpringControls from './SpringControls';
import EasingControls from './EasingControls';

const Controls = ({
  options,
  type,
  setType,
  isMobile,
  canNestEasing,
}: {
  options: string[];
  type: EnteringExitingConfigProps;
  setType: Dispatch<SetStateAction<EnteringExitingConfigProps>>;
  isMobile: boolean;
  canNestEasing: (easing: string) => boolean;
}) => {
  const [isBounce, setIsBounce] = useState(
    type.animation.toString().toLowerCase().includes('bounce')
  );

  useEffect(() => {
    setIsBounce(type.animation.toString().toLowerCase().includes('bounce'));
  }, [type.animation]);

  return (
    <>
      <SelectOption
        label="Animation"
        value={type.animation}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            animation: option,
          }));
        }}
        options={options}
      />
      {!type.isSpringBased && (
        <Range
          label="Duration (ms)"
          min={100}
          max={3000}
          step={100}
          value={type.duration}
          onChange={(option) => {
            setType((prevState) => ({
              ...prevState,
              duration: option,
            }));
          }}
        />
      )}
      <Range
        label="Delay (ms)"
        min={0}
        max={3000}
        step={100}
        value={type.delay}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            delay: option,
          }));
        }}
      />
      {!isBounce && (
        <CheckboxOption
          label="Spring-based"
          value={type.isSpringBased}
          onChange={(value) =>
            setType((prevState) => ({
              ...prevState,
              easing: value ? null : 'inOut',
              nestedEasing: value ? null : 'quad',
              isSpringBased: value,
            }))
          }
        />
      )}
      {type.isSpringBased ? (
        <SpringControls type={type} setType={setType} />
      ) : (
        <EasingControls
          type={type}
          setType={setType}
          canNestEasing={canNestEasing}
          isMobile={isMobile}
        />
      )}
    </>
  );
};

export default Controls;
