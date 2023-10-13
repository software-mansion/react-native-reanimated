import React from 'react';
import styles from './styles.module.css';

export function Supported() {
  return <div className={styles.supported}>yes</div>;
}

export function NotSupported() {
  return <div className={styles.notSupported}>no</div>;
}

interface VersionProps {
  version: string;
}

export function Version({ version }: VersionProps) {
  return <div className={styles.version}>{version}</div>;
}

export function Spacer() {
  return <div className={styles.spacer}></div>;
}
