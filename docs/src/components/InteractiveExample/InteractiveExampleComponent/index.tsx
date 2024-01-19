import React from 'react';
import clsx from 'clsx';

import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';

interface Props {
  component: React.ReactNode;
  idx: number;
}

export default function InteractiveExampleComponent({ component, idx }: Props) {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div className={styles.container}>
          <React.Fragment key={idx}>{component}</React.Fragment>
        </div>
      )}
    </BrowserOnly>
  );
}
