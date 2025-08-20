import HomepageAboutSection from '@site/src/components/HomepageAboutSection';
import HomepageAchievementsSection from '@site/src/components/HomepageAchievementsSection';
import HomepageMainSection from '@site/src/components/HomepageMainSection';
import HomepageUseCasesSection from '@site/src/components/HomepageUseCasesSection';
import Layout from '@theme/Layout';

import styles from './styles.module.css';

export default function Homepage() {
  return (
    <Layout>
      <div className={styles.content}>
        <HomepageMainSection />
        <HomepageAboutSection />
        <HomepageAchievementsSection />
        <HomepageUseCasesSection />
      </div>
    </Layout>
  );
}
