import React from 'react';
import Layout from '@theme/Layout';

import styles from './index.module.css';
import HomepageStartScreen from '@site/src/components/Hero/StartScreen';
import ReanimatedFeatures from '@site/src/components/ReanimatedFeatures';
import ReanimatedSponsors from '@site/src/components/ReanimatedSponsors';

export default function Home(): JSX.Element {
  return (
    <Layout description="A powerful animation library that makes it easy to create smooth animations and interactions that run in the UI thread.">
      <div className={styles.landingContainer}>
        <HomepageStartScreen />
        <ReanimatedFeatures />
        <ReanimatedSponsors />
      </div>
    </Layout>
  );
}
