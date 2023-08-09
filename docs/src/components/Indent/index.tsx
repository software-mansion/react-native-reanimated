import React from 'react';
import styles from './styles.module.css';

export default function Indent({ children }) {
  return <div className={styles.container}>{children}</div>;
}
