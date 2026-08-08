import React from 'react';
import styles from './styles.module.css';

interface Props {
  version: string;
}

export default function AvailableFrom({ version }: Props) {
  return <div className={styles.badge}>Available from {version}</div>;
}
