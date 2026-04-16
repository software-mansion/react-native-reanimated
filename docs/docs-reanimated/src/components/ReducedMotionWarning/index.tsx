import React from 'react';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';

import { useColorMode } from '@docusaurus/theme-common';
import Danger from '/static/img/danger.svg';
import DangerDark from '/static/img/danger-dark.svg';

export default function ReducedMotionWarning() {
  const { colorMode } = useColorMode();
  return (
    <div className={styles.container}>
      <div className={styles.dangerMark}>
        {colorMode === 'light' ? <Danger /> : <DangerDark />}
      </div>
      <p className={styles.warningText}>
        It looks like reduced motion is turned on in your system preferences.
        Some of the animations may be skipped.{' '}
        <Link
          className={styles.link}
          to="/docs/guides/accessibility#reduced-motion-in-animations">
          Learn more
        </Link>
      </p>
    </div>
  );
}
