import React from 'react';
import styles from './styles.module.css';

import UpperCloud from '@site/static/img/cloud-1.svg';
import RightCloud from '@site/static/img/cloud-2.svg';
import LowerCloud from '@site/static/img/cloud-3.svg';
import clsx from 'clsx';

const HeroClouds = () => {
  return (
    <div className={styles.clouds}>
      <div className={clsx(styles.cloudAnimation, styles.upperCloudAnimation)}>
        <div className={styles.upperCloud}>
          <UpperCloud />
        </div>
      </div>
      <div className={clsx(styles.cloudAnimation, styles.rightCloudAnimation)}>
        <div className={styles.rightCloud}>
          <RightCloud />
        </div>
      </div>
      <div className={clsx(styles.cloudAnimation, styles.lowerCloudAnimation)}>
        <div className={styles.lowerCloud}>
          <LowerCloud />
        </div>
      </div>
    </div>
  );
};

export default HeroClouds;
