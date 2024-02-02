import clsx from 'clsx';
import React from 'react';
import styles from './styles.module.css';

const SelectedLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <span className={clsx(styles.headingLabel, styles.selection)}>
      <div className={styles.selectionContainer}>
        <div
          className={clsx(
            styles.selectionBox,
            styles.boxUpper,
            styles.boxLeft
          )}></div>
        <div
          className={clsx(
            styles.selectionBox,
            styles.boxUpper,
            styles.boxRight
          )}></div>
        <div
          className={clsx(
            styles.selectionBox,
            styles.boxLower,
            styles.boxLeft
          )}></div>
        <div
          className={clsx(
            styles.selectionBox,
            styles.boxLower,
            styles.boxRight
          )}></div>
        {children}
      </div>
    </span>
  );
};

export default SelectedLabel;
