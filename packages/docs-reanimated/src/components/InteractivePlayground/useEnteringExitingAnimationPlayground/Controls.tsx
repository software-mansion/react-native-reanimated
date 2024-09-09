import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { Range, SelectOption, CheckboxOption } from '..';
import { Collapsible } from '@docusaurus/theme-common';
import CollapseButton from '@site/src/components/CollapseButton';
import { EnteringExitingConfigProps } from '.';

const Controls = ({
  options,
  type,
  setType,
  isMobile,
  canNestEasing,
}: {
  options: any;
  type: EnteringExitingConfigProps;
  setType: React.Dispatch<React.SetStateAction<EnteringExitingConfigProps>>;
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
      ) : (
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
            options={[
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
            ]}
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
              options={[
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
              ]}
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
            (type.nestedEasing === 'bezierFn' &&
              canNestEasing(type.easing))) && (
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
      )}
    </>
  );
};

export default Controls;
