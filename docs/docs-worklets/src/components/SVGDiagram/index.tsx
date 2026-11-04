import type React from 'react';

import styles from './styles.module.css';

export default function SVGDiagram({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-figure="SVGDiagram" className={styles.svg}>
      {children}
    </div>
  );
}
