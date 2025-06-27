import React from 'react';
import styles from './styles.module.css';

export default function KeyboardExample() {
  const keys = [];

  for (let i = 1; i <= 35; i++) {
    keys.push(<div key={i} className={styles.key} />);
  }

  return (
    <div className={styles.container}>
      <div className={styles.tile} />
      <div className={styles.tile} />
      <div className={styles.keyboard}>{keys}</div>
    </div>
  );
}
