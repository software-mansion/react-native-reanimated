import React from 'react';
import styles from './styles.module.css';
import ReanimatedFeatureItem from '@site/src/components/ReanimatedFeatures/ReanimatedFeatureItem';

const ReanimatedFeatureList = () => {
  return (
    <div className={styles.featureList}>
      <ReanimatedFeatureItem title="Declarative">
        Reanimated comes with declarative API for creating animations.
        Complexity reduced from tens of methods to just a few. Define what the
        animation should look like and leave Reanimated to animate the styles
        and properties for you.
      </ReanimatedFeatureItem>
      <ReanimatedFeatureItem title="Performant">
        Reanimated lets you define animations in plain JavaScript which run
        natively on the UI thread by default. Smooth animations and interactions
        up to 120 fps and beyond. Reanimated delivers a native experience your
        users deserve.
      </ReanimatedFeatureItem>
      <ReanimatedFeatureItem title="Feature-rich">
        Reanimated’s power doesn’t end on animating only simple views or images.
        Hook your animations into device sensors or keyboard. Create amazing
        experiences using Layout Animations or animate elements between
        navigation screens with ease.
      </ReanimatedFeatureItem>
    </div>
  );
};

export default ReanimatedFeatureList;
