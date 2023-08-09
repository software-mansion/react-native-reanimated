import React from 'react';
import styles from './styles.module.css';

interface Props {
  type: 'new' | 'experimental';
}

export default function SidebarLabel({ type }: Props) {
  return (
    <div
      className={`${styles.badge} ${
        type === 'new' ? styles.new : styles.experimental
      }`}>
      {type}
    </div>
  );
}
