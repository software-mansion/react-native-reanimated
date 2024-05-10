import React from 'react';
import HomepageButton from '../HomepageButton';
import styles from './styles.module.css';

const HireUsSection = () => {
  return (
    <div className={styles.hireUsSectionWrapper}>
      <div className={styles.hireUsTitleContainer}>
        <h2>We are Software Mansion</h2>
      </div>
      <p className={styles.hireUsSectionBody}>
        React Native Core Contributors and experts in dealing with all kinds of
        React Native issues. No matter if you need help with animations or React
        Native development we can help.
      </p>

      <div className={styles.hireUsButton}>
        <HomepageButton
          backgroundStyling={styles.buttonNavyStyling}
          borderStyling={styles.buttonNavyBorderStyling}
          href="https://swmansion.com/contact#contact-form"
          title="Hire us"
        />
      </div>
    </div>
  );
};

export default HireUsSection;
