import React from 'react';
import styles from './styles.module.css';

interface Props {
  degrees: number;
}

export default function App({ degrees }: Props) {
  const foldDegrees = (180 - degrees) / 2;

  return (
    <div className={styles.wrapper}>
      <div className={styles.scene}>
        <div className={styles.device}>
          <div
            className={`${styles.panel} ${styles.left}`}
            style={{ transform: `rotateY(${foldDegrees}deg)` }}>
            <div className={styles.screen} />
          </div>
          <div className={styles.hinge} />
          <div
            className={`${styles.panel} ${styles.right}`}
            style={{ transform: `rotateY(${-foldDegrees}deg)` }}>
            <div className={styles.screen} />
          </div>
        </div>
      </div>
    </div>
  );
}
