import React from 'react';
import styles from './styles.module.css';

export default function GyroscopeExample() {
  return (
    <div className={styles.movingBox}>
      <div className={styles.rollingBall} />
    </div>
  );
}
