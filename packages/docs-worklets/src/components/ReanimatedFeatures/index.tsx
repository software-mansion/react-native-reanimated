import React from 'react';
import styles from './styles.module.css';
import ReanimatedFeatureList from '@site/src/components/ReanimatedFeatures/ReanimatedFeatureList';
import HomepageButton, {
  ButtonStyling,
} from '@site/src/components/HomepageButton';

const ReanimatedFeatures = () => {
  return (
    <div className={styles.featuresContainer}>
      <h2>Why Reanimated?</h2>
      <ReanimatedFeatureList />
      <div className={styles.featuresLowerContainer}>
        <h4>
          Learn more about the features in the newest article about Reanimated 3
        </h4>
        <HomepageButton
          title="See blog post"
          href="https://blog.swmansion.com/releasing-reanimated-3-0-17fab4cb2394"
          target="_blank"
          backgroundStyling={ButtonStyling.TO_PURPLE}
          enlarged
        />
      </div>
    </div>
  );
};

export default ReanimatedFeatures;
