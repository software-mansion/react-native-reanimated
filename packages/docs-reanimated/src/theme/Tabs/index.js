import React from 'react';
import Tabs from '@theme-original/Tabs';
import styles from './styles.module.css';
import clsx from 'clsx';

export default function TabsWrapper(props) {
  return (
    <>
      <div className={clsx(styles.tabs__wrapper)}>
        <Tabs {...props} />
      </div>
    </>
  );
}
