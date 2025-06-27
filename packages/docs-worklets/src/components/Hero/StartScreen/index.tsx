import React from 'react';
import styles from './styles.module.css';
import SelectedLabel from '@site/src/components/Hero/SelectedLabel';
import HomepageButton from '@site/src/components/HomepageButton';
import Horse from '@site/src/components/Hero/Horse';
import { useAnnouncementBar } from '@docusaurus/theme-common/internal';
import Clouds from '@site/src/components/Hero/Clouds';
import Stars from '@site/src/components/Hero/Stars';
import Sun from '@site/src/components/Hero/Sun';
import Swirl from '@site/src/components/Hero/Swirl';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const LandingBackground = ({ isAnnouncementBarActive = false }) => {
  return (
    <div
      className={styles.heroBackground}
      data-announcemnt-bar={isAnnouncementBarActive}>
      <Clouds />
      <Stars />

      {
        /* Swirl uses viewport behind the hood to calculate appropriate width.
         * Thus, access to the viewport is required to render the Swirl component.
         */
        ExecutionEnvironment.canUseViewport && (
          <>
            <Sun />
            <Swirl />
          </>
        )
      }
    </div>
  );
};

const StartScreen = () => {
  const { isActive } = useAnnouncementBar();
  return (
    <>
      <LandingBackground />
      <section className={styles.hero} data-announcement-bar={isActive}>
        <div className={styles.foregroundLabel}>
          <div className={styles.heading}>
            <div className={styles.upperHeading}>
              <h1 className={styles.headingLabel}>
                <span className={styles.rnLabel}>React Native</span>
                <SelectedLabel isInteractive={true}>Worklets</SelectedLabel>
              </h1>
              <h2 className={styles.subheadingLabel}>
                Placeholder for description
              </h2>
            </div>
            <div className={styles.lowerHeading}>
              <Horse />
              <div className={styles.buttonContainer}>
                <HomepageButton
                  href="/react-native-worklets/docs"
                  title="Get started"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default StartScreen;
