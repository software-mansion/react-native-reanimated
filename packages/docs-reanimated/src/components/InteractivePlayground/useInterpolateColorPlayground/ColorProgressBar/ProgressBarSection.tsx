import React from 'react';
import styles from './styles.module.css';
import { interpolateColor } from 'react-native-reanimated';
import ColorProgressBar from './index';
import clsx from 'clsx';

function rgbInterpolation(color1: string, color2: string, progress: number) {
  return interpolateColor(progress, [0, 1], [color1, color2], 'RGB', {
    gamma: 1,
  });
}

function rgbGammaInterpolation(
  color1: string,
  color2: string,
  progress: number
) {
  return interpolateColor(progress, [0, 1], [color1, color2]);
}

function hsvInterpolation(color1: string, color2: string, progress: number) {
  return interpolateColor(progress, [0, 1], [color1, color2], 'HSV', {
    useCorrectedHSVInterpolation: false,
  });
}

function hsvStarInterpolation(
  color1: string,
  color2: string,
  progress: number
) {
  return interpolateColor(progress, [0, 1], [color1, color2], 'HSV');
}

function oklabInterpolation(color1: string, color2: string, progress: number) {
  return interpolateColor(progress, [0, 1], [color1, color2], 'LAB');
}

const ProgressBarSection = ({ color1, color2 }) => {
  return (
    <div className={styles.progressBarSection}>
      <div
        className={clsx(
          styles.progressBarSectionPart,
          styles.progressBarLabels
        )}>
        <p>RGB</p>
        <p>RGB (with gamma correction)</p>
        <p>HSV</p>
        <p>HSV (with correction)</p>
        <p>OKLAB</p>
      </div>
      <div className={clsx(styles.progressBarSectionPart)}>
        <ColorProgressBar
          color1={color1}
          color2={color2}
          interpolateFunction={rgbInterpolation}
        />
        <ColorProgressBar
          color1={color1}
          color2={color2}
          interpolateFunction={rgbGammaInterpolation}
        />
        <ColorProgressBar
          color1={color1}
          color2={color2}
          interpolateFunction={hsvInterpolation}
        />
        <ColorProgressBar
          color1={color1}
          color2={color2}
          interpolateFunction={hsvStarInterpolation}
        />
        <ColorProgressBar
          color1={color1}
          color2={color2}
          interpolateFunction={oklabInterpolation}
        />
      </div>
    </div>
  );
};

export default ProgressBarSection;
