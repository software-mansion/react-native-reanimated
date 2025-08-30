import HomepageAboutSection from '@site/src/components/HomepageAboutSection';
import HomepageAchievementsSection from '@site/src/components/HomepageAchievementsSection';
import HomepageMainSection from '@site/src/components/HomepageMainSection';
import HomepageTryOutSection from '@site/src/components/HomepageTryOutSection';
import HomepageUseCasesSection from '@site/src/components/HomepageUseCasesSection';
import Layout from '@theme/Layout';
import Background from '@site/static/img/background.svg';

import HomepageFooter from '../components/HomepageFooter';
import styles from './styles.module.css';

export default function Homepage() {
  return (
    <div className={styles.layoutWrapper}>
      <Layout
        className={styles.layout}
        title="React Native Worklets: Multithreading engine for your apps and libraries"
        description="Run concurrent processes to boost your app’s performance. Used by Reanimated, Gesture Handler, Skia and more.">
        <Background className={styles.background} />
        <div className={styles.content}>
          <HomepageMainSection />
          <HomepageAboutSection />
          <HomepageAchievementsSection />
          <HomepageUseCasesSection />
          <HomepageTryOutSection />
          <div className={styles.divider} />
          <HomepageFooter />
        </div>
      </Layout>
    </div>
  );
}
