import React from 'react';
import styles from './styles.module.css';

interface Props {
  footnote?: boolean;
}

export default function Optional({ footnote }) {
  return <div className={styles.badge}>Optional{footnote ? '*' : ''}</div>;
}
