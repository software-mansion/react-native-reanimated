import React, { useEffect, useState } from 'react';
import Example from './Example';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { Easing, type BaseLayoutAnimationConfig } from 'react-native-reanimated';
import Controls from './Controls/Controls';
import { ENTERING_ANIMATIONS, EXITING_ANIMATIONS } from './Example';

// TODO: Options related to spring will be uncommented after springify is introduced to web

const MOBILE_WIDTH = 768;

export interface EnteringExitingConfigProps
  extends Omit<BaseLayoutAnimationConfig, 'easing'> {
  animation: string;
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
}

// const defaultSpringConfig = {
//   isSpringBased: false,
//   damping: 10,
//   mass: 1,
//   stiffness: 100,
//   overshootClamping: false,
//   restDisplacementThreshold: 0.01,
//   restSpeedThreshold: 2,
// };

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
  // ...defaultSpringConfig,
};

const defaultEnteringConfig = {
  animation: Object.keys(ENTERING_ANIMATIONS)[0],
  ...baseConfig,
};

const defaultExitingConfig = {
  animation: Object.keys(EXITING_ANIMATIONS)[0],
  ...baseConfig,
};

const canNestEasing = (easing: string) => {
  return easing === 'inOut' || easing === 'in' || easing === 'out';
};

export default function useEnteringExitingPlayground() {
  const { windowWidth } =
    ExecutionEnvironment.canUseViewport && useScreenSize();
  const isMobile = windowWidth < MOBILE_WIDTH;
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
       //   ${entering.isSpringBased
       //     ? `.springify()
       // .mass(${entering.mass})
       // .damping(${entering.damping})
       // .stiffness(${entering.stiffness})
       // .overshootClamping(${entering.overshootClamping})
       // .restDisplacementThreshold(${entering.restDisplacementThreshold})
       // .restSpeedThreshold(${entering.restSpeedThreshold}`
       `.duration(${entering.duration})
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
       //   ${exiting.isSpringBased
       //     ? `.springify()
       // .mass(${exiting.mass})
       // .damping(${exiting.damping})
       // .stiffness(${exiting.stiffness})
       // .overshootClamping(${exiting.overshootClamping})
       // .restDisplacementThreshold(${exiting.restDisplacementThreshold})
       // .restSpeedThreshold(${exiting.restSpeedThreshold}`
       `.duration(${exiting.duration})
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
          options={Object.keys(ENTERING_ANIMATIONS)}
          type={entering}
          setType={setEntering}
          isMobile={isMobile}
          canNestEasing={canNestEasing}
        />
      ) : (
        <Controls
          options={Object.keys(EXITING_ANIMATIONS)}
          type={exiting}
          setType={setExiting}
          isMobile={isMobile}
          canNestEasing={canNestEasing}
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
