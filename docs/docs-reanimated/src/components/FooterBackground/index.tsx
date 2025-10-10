import React from 'react';
import Stars from '@site/static/img/stars-footer.svg';
import usePageType from '@site/src/hooks/usePageType';

import styles from './styles.module.css';

const FooterBackground = () => {
  const { isLanding } = usePageType();

  return (
    <div className={styles.starsContainer}>
      {isLanding && (
        <div className={styles.sponsorsBackground}>
          <div className={styles.sponsorsBackgroundStars}>
            <Stars />
          </div>
        </div>
      )}
    </div>
  );
};

export default FooterBackground;
