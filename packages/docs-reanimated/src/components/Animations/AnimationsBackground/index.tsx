import React, { PropsWithChildren } from 'react';
import TopWave from './TopWave';
import BottomWave from './BottomWave';
import styles from './styles.module.css';

export default function AnimationsBackground({ children }: PropsWithChildren) {
  // first TopWave is in Dark Mode, same with Bottom Wave
  return (
    <div>
      <div className={styles.topWave}>
        <TopWave fill="var(--Dark-Brand-colors-Purple-Purple-100, #B07EFF)" />
        <TopWave fill="var(--Light-Brand-colors-Purple-Purple-100, #782AEB)" />
      </div>
      <div className={styles.background}>{children}</div>
      <div className={styles.bottomWave}>
        <BottomWave fill="var(--Dark-Brand-colors-Red-Red-100, #FF7774)" />
        <BottomWave fill="var(--Light-Brand-colors-Red-Red-100, #FF6259)" />
      </div>
    </div>
  );
}
