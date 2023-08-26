import clsx from 'clsx';
import React from 'react';
import styles from './styles.module.css';
import Draggable from 'react-draggable';
import { useWindowSize } from '@docusaurus/theme-common';

const SelectedLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <Draggable bounds='[class*="hero"]'>
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
    </Draggable>
  );
};

export default SelectedLabel;
