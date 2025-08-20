import BoltIcon from '@site/static/img/bolt-icon.svg';
import ImageIcon from '@site/static/img/image-icon.svg';
import PerformanceIcon from '@site/static/img/performance-icon.svg';
import SettingsIcon from '@site/static/img/settings-icon.svg';
import SoundWaveIcon from '@site/static/img/sound-wave-icon.svg';
import TaskCheckIcon from '@site/static/img/task-check-icon.svg';

import HomepageButton, { ButtonStyling } from '../HomepageButton';
import AchievementSection from './AchievementSection';
import styles from './styles.module.css';

const achievements = [
  {
    title: 'Speed up your mobile app',
    description:
      'Perform multiple background tasks at the same time and improve the everyday experience of your app’s users.',
    svg: <PerformanceIcon />,
  },
  {
    title: 'Make animations smooth',
    description:
      'Introduce rich animations to make the app prettier and more intuitive, and display it all with 60 or even 120 frames per second.',
    svg: <BoltIcon />,
  },
  {
    title: 'Enhance graphic rendering',
    description:
      'Start rendering more and better graphics – including 3D objects – thanks to enlarging your calculation possibilities.',
    svg: <ImageIcon />,
  },
  {
    title: 'Improve audio processing',
    description:
      'Separate the threads responsible for audio processing to get better audio output and to get it faster.',
    svg: <SoundWaveIcon />,
  },
  {
    title: 'Automate repetitive tasks',
    description:
      'With more threads available, start writing useful automations that will trigger without slowing the whole app down.',
    svg: <TaskCheckIcon />,
  },
  {
    title: 'Create advanced solutions',
    description:
      'Build upon React Native Worklets and create your own libraries that will help React Native developers around the globe.',
    svg: <SettingsIcon />,
  },
];

export default function HomepageAchievementsSection(): JSX.Element {
  return (
    <div className={styles.achievementsSection}>
      <div className={styles.header}>
        <h2>What can you achieve with Worklets?</h2>
        <div className={styles.description}>
          React Native Worklets provide you with numerous functionalities. We’ve
          listed some of the use cases below, but it all really comes down to
          your imagination.
        </div>
      </div>
      <div className={styles.achievementsList}>
        {achievements.map((achievement) => (
          <AchievementSection
            key={achievement.title}
            title={achievement.title}
            description={achievement.description}
            svg={achievement.svg}
          />
        ))}
      </div>
      <div className={styles.footer}>
        <div className={styles.footerTitle}>
          Read more about React Native Worklets
        </div>
        <HomepageButton
          title="See blog post"
          href="/react-native-worklets/docs/"
          backgroundStyling={ButtonStyling.TO_BLUE}
        />
      </div>
    </div>
  );
}
