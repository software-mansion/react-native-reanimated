import React from 'react';
import styles from './styles.module.css';
import { useColorMode } from '@docusaurus/theme-common';

const sunLightDefs = (
  <linearGradient
    id="sunGradient"
    x1="0.628571"
    y1="0.0175629"
    x2="318.282"
    y2="364.671"
    gradientUnits="userSpaceOnUse">
    <stop stopColor="#FFD61E" />
    <stop offset="0.0001" stopColor="#FFE04B" />
    <stop offset="1" stopColor="#FF6259" />
  </linearGradient>
);

const sunDarkDefs = (
  <linearGradient
    id="sunGradient"
    x1="172.322"
    y1="0.642563"
    x2="172.322"
    y2="343.415"
    gradientUnits="userSpaceOnUse">
    <stop stopColor="#E9DBFF" />
    <stop offset="1" stopColor="#B07EFF" />
  </linearGradient>
);

const HeroSun = () => {
  const { colorMode } = useColorMode();
  return (
    <div className={styles.sunAnimation}>
      <div className={styles.sun}>
        <svg
          width="344"
          height="343"
          viewBox="0 0 344 343"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="172.015"
            cy="171.404"
            r="171.386"
            transform="rotate(-52.7839 172.015 171.404)"
            fill="url(#sunGradient)"
          />
          <defs>
            {colorMode === 'light' && sunLightDefs}
            {colorMode === 'dark' && sunDarkDefs}
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default HeroSun;
