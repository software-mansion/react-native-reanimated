import React from 'react';
import styles from './styles.module.css';

import { ThemeClassNames, useColorMode } from '@docusaurus/theme-common';
import Danger from '/static/img/danger.svg';
import DangerDark from '/static/img/danger-dark.svg';

export default function ReducedMotionWarning() {
  const { colorMode } = useColorMode();
  return (
    <div className={styles.badge}>
      <div className={styles.dangerMark}>
        {colorMode === 'light' ? <Danger /> : <DangerDark />}
      </div>
      Look like reduced motion is turned on in your system preferences, some of
      the animations may be skipped.
    </div>
  );
}
