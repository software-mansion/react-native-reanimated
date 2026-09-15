import React from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

interface PanelProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

export default function Panel({ title, className, children }: PanelProps) {
  return (
    <section className={clsx(styles.panel, className)}>
      <span className={styles.panelTitle}>{title}</span>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
