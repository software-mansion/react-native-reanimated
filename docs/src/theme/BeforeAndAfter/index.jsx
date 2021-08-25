import React from 'react';

import styles from './styles.module.css';
import clsx from 'clsx';

const BeforeAndAfter = ({ before, after }) => {
  const { innerWidth: width } = window;

  return (
    <div className={clsx(styles.container)}>
      <img src={before} className={clsx(styles.gifs)} />
      {width >= 650 && (
        <div className={clsx(styles.rightArrow)}>&rarr;</div>
      )}
      {width < 650 && (
        <div className={clsx(styles.downArrow)}>&darr;</div>
      )}
      <img src={after} className={clsx(styles.gifs)} />
    </div>
  );
};

export default BeforeAndAfter;
