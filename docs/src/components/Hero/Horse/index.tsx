import React from 'react';
import styles from './styles.module.css';

import HorseVariantA from '@site/static/img/horse/1.svg';
import HorseVariantB from '@site/static/img/horse/2.svg';
import HorseVariantC from '@site/static/img/horse/3.svg';
import HorseVariantD from '@site/static/img/horse/4.svg';
import HorseVariantE from '@site/static/img/horse/5.svg';
import HorseVariantF from '@site/static/img/horse/6.svg';
import HorseVariantG from '@site/static/img/horse/7.svg';
import HorseVariantH from '@site/static/img/horse/8.svg';
import HorseVariantI from '@site/static/img/horse/9.svg';
import HorseVariantJ from '@site/static/img/horse/10.svg';
import HorseVariantK from '@site/static/img/horse/11.svg';
import clsx from 'clsx';

const HeroHorse = () => {
  return (
    <div className={styles.horse}>
      <div className={styles.horseAnimation}>
        <HorseVariantA className={styles.variantAnimation} />
        <HorseVariantB
          className={clsx(styles.variantAnimation, styles.variantB)}
        />
        <HorseVariantC
          className={clsx(styles.variantAnimation, styles.variantC)}
        />
        <HorseVariantD
          className={clsx(styles.variantAnimation, styles.variantD)}
        />
        <HorseVariantE
          className={clsx(styles.variantAnimation, styles.variantE)}
        />
        <HorseVariantF
          className={clsx(styles.variantAnimation, styles.variantF)}
        />
        <HorseVariantG
          className={clsx(styles.variantAnimation, styles.variantG)}
        />
        <HorseVariantH
          className={clsx(styles.variantAnimation, styles.variantH)}
        />
        <HorseVariantI
          className={clsx(styles.variantAnimation, styles.variantI)}
        />
        <HorseVariantJ
          className={clsx(styles.variantAnimation, styles.variantJ)}
        />
        <HorseVariantK
          className={clsx(styles.variantAnimation, styles.variantK)}
        />
      </div>
    </div>
  );
};

export default HeroHorse;
