import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import { useColorMode } from '@docusaurus/theme-common';
import useScreenSize from '@site/src/hooks/useScreenSize';

const swirlLightDefs = (
  <linearGradient
    id="swirlGradient"
    x1="867.695"
    y1="-0.7854"
    x2="867.695"
    y2="1054.36"
    gradientUnits="userSpaceOnUse">
    <stop stopColor="#782AEB" />
    <stop offset="1" stopColor="#FF6259" />
  </linearGradient>
);

const swirlDarkDefs = (
  <linearGradient
    id="swirlGradient"
    x1="867.965"
    y1="-0.742432"
    x2="867.965"
    y2="1054.41"
    gradientUnits="userSpaceOnUse">
    <stop stopColor="#FF7774" />
    <stop offset="1" stopColor="#B07EFF" />
  </linearGradient>
);

const HeroSwirl = () => {
  const { windowWidth } = useScreenSize();
  const { colorMode } = useColorMode();

  return (
    <div className={styles.swirl}>
      {/* As the screen width decreases, it would be better to increase the width of the swirl on mobile devices.
       * Thus, if the screen width is below 996 pixels, multiply the width of the swirl 1.8 times,
       * instead of multiplying it 1.1 times.
       */}
      <svg
        width={windowWidth * (windowWidth < 996 ? 1.8 : 1.1)}
        viewBox="0 0 1653 1048"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          id="Vector 1"
          d="M1325 387.965C1348.5 124.215 806.333 54.8813 634.5 46.7146C787.5 16.7146 1376.1 -31.1346 1518.5 28.4654C1696.5 102.965 1687.02 566.948 1549 670.466C1416 770.215 684.269 787.966 787 844.966C905.5 910.715 787.5 1047.47 603 1047.47C445 1047.47 113.333 1005.05 0 956.215C224.333 996.715 725 925.715 547 831.715C334.977 719.747 812.5 709.966 850 709.966C1052.5 702.215 1304.1 622.542 1325 387.965Z"
          fill="url(#swirlGradient)"
        />
        <defs>
          {colorMode === 'light' && swirlLightDefs}
          {colorMode === 'dark' && swirlDarkDefs}
        </defs>
      </svg>
    </div>
  );
};

export default HeroSwirl;
