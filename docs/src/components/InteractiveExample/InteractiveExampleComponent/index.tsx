import React from 'react';
import clsx from 'clsx';

import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';

interface Props {
  component: React.ReactNode;
  label?: string;
  idx?: number;
}

export default function InteractiveExampleComponent({
  component,
  label,
  idx,
}: Props) {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div className={styles.container}>
          <React.Fragment key={idx}>{component}</React.Fragment>
          {label && <div className={styles.label}>{label}</div>}
        </div>
      )}
    </BrowserOnly>
  );
}
