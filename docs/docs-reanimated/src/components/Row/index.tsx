import React from 'react';
import styles from './styles.module.css';

export default function Row({ children }) {
  return <div className={styles.container}>{children}</div>;
}
