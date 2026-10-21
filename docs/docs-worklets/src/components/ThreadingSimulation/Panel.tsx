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
      data-sim-node={connectionNode}
      data-sim-code-panel={codePanel || undefined}>
      <header className={styles.panelHeader} data-sim-header>
        <h3
          className={styles.panelTitle}
          data-sim-port={connectionNode !== undefined || undefined}>
          {title}
        </h3>
        {help !== undefined && <PanelHelp title={title}>{help}</PanelHelp>}
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
