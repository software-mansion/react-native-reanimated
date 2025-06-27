import React, { useState, useRef, useEffect } from 'react';
import { CheckboxOption, Range, SelectOption } from '../';
import Example from './Example';
import styles from './styles.module.css';
import ColorPicker from './ColorPicker';
import ProgressBarSection from './ColorProgressBar/ProgressBarSection';
import { Collapsible } from '@docusaurus/theme-common';
import CollapseButton from '@site/src/components/CollapseButton';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

export const ColorSpace = {
  RGB: 'RGB',
  HSV: 'HSV',
  LAB: 'LAB',
};

const initialState = {
  colorSpace: 'RGB',
  gamma: 2.2,
  correction: true,
  color: {
    /* --swm-blue-light-100 */
    leftBoundary: '#38ACDD',
    /* --swm-yellow-light-100 */
    rightBoundary: '#FFD61E',
  },
};

export default function useInterpolateColorPlayground() {
  const { windowWidth } =
    ExecutionEnvironment.canUseViewport && useScreenSize();
  const isMobile = windowWidth < 600;

  const [key, setKey] = useState(0);
  const prevRefreshKeyLeft = useRef(key);
  const prevRefreshKeyRight = useRef(key);

  const [colorBarsSectionCollapsed, setColorBarsSectionCollapsed] =
    useState(true);
  const [colorSpace, setColorSpace] = useState<'RGB' | 'HSV' | 'LAB'>(
    ColorSpace[initialState.colorSpace]
  );
  const [gamma, setGamma] = useState(initialState.gamma);

  const [colorLeftBoundary, setColorLeftBoundary] = useState(
    initialState.color.leftBoundary
  );
  const [colorRightBoundary, setColorRightBoundary] = useState(
    initialState.color.rightBoundary
  );

  const [correction, setCorrection] = useState(initialState.correction);

  const resetOptions = () => {
    setKey((prevState) => prevState + 1);
    setColorSpace(() => ColorSpace[initialState.colorSpace]);
    setGamma(() => initialState.gamma);

    setCorrection(() => initialState.correction);
  };

  // prettier-ignore
  const optionsCode =
    (colorSpace === ColorSpace.RGB
      ? `gamma: ${gamma},`
      : (colorSpace === ColorSpace.HSV
        ? `useCorrectedHSVInterpolation: ${correction},`
          : ''));
  // prettier-ignore
  const code = `
    interpolateColor(
        sv.value,
        [0, 1],
        ['${colorLeftBoundary.toUpperCase()}', '${colorRightBoundary.toUpperCase()}']
        '${colorSpace}'${optionsCode ? `,
        {
          ${optionsCode}
        }` :  ''}
      )
    `;

  const controls = (
    <>
      <SelectOption
        label="Colorspace"
        value={colorSpace}
        onChange={(changedString) => setColorSpace(ColorSpace[changedString])}
        options={['RGB', 'HSV', 'LAB']}
      />
      {colorSpace === ColorSpace.RGB && (
        <Range
          label="Gamma"
          min={0}
          max={10}
          step={0.1}
          value={gamma}
          onChange={setGamma}
        />
      )}
      {colorSpace === ColorSpace.HSV && (
        <CheckboxOption
          value={correction}
          onChange={setCorrection}
          label="Use corrected HSV"
        />
      )}
    </>
  );

  const colorBox = (
    <Example
      outputRange={[colorLeftBoundary, colorRightBoundary]}
      colorSpace={colorSpace}
      options={{
        gamma,
        useCorrectedHSVInterpolation: correction,
      }}
    />
  );

  const section = (
    <>
      <CollapseButton
        label="Hide interpolation comparison"
        labelCollapsed="Show interpolation comparison"
        collapsed={colorBarsSectionCollapsed}
        onCollapse={() =>
          setColorBarsSectionCollapsed((prevState) => !prevState)
        }
        className={styles.collapseButton}
      />
      <Collapsible
        lazy={false}
        collapsed={colorBarsSectionCollapsed}
        disableSSRStyle
        onCollapseTransitionEnd={setColorBarsSectionCollapsed}>
        <ProgressBarSection
          color1={colorLeftBoundary}
          color2={colorRightBoundary}
        />
      </Collapsible>
    </>
  );

  function ExampleFC() {
    return (
      <div className={styles.example}>
        <ColorPicker
          color={colorLeftBoundary}
          setColor={setColorLeftBoundary}
          defaultValue={initialState.color.leftBoundary}
          prevKeyRef={prevRefreshKeyLeft}
          refreshKey={key}
        />
        {!isMobile && colorBox}
        <ColorPicker
          color={colorRightBoundary}
          setColor={setColorRightBoundary}
          defaultValue={initialState.color.rightBoundary}
          prevKeyRef={prevRefreshKeyRight}
          refreshKey={key}
        />
        {isMobile && colorBox}
      </div>
    );
  }

  return {
    example: ExampleFC,
    controls,
    code,
    resetOptions,
    additionalComponents: { section },
  };
}
