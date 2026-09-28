import type React from 'react';

import styles from './styles.module.css';

export default function ImagePlaceholder({
  children,
  size = 320,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <div className={styles.placeholder} style={{ width: size, height: size }}>
      {children}
    </div>
  );
}
