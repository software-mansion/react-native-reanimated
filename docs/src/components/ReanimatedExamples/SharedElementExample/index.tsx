import React from 'react';
import styles from './styles.module.css';

export default function SharedElementExample() {
  return (
    <div className={styles.container}>
      <div className={styles.tile}>
        <div className={styles.ball} />
      </div>
      <div className={styles.tile}></div>
    </div>
  );
}
