import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import Example from './Example';
import { Range, SelectOption, CheckboxOption } from '..';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { Collapsible } from '@docusaurus/theme-common';
import CollapseButton from '@site/src/components/CollapseButton';
import { Easing } from 'react-native-reanimated';
import { ENTERING_ANIMATIONS, EXITING_ANIMATIONS } from './Example';

export interface EnteringExitingConfigProps {
  animation: string;
  duration?: number;
  delay?: number;
  easing?: string;
  nestedEasing?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  bezierCollapsed?: boolean;
  stepToBack?: number;
  power?: number;
  bounciness?: number;
  steps?: number;
  roundToNextStep?: boolean;
  isSpringBased?: boolean;
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

const defaultSpringConfig = {
  isSpringBased: false,
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

const defaultEasingConfig = {
  easing: 'inOut',
  nestedEasing: 'quad',

  x1: 0.25,
  y1: 0.1,
  x2: 0.25,
  y2: 1,
  bezierCollapsed: true,

  stepToBack: 3,
  power: 4,
  bounciness: 2,
  steps: 5,
  roundToNextStep: true,
};

const baseConfig = {
  duration: 300,
  delay: 0,
  ...defaultEasingConfig,
  ...defaultSpringConfig,
};

const defaultEnteringConfig = {
  animation: Object.keys(ENTERING_ANIMATIONS)[0],
  ...baseConfig,
};

const defaultExitingConfig = {
  animation: Object.keys(EXITING_ANIMATIONS)[0],
  ...baseConfig,
};

const Controls = ({
  tab,
  type,
  setType,
  isMobile,
}: {
  tab: 'entering' | 'exiting';
  type: EnteringExitingConfigProps;
  setType: React.Dispatch<React.SetStateAction<EnteringExitingConfigProps>>;
  isMobile: boolean;
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
        options={
          tab === 'entering'
            ? Object.keys(ENTERING_ANIMATIONS)
            : Object.keys(EXITING_ANIMATIONS)
        }
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
              easing: value ? null : prevState.easing,
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

const canNestEasing = (easing: string) => {
  return easing === 'inOut' || easing === 'in' || easing === 'out';
};

export default function useEnteringExitingPlayground() {
  const { windowWidth } =
    ExecutionEnvironment.canUseViewport && useScreenSize();
  const isMobile = windowWidth < 768;
  const [tab, setTab] = useState<'entering' | 'exiting'>('entering');

  const [entering, setEntering] = useState(defaultEnteringConfig);
  const [exiting, setExiting] = useState(defaultExitingConfig);

  useEffect(() => {
    if (isMobile && entering.bezierCollapsed) {
      setEntering((prevState) => ({
        ...prevState,
        bezierCollapsed: false,
      }));
    } else if (isMobile && exiting.bezierCollapsed) {
      setExiting((prevState) => ({
        ...prevState,
        bezierCollapsed: false,
      }));
    }
  }, [isMobile]);

  useEffect(() => {
    if (!canNestEasing(entering.easing)) {
      setEntering((prevState) => ({
        ...prevState,
        nestedEasing: defaultEnteringConfig.nestedEasing,
      }));
    } else if (!canNestEasing(exiting.easing)) {
      setExiting((prevState) => ({
        ...prevState,
        nestedEasing: defaultExitingConfig.nestedEasing,
      }));
    }
  }, [entering.easing]);

  const resetOptions = () => {
    setEntering(defaultEnteringConfig);
    setExiting(defaultExitingConfig);
  };

  const formatEasing = (config: EnteringExitingConfigProps) => {
    const {
      easing,
      nestedEasing,
      x1,
      y1,
      x2,
      y2,
      steps,
      stepToBack,
      power,
      bounciness,
      roundToNextStep,
    } = config;
    if (canNestEasing(easing)) {
      return {
        fn: Easing[easing](
          formatEasing({ ...config, easing: nestedEasing }).fn
        ),
        code: `Easing.${easing}(${
          formatEasing({ ...config, easing: nestedEasing }).code
        })`,
      };
    }
    const nomalizedX1 = x1 || 0;
    const nomalizedY1 = y1 || 0;
    const nomalizedX2 = x2 || 0;
    const nomalizedY2 = y2 || 0;

    switch (easing) {
      case 'back':
        return {
          fn: Easing.back(stepToBack),
          code: `Easing.back(${stepToBack})`,
        };
      case 'bezierFn':
        return {
          fn: Easing.bezierFn(
            nomalizedX1,
            nomalizedY1,
            nomalizedX2,
            nomalizedY2
          ),
          code: `Easing.bezierFn(${nomalizedX1}, ${nomalizedY1}, ${nomalizedX2}, ${nomalizedY2})`,
        };
      case 'bezier':
        return {
          fn: Easing.bezier(nomalizedX1, nomalizedY1, nomalizedX2, nomalizedY2),
          code: `Easing.bezier(${nomalizedX1}, ${nomalizedY1}, ${nomalizedX2}, ${nomalizedY2})`,
        };
      case 'poly':
        return {
          fn: Easing.poly(power),
          code: `Easing.poly(${power})`,
        };
      case 'elastic':
        return {
          fn: Easing.elastic(bounciness),
          code: `Easing.elastic(${bounciness})`,
        };
      case 'steps':
        return {
          fn: Easing.steps(steps, roundToNextStep),
          code: `Easing.steps(${steps}, ${roundToNextStep})`,
        };
    }
    return {
      fn: Easing[easing],
      code: `Easing.${easing}`,
    };
  };

  const code = `
  Entering:
    ${entering.animation}${
    entering.delay > 0
      ? `
    .delay(${entering.delay})`
      : ''
  }
    ${
      entering.isSpringBased
        ? `.springify()
    .mass(${entering.mass})
    .damping(${entering.damping})
    .stiffness(${entering.stiffness})
    .overshootClamping(${entering.overshootClamping})
    .restDisplacementThreshold(${entering.restDisplacementThreshold})
    .restSpeedThreshold(${entering.restSpeedThreshold}`
        : `.duration(${entering.duration})
    .easing(${formatEasing(entering).code})`
    }

  Exiting:
    ${exiting.animation}${
    exiting.delay > 0
      ? `
    .delay(${exiting.delay})`
      : ''
  }
    ${
      exiting.isSpringBased
        ? `.springify()
    .mass(${exiting.mass})
    .damping(${exiting.damping})
    .stiffness(${exiting.stiffness})
    .overshootClamping(${exiting.overshootClamping})
    .restDisplacementThreshold(${exiting.restDisplacementThreshold})
    .restSpeedThreshold(${exiting.restSpeedThreshold}`
        : `.duration(${exiting.duration})
    .easing(${formatEasing(exiting).code})`
    }
  `;

  const controls = (
    <>
      {/* Needed state-controlled Tabs and `TabItem` components from "@theme/Tabs" so I hacked them around with classes ;) */}
      <ul role="tablist">
        <li
          role="tab"
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            tab === 'entering' && 'tabs__item--active'
          }`}
          onClick={() => setTab('entering')}>
          Entering
        </li>
        <li
          className={`tabs__item tabItem_node_modules-@docusaurus-theme-classic-lib-theme-Tabs-styles-module ${
            tab === 'exiting' && 'tabs__item--active'
          }`}
          role="tab"
          onClick={() => setTab('exiting')}>
          Exiting
        </li>
      </ul>
      {tab === 'entering' ? (
        <Controls
          tab={tab}
          type={entering}
          setType={setEntering}
          isMobile={isMobile}
        />
      ) : (
        <Controls
          tab={tab}
          type={exiting}
          setType={setExiting}
          isMobile={isMobile}
        />
      )}
    </>
  );

  return {
    example: Example,
    props: {
      entering,
      exiting,
    },
    controls,
    code,
    resetOptions,
    additionalComponents: {},
  };
}
