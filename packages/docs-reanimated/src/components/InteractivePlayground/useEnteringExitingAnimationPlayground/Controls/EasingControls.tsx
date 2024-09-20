import React, { Dispatch, SetStateAction } from 'react';
import { Range, SelectOption } from '../..';
import { Collapsible } from '@docusaurus/theme-common';
import CollapseButton from '@site/src/components/CollapseButton';
import styles from '../styles.module.css';
import { EnteringExitingConfigProps } from '..';

export interface ControlProps {
  type: EnteringExitingConfigProps;
  setType: Dispatch<SetStateAction<EnteringExitingConfigProps>>;
  canNestEasing: (easing: string) => boolean;
  isMobile: boolean;
}

const EASING_OPTIONS = [
  'back',
  'bezier',
  'bounce',
  'circle',
  'cubic',
  'ease',
  'elastic',
  'exp',
  'linear',
  'poly',
  'quad',
  'sin',
  'steps',
  'in',
  'inOut',
  'out',
];

const NESTED_EASING_OPTIONS = [
  'back',
  'bezierFn',
  'bounce',
  'circle',
  'cubic',
  'ease',
  'elastic',
  'exp',
  'linear',
  'poly',
  'quad',
  'sin',
  'steps',
];

const EasingControls = ({
  type,
  setType,
  canNestEasing,
  isMobile,
}: {
  type: EnteringExitingConfigProps;
  setType: Dispatch<SetStateAction<EnteringExitingConfigProps>>;
  canNestEasing: (easing: string) => boolean;
  isMobile: boolean;
}) => {
  return (
    <>
      <SelectOption
        label="Easing"
        value={type.easing}
        onChange={(option) => {
          setType((prevState) => ({
            ...prevState,
            easing: option,
          }));
        }}
        options={EASING_OPTIONS}
      />
      {canNestEasing(type.easing) && (
        <SelectOption
          label="Easing"
          value={type.nestedEasing}
          onChange={(option) => {
            setType((prevState) => ({
              ...prevState,
              nestedEasing: option,
            }));
          }}
          disabled={!canNestEasing(type.easing)}
          options={NESTED_EASING_OPTIONS}
        />
      )}
      {(type.easing === 'back' || type.nestedEasing === 'back') && (
        <Range
          label="Step to back"
          min={0}
          max={10}
          step={0.1}
          value={type.stepToBack}
          onChange={(option) => {
            setType((prevState) => ({
              ...prevState,
              stepToBack: option,
            }));
          }}
        />
      )}
      {(type.easing === 'bezier' ||
        (type.nestedEasing === 'bezierFn' && canNestEasing(type.easing))) && (
        <>
          {!isMobile && (
            <CollapseButton
              label="Hide controls"
              labelCollapsed="Show controls"
              collapsed={type.bezierCollapsed}
              onCollapse={() =>
                setType((prevState) => ({
                  ...prevState,
                  bezierCollapsed: !prevState.bezierCollapsed,
                }))
              }
              className={styles.collapseButton}
            />
          )}
          <Collapsible
            collapsed={type.bezierCollapsed}
            lazy={false}
            onCollapseTransitionEnd={(newCollapsed) => {
              setType((prevState) => ({
                ...prevState,
                bezierCollapsed: newCollapsed,
              }));
            }}
            /* As range sliders may hide their overflow on the boundaries during the collapse animation,
             * we need to shorten the duration of the animation to 1ms (as 0ms will just not show it). */
            animation={{ duration: 1 }}>
            <Range
              label="x1"
              min={0}
              max={1}
              step={0.01}
              value={type.x1}
              onChange={(option) => {
                setType((prevState) => ({
                  ...prevState,
                  x1: option,
                }));
              }}
            />
            <Range
              label="y1"
              min={-1}
              max={2}
              step={0.01}
              value={type.y1}
              onChange={(option) => {
                setType((prevState) => ({
                  ...prevState,
                  y1: option,
                }));
              }}
            />
            <Range
              label="x2"
              min={0}
              max={1}
              step={0.01}
              value={type.x2}
              onChange={(option) => {
                setType((prevState) => ({
                  ...prevState,
                  x2: option,
                }));
              }}
            />
            <Range
              label="y2"
              min={-1}
              max={2}
              step={0.01}
              value={type.y2}
              onChange={(option) => {
                setType((prevState) => ({
                  ...prevState,
                  y2: option,
                }));
              }}
            />
          </Collapsible>
        </>
      )}
      {(type.easing === 'poly' || type.nestedEasing === 'poly') && (
        <Range
          label="Power"
          min={1}
          max={10}
          step={1}
          value={type.power}
          onChange={(option) => {
            setType((prevState) => ({
              ...prevState,
              power: option,
            }));
          }}
        />
      )}
      {(type.easing === 'elastic' || type.nestedEasing === 'elastic') && (
        <Range
          label="Bounciness"
          min={0}
          max={10}
          step={0.1}
          value={type.bounciness}
          onChange={(option) => {
            setType((prevState) => ({
              ...prevState,
              bounciness: option,
            }));
          }}
        />
      )}
      {(type.easing === 'steps' || type.nestedEasing === 'steps') && (
        <>
          <Range
            label="Steps"
            min={1}
            max={15}
            step={1}
            value={type.steps}
            onChange={(option) => {
              setType((prevState) => ({
                ...prevState,
                steps: option,
              }));
            }}
          />
          <SelectOption
            label="Round to next step"
            value={String(type.roundToNextStep)}
            onChange={(option) => {
              setType((prevState) => ({
                ...prevState,
                roundToNextStep: option === 'true',
              }));
            }}
            options={['true', 'false']}
          />
        </>
      )}
    </>
  );
};

export default EasingControls;
