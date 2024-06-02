import React from 'react';
import styles from './styles.module.css';

import Stars from '@site/static/img/stars.svg';

const HeroStars = () => {
  return (
    <div className={styles.stars}>
      <Stars />
    </div>
  );
};

export default HeroStars;
