import React from 'react';

import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';

interface Props {
  component: React.ReactNode;
  key: number;
}

export default function InteractiveExampleComponent({ component, key }: Props) {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div className={styles.container}>
          <React.Fragment key={key}>{component}</React.Fragment>
        </div>
      )}
    </BrowserOnly>
  );
}
