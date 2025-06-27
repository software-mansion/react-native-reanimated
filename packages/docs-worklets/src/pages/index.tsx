import React from 'react';
import Layout from '@theme/Layout';

import styles from './index.module.css';
import HomepageStartScreen from '@site/src/components/Hero/StartScreen';
import ReanimatedFeatures from '@site/src/components/ReanimatedFeatures';
import Animations from '@site/src/components/Animations';
import Testimonials from '@site/src/components/Testimonials';
import FooterBackground from '@site/src/components/FooterBackground';
import Sponsors from '@site/src/components/Sponsors';
import { HireUsSection } from '@swmansion/t-rex-ui';

export default function Home(): JSX.Element {
  return (
    <Layout description="A powerful animation library that makes it easy to create smooth animations and interactions that run in the UI thread.">
      <div className={styles.landingContainer}>
        <HomepageStartScreen />
        <ReanimatedFeatures />
        <Animations />
        <Testimonials />
        <Sponsors />
        <div className={styles.hireUsContainer}>
          <HireUsSection
            href={
              'https://swmansion.com/contact/projects?utm_source=reanimated&utm_medium=docs'
            }
          />
        </div>
      </div>
      <FooterBackground />
    </Layout>
  );
}
