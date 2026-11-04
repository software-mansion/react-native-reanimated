import React from 'react';
import clsx from 'clsx';

import PanelHelp from './PanelHelp';
import styles from './styles.module.css';

interface PanelProps {
  title: string;
  className?: string;
  help?: string;
  headerActions?: React.ReactNode;
  connectionNode?: string;
  codePanel?: boolean;
  children: React.ReactNode;
}

export default function Panel({
  title,
  className,
  help,
  headerActions,
  connectionNode,
  codePanel,
  children,
}: PanelProps) {
  return (
    <section
      className={clsx(styles.panel, className)}
      data-sim-panel
      data-sim-code-panel={codePanel || undefined}>
      <div className={styles.panelInner}>
        <header className={styles.panelHeader} data-sim-header>
          <div className={styles.panelTab}>
            <h3 className={styles.panelTitle}>{title}</h3>
            {help !== undefined && <PanelHelp title={title}>{help}</PanelHelp>}
          </div>
          {headerActions}
        </header>
        <div
          className={styles.panelBody}
          data-sim-panel-body
          data-sim-node={connectionNode}>
          {children}
        </div>
      </div>
    </section>
  );
}
