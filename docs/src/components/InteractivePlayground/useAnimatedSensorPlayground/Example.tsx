import React from 'react';
import styles from './styles.module.css';

interface Degree {
  x: number;
  y: number;
  z: number;
}

function Phone(props: Degree) {
  const { x, y, z } = props;

  return (
    <div className={styles.wrapper}>
      <div className={styles.scene}>
        <div
          className={styles.cube}
          style={{
            transform: `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`,
          }}>
          <div className={`${styles.face} ${styles.front}`}></div>
          <div className={`${styles.face} ${styles.right}`}></div>
          <div className={`${styles.face} ${styles.back}`}></div>
          <div className={`${styles.face} ${styles.left}`}></div>
          <div className={`${styles.face} ${styles.top}`}></div>
          <div className={`${styles.face} ${styles.bottom}`}></div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  values: Degree;
}

export default function App({ values }: Props) {
  return <Phone {...values} />;
}
