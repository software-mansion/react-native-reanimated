import React from 'react';
import styles from './styles.module.css';

import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

const ReanimatedSponsors = () => {
  const sponsorsLogos = {
    expo: {
      light: useBaseUrl('/img/expo.svg'),
      dark: useBaseUrl('/img/expo-dark.svg'),
    },
    shopify: {
      light: useBaseUrl('/img/shopify.svg'),
      dark: useBaseUrl('/img/shopify-dark.svg'),
    },
  };

  return (
    <div className={styles.sponsorsWrapper}>
      <div className={styles.sponsorsLabel}>
        <h3>Sponsors</h3>
        {/* <p>
          Thanks to our Sponsors we can still develop our library and make the
          React Native world a better place!
        </p> */}
      </div>
      <div className={styles.sponsorsBrands}>
        <ThemedImage
          sources={sponsorsLogos.expo}
          className={styles.sponsorsBrand}
        />
        <ThemedImage
          sources={sponsorsLogos.shopify}
          className={styles.sponsorsBrand}
        />
      </div>
    </div>
  );
};

export default ReanimatedSponsors;
