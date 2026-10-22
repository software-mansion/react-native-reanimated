import React from 'react';
import clsx from 'clsx';

import PanelHelp from './PanelHelp';
import styles from './styles.module.css';

interface PanelProps {
  title: string;
  className?: string;
  help?: string;
  connectionNode?: string;
  codePanel?: boolean;
  children: React.ReactNode;
}

export default function Panel({
  title,
  className,
  help,
  connectionNode,
  codePanel,
  children,
}: PanelProps) {
  return (
    <section
      className={clsx(styles.panel, className)}
      data-sim-panel
      data-sim-code-panel={codePanel || undefined}>
      <header className={styles.panelHeader} data-sim-header>
        <h3 className={styles.panelTitle}>{title}</h3>
        {help !== undefined && <PanelHelp title={title}>{help}</PanelHelp>}
      </header>
      <div className={styles.panelBody} data-sim-node={connectionNode}>
        {children}
      </div>
    </section>
  );
}
